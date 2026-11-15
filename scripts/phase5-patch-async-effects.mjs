#!/usr/bin/env node
/**
 * Phase 5: add cancelled + AbortController to async $effect blocks (per-block).
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

function listTargetFiles() {
	return execSync(
		`comm -23 <(rg -l '\\$effect\\(' src --glob '*.svelte' | sort) <(rg -l 'cancelled|AbortController' src --glob '*.svelte' | sort)`,
		{ cwd: ROOT, shell: '/bin/bash', encoding: 'utf8' }
	)
		.trim()
		.split('\n')
		.filter(Boolean);
}

const ASYNC_BODY =
	/\bawait\s|\bfetch\s*\(|void\s+(?!visitId|hospitalId|mounted|selected|currentPage|invalidateKey|query|results|selected|open\b)([a-zA-Z_$][\w$]*)\s*\(|\.then\s*\(/;

function findEffects(source) {
	const out = [];
	let i = 0;
	while (i < source.length) {
		const idx = source.indexOf('$effect(() => {', i);
		if (idx === -1) break;
		const bodyStart = idx + '$effect(() => {'.length;
		let p = bodyStart;
		let depth = 1;
		while (p < source.length && depth > 0) {
			if (source[p] === '{') depth++;
			else if (source[p] === '}') depth--;
			p++;
		}
		let end = p;
		while (end < source.length && /[\s\n]/.test(source[end])) end++;
		if (source.slice(end, end + 2) === ');') end += 2;
		const body = source.slice(bodyStart, p - 1);
		out.push({ idx, end, body });
		i = end;
	}
	return out;
}

function hasGuard(body) {
	return /\blet cancelled\b/.test(body) || /\bnew AbortController\b/.test(body);
}

function patchThenEffect(body) {
	if (!/\.then\s*\(/.test(body) || hasGuard(body)) return null;
	const lines = body.split('\n');
	const tab = lines[0]?.match(/^(\t*)/)?.[1] ?? '\t';
	const patched =
		body.trimEnd() +
		`\n${tab}\tlet cancelled = false;\n${tab}\treturn () => {\n${tab}\t\tcancelled = true;\n${tab}\t};`;
	// wrap .then callbacks
	return patched.replace(
		/\.then\(\(([^)]*)\)\s*=>\s*\{([^}]+)\}\)/,
		(m, arg, inner) =>
			`.then((${arg}) => { if (cancelled) return; ${inner.trim()} })`
	).replace(
		/\.then\(\(([^)]*)\)\s*=>\s*([^{;][^;]*);/,
		(m, arg, expr) =>
			`.then((${arg}) => { if (cancelled) return; ${expr.trim()}; })`
	);
}

function patchLoadEffect(body) {
	if (hasGuard(body)) return null;
	if (!ASYNC_BODY.test(body)) return null;
	if (/\.then\s*\(/.test(body) && !/void\s+load/.test(body)) {
		return patchThenEffect(body);
	}

	const tab = body.match(/\n(\t+)/)?.[1] ?? '\t';
	let newBody = body;

	// void loadFn(...);
	newBody = newBody.replace(
		/\bvoid\s+([a-zA-Z_$][\w$]*)\(([^)]*)\)\s*;/g,
		(match, fn, args) => {
			if (/^(visitId|hospitalId|mounted|query|results|invalidateKey)$/.test(fn))
				return match;
			const trimmed = args.trim();
			const opts =
				'{ signal: ac.signal, isCancelled: () => cancelled }';
			if (trimmed === '') return `void ${fn}(${opts});`;
			return `void ${fn}(${trimmed}, ${opts});`;
		}
	);

	// bare loadData();
	newBody = newBody.replace(
		/(?<!\w)(loadData|loadRows|loadList|loadSummary|fetchRows|fetchVisit|refreshAllForVisit)\(\)\s*;/g,
		'void $1({ signal: ac.signal, isCancelled: () => cancelled });'
	);

	if (newBody === body && /\.then\s*\(/.test(body)) {
		return patchThenEffect(body);
	}
	if (newBody === body) return null;

	const guard = `${tab}\tlet cancelled = false;\n${tab}\tconst ac = new AbortController();`;
	const cleanup = `${tab}\treturn () => {\n${tab}\t\tcancelled = true;\n${tab}\t\tac.abort();\n${tab}\t};`;

	// Insert guard before first void load/fetch line
	const lines = newBody.split('\n');
	let insertAt = lines.findIndex((l) =>
		/void\s+\w+\(\{ signal/.test(l) ||
		/void (load|fetch|refresh)/.test(l)
	);
	if (insertAt < 0) insertAt = lines.length - 1;
	lines.splice(insertAt, 0, ...guard.split('\n'));
	newBody = lines.join('\n').trimEnd() + '\n' + cleanup;
	return newBody;
}

function patchLoader(source, fnName) {
	const re = new RegExp(
		`async function ${fnName}\\(([^)]*)\\)`,
		'g'
	);
	if (!re.test(source)) return source;
	source = source.replace(
		new RegExp(`async function ${fnName}\\(([^)]*)\\)`, 'm'),
		(m, params) => {
			if (params.includes('isCancelled') || params.includes('opts')) return m;
			const p = params.trim();
			if (p === '') {
				return `async function ${fnName}(opts?: {
		signal?: AbortSignal;
		isCancelled?: () => boolean;
	})`;
			}
			return `async function ${fnName}(${p}, opts?: {
		signal?: AbortSignal;
		isCancelled?: () => boolean;
	})`;
		}
	);

	const fnRe = new RegExp(
		`async function ${fnName}\\([\\s\\S]*?(?=\\n\\tasync function |\\n\\tfunction |\\n\\tconst \\w+ = async|\\n\\t\\$effect)`,
		'm'
	);
	const fnMatch = fnRe.exec(source);
	if (!fnMatch) return source;
	let fnBlock = fnMatch[0];
	if (fnBlock.includes('opts?.isCancelled')) return source;

	fnBlock = fnBlock.replace(
		/await fetch\(\s*(`[^`]+`|'[^']+'|"[^"]+"|\$\{[^}]+\}[^,)]*)\s*\)/g,
		(m, url) => `await fetch(${url}, { signal: opts?.signal })`
	);
	fnBlock = fnBlock.replace(
		/await fetch\(\s*([^,]+),\s*\{([^}]*)\}\s*\)/g,
		(m, url, optsInner) => {
			if (optsInner.includes('signal:')) return m;
			const inner = optsInner.trim();
			if (inner === '') return `await fetch(${url}, { signal: opts?.signal })`;
			return `await fetch(${url}, { ${inner}, signal: opts?.signal })`;
		}
	);

	if (!fnBlock.includes('AbortError')) {
		fnBlock = fnBlock.replace(
			/(catch\s*\(\s*(\w+)\s*\)\s*\{)/,
			`$1\n\t\t\tif ($2 instanceof DOMException && $2.name === 'AbortError') return;\n\t\t\tif (opts?.isCancelled?.()) return;`
		);
	}
	fnBlock = fnBlock.replace(
		/(\}\s*finally\s*\{[^\}]*?)(\b(isLoading|loading|isBusy)\s*=\s*false)/,
		(m, fin, assign) =>
			fin.includes('isCancelled')
				? m
				: `${fin}if (!opts?.isCancelled?.()) ${assign}`
	);

	return source.slice(0, fnMatch.index) + fnBlock + source.slice(fnMatch.index + fnMatch[0].length);
}

function processFile(rel) {
	const abs = path.join(ROOT, rel);
	let source = fs.readFileSync(abs, 'utf8');
	const effects = findEffects(source);
	const loaderNames = new Set();
	let changed = false;

	for (let e = effects.length - 1; e >= 0; e--) {
		const eff = effects[e];
		const patched = patchLoadEffect(eff.body);
		if (!patched) continue;
		const newFull = `$effect(() => {${patched}\n\t});`;
		source = source.slice(0, eff.idx) + newFull + source.slice(eff.end);
		changed = true;
		for (const m of patched.matchAll(/void\s+([a-zA-Z_$][\w$]*)\(/g)) {
			const n = m[1];
			if (!['visitId', 'hospitalId'].includes(n)) loaderNames.add(n);
		}
	}

	if (!changed) return null;
	for (const n of loaderNames) {
		source = patchLoader(source, n);
	}
	fs.writeFileSync(abs, source);
	return { rel, loaders: [...loaderNames] };
}

const files = listTargetFiles();
const patched = [];
for (const f of files) {
	try {
		const r = processFile(f);
		if (r) patched.push(r);
	} catch (err) {
		console.error('FAIL', f, err.message);
	}
}
console.log('patched', patched.length);
for (const p of patched) console.log(p.rel, p.loaders.join(','));