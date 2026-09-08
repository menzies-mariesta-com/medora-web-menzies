#!/usr/bin/env node
/**
 * One-shot migration: DaisyUi (d-*) → Menzies Design Wash (unprefixed).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const daisyDir = path.join(root, 'src/lib/component/daisyui');
const washDir = path.join(root, 'src/lib/component/wash');

/** Longest-first Daisy component roots. */
const DAISY_ROOTS = [
	'radial-progress',
	'hover-gallery',
	'breadcrumbs',
	'chat-bubble',
	'file-input',
	'form-control',
	'fieldset',
	'pagination',
	'countdown',
	'indicator',
	'dropdown',
	'textarea',
	'checkbox',
	'mockup',
	'loading',
	'carousel',
	'progress',
	'skeleton',
	'collapse',
	'tooltip',
	'navbar',
	'drawer',
	'avatar',
	'badge',
	'alert',
	'toast',
	'table',
	'stats',
	'stat',
	'stack',
	'status',
	'swap',
	'select',
	'radio',
	'range',
	'menu',
	'modal',
	'mask',
	'list',
	'link',
	'label',
	'kbd',
	'join',
	'input',
	'hero',
	'footer',
	'filter',
	'divider',
	'diff',
	'dock',
	'chat',
	'card',
	'btn',
	'tabs',
	'tab',
	'toggle',
	'cally',
	'validator',
	'fab'
].sort((a, b) => b.length - a.length);

const ROOT_ALT = DAISY_ROOTS.map((r) => r.replace(/-/g, '\\-')).join('|');
/** Match btn, btn-primary, modal-box, etc. */
const DAISY_CLASS_RE = new RegExp(`\\bd-(?:${ROOT_ALT})(?![a-z0-9])([a-z0-9/%[\\].:!_-]*)`, 'g');

function walk(dir, out = []) {
	if (!fs.existsSync(dir)) return out;
	for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, ent.name);
		if (ent.isDirectory()) {
			if (ent.name === 'node_modules' || ent.name === '.git') continue;
			walk(p, out);
		} else out.push(p);
	}
	return out;
}

function daisyUiToWashName(name) {
	if (name.startsWith('DaisyUi')) return 'Wash' + name.slice('DaisyUi'.length);
	if (name.startsWith('DaisyUI')) return 'Wash' + name.slice('DaisyUI'.length);
	return name;
}

function gitMv(from, to) {
	fs.mkdirSync(path.dirname(to), { recursive: true });
	try {
		execSync(`git mv "${from}" "${to}"`, { cwd: root, stdio: 'pipe' });
	} catch {
		fs.renameSync(from, to);
	}
}

function stripDaisyPrefixInText(text) {
	let out = text;
	out = out.replaceAll('$lib/component/own/library/menzies/', '$lib/component/own/library/menzies/');
	out = out.replaceAll('/component/wash/', '/component/wash/');
	out = out.replace(/\bDaisyUi([A-Z][A-Za-z0-9]*)\b/g, 'Wash$1');
	out = out.replace(/\bDaisyUI([A-Z][A-Za-z0-9]*)\b/g, 'Wash$1');
	out = out.replace(DAISY_CLASS_RE, (full, rest) => {
		// full is like btn-primary; drop leading "d-"
		return full.slice(2);
	});
	return out;
}

function renameDaisyFiles() {
	if (fs.existsSync(washDir) && !fs.existsSync(daisyDir)) {
		console.log('wash/ already exists; skipping folder rename');
	} else if (fs.existsSync(daisyDir)) {
		gitMv(daisyDir, washDir);
		console.log('Renamed daisyui/ → wash/');
	} else {
		throw new Error('Neither daisyui/ nor wash/ found');
	}

	const files = walk(washDir).filter((f) => /DaisyUi|DaisyUI/.test(path.basename(f)));
	for (const file of files) {
		const next = daisyUiToWashName(path.basename(file));
		if (next === path.basename(file)) continue;
		gitMv(file, path.join(path.dirname(file), next));
		console.log(`  ${path.basename(file)} → ${next}`);
	}
}

function rewriteFileContents() {
	const targets = [
		...walk(path.join(root, 'src')),
		...walk(path.join(root, 'scripts')),
		...walk(path.join(root, 'e2e'))
	].filter((f) => /\.(svelte|ts|js|css|mjs|md)$/.test(f));

	let changed = 0;
	for (const file of targets) {
		const before = fs.readFileSync(file, 'utf8');
		const after = stripDaisyPrefixInText(before);
		if (after !== before) {
			fs.writeFileSync(file, after);
			changed++;
		}
	}
	console.log(`Rewrote content in ${changed} files`);
}

function fixWashButtonRecipe() {
	const btn = path.join(washDir, 'button/WashButton.svelte');
	if (!fs.existsSync(btn)) {
		console.warn('WashButton.svelte missing');
		return;
	}
	let text = fs.readFileSync(btn, 'utf8');
	if (!text.includes("from '@menzies-mariesta-com/menzies-design-wash-ui/core'")) {
		text = text.replace(
			'<script lang="ts">',
			`<script lang="ts">\n\timport { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';`
		);
	}
	text = text.replace(
		/class="btn ripple cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 \{className\}"/,
		'class="{washRecipes.btnRipple} disabled:cursor-not-allowed disabled:opacity-40 {className}"'
	);
	fs.writeFileSync(btn, text);
	console.log('Updated WashButton to use washRecipes.btnRipple');
}

renameDaisyFiles();
rewriteFileContents();
fixWashButtonRecipe();

try {
	const leftover = execSync(
		`rg -n --glob '*.{svelte,ts,css,js,mjs}' 'DaisyUi|\\$lib/component/daisyui|\\bd-(btn|input|modal|table|select|tooltip|navbar|checkbox|join|loading|alert|badge|card|toast|tabs|tab|drawer|dropdown|menu|textarea|toggle|label|link|radio|stats|stat|swap|collapse|skeleton|progress|avatar|fieldset|pagination|fab)\\b' src scripts e2e || true`,
		{ cwd: root, encoding: 'utf8' }
	);
	const lines = leftover.trim().split('\n').filter(Boolean);
	console.log(`Leftover DaisyUi / d-* hits: ${lines.length}`);
	if (lines.length) console.log(lines.slice(0, 50).join('\n'));
} catch (e) {
	console.log(e.message);
}
