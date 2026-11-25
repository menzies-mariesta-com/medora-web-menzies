/**
 * Enforces safe Svelte 5 snippet rendering:
 * - No {@render foo?.()}
 * - {@render children()} must be preceded by {#if children} / {:else if children} within a few lines
 * - Optional Snippet props (foo?: Snippet) must use {#if foo} before {@render foo()}
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir, out) {
	for (const ent of readdirSync(dir, { withFileTypes: true })) {
		if (ent.name === 'node_modules' || ent.name === '.git') continue;
		const p = join(dir, ent.name);
		if (ent.isDirectory()) walk(p, out);
		else if (p.endsWith('.svelte')) out.push(p);
	}
}

const OPTIONAL_SNIPPET_PROP = /\b(\w+)\?\s*:\s*Snippet\b/g;

function optionalSnippetProps(script) {
	const names = new Set();
	let m;
	while ((m = OPTIONAL_SNIPPET_PROP.exec(script)) !== null) {
		names.add(m[1]);
	}
	return names;
}

function hasGuard(lines, index, name) {
	for (let j = index - 1; j >= 0 && j >= index - 6; j--) {
		const t = lines[j].trim();
		if (
			t === `{#if ${name}}` ||
			t === `{:else if ${name}}` ||
			t.startsWith(`{#if ${name} `) ||
			t.startsWith(`{:else if ${name} `)
		) {
			return true;
		}
		// Stop at another block boundary at same or lower depth
		if (t.startsWith('{#') && !t.includes(name)) {
			if (t === '{#if children}' && name !== 'children') break;
		}
	}
	return false;
}

const violations = [];
const files = [];
walk('src', files);

for (const file of files) {
	const text = readFileSync(file, 'utf8');
	const scriptMatch = text.match(/<script[^>]*>([\s\S]*?)<\/script>/);
	const optionalProps = scriptMatch
		? optionalSnippetProps(scriptMatch[1])
		: new Set();

	const lines = text.split('\n');

	// JS comment syntax above the first <script> is markup, so Svelte renders it as text.
	const firstScript = text.search(/<script[\s>]/);
	const head = firstScript === -1 ? text : text.slice(0, firstScript);
	head.split('\n').forEach((headLine, index) => {
		if (/^\s*(\/\*|\*|\/\/)/.test(headLine)) {
			violations.push(
				`${file}:${index + 1}: a comment above <script> renders as page text; move it inside the script block`
			);
		}
	});

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		if (/\{@render\s+[^}]+\?\./.test(line)) {
			violations.push(
				`${file}:${i + 1}: use {#if snippet}{@render snippet()}{/if}, not optional chaining on @render`
			);
		}

		const childRender = line.match(/\{@render\s+children\s*\(\s*\)\s*\}/);
		if (childRender && !hasGuard(lines, i, 'children')) {
			violations.push(
				`${file}:${i + 1}: wrap {@render children()} in {#if children} … {/if}`
			);
		}

		for (const name of optionalProps) {
			if (name === 'children') continue;
			const re = new RegExp(
				`\\{@render\\s+${name}\\s*\\(\\s*\\)\\s*\\}`
			);
			if (re.test(line) && !hasGuard(lines, i, name)) {
				violations.push(
					`${file}:${i + 1}: optional Snippet prop "${name}" needs {#if ${name}} before @render`
				);
			}
		}
	}
}

if (violations.length) {
	console.error('Snippet render check failed:\n');
	for (const v of violations) console.error(`  ${v}`);
	process.exit(1);
}

console.log(`check:snippet-render ok (${files.length} .svelte files)`);
