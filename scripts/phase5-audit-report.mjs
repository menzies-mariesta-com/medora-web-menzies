#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const ROOT = process.cwd();

function noGuardFiles() {
	return execSync(
		`comm -23 <(rg -l '\\$effect\\(' src --glob '*.svelte' | sort) <(rg -l 'cancelled|AbortController' src --glob '*.svelte' | sort)`,
		{ cwd: ROOT, shell: '/bin/bash', encoding: 'utf8' }
	)
		.trim()
		.split('\n')
		.filter(Boolean);
}

const ASYNC_BODY =
	/\bawait\s|\bfetch\s*\(|void\s+(?!visitId|hospitalId|mounted|query|results|invalidateKey|open\b)([a-zA-Z_$][\w$]*)\s*\(|\.then\s*\(/;

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
		out.push(source.slice(bodyStart, p - 1));
		i = end;
	}
	return out;
}

function hasGuard(body) {
	return /\blet cancelled\b/.test(body) || /\bnew AbortController\b/.test(body);
}

const remaining = noGuardFiles();
const asyncStillUnguarded = [];
for (const f of remaining) {
	const c = fs.readFileSync(f, 'utf8');
	for (const body of findEffects(c)) {
		if (ASYNC_BODY.test(body) && !hasGuard(body)) {
			asyncStillUnguarded.push(f);
			break;
		}
	}
}

const allEffects = execSync(`rg -l '\\$effect\\(' src --glob '*.svelte'`, {
	cwd: ROOT,
	encoding: 'utf8'
})
	.trim()
	.split('\n')
	.filter(Boolean);

const patched = [];
for (const f of allEffects) {
	const c = fs.readFileSync(f, 'utf8');
	if (!/cancelled|AbortController/.test(c)) continue;
	let hasAsyncGuarded = false;
	for (const body of findEffects(c)) {
		if (ASYNC_BODY.test(body) && hasGuard(body)) hasAsyncGuarded = true;
	}
	if (hasAsyncGuarded) patched.push(f);
}

console.log(
	JSON.stringify(
		{
			remainingNoGuardFileCount: remaining.length,
			asyncEffectStillUnguardedCount: [...new Set(asyncStillUnguarded)]
				.length,
			patchedAsyncEffectFileCount: patched.length,
			patchedFiles: patched.sort(),
			asyncStillUnguarded: [...new Set(asyncStillUnguarded)].sort()
		},
		null,
		2
	)
);