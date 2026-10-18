/**
 * Paraglide compile wrapper.
 *
 * Default outputStructure=locale-modules (~one file per locale) keeps dev and
 * Vite stable. Use --message-modules before production builds for better
 * tree-shaking (then run with --clean once when switching structure).
 *
 * Default cleanOutdir=false avoids wiping src/lib/paraglide while Vite dev is
 * running (mass HMR + missing runtime.js SSR errors). Use --clean for a full rebuild.
 */
import { compile } from '@inlang/paraglide-js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const cleanOutdir = process.argv.includes('--clean');
const messageModules = process.argv.includes('--message-modules');

await compile({
	project: resolve(root, 'project.inlang'),
	outdir: resolve(root, 'src/lib/paraglide'),
	cleanOutdir,
	outputStructure: messageModules ? 'message-modules' : 'locale-modules'
});

console.log(
	`Paraglide compile finished (cleanOutdir=${cleanOutdir}, outputStructure=${messageModules ? 'message-modules' : 'locale-modules'}).`
);
