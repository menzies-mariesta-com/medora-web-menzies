/**
 * Regenerate static/medora-bootstrap-wash-theme.css from menzies-design-wash-ui.
 * Run after upgrading @menzies-mariesta-com/menzies-design-wash-ui.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const washCss = path.join(
	root,
	'node_modules/@menzies-mariesta-com/menzies-design-wash-ui/dist/styles.css'
);
const out = path.join(root, 'static/medora-bootstrap-wash-theme.css');

const css = fs.readFileSync(washCss, 'utf8');

function pickVars(body) {
	return body
		.split(';')
		.map((s) => s.trim())
		.filter((s) => {
			if (!s.startsWith('--')) return false;
			const key = s.split(':')[0];
			return (
				key.startsWith('--color-base') ||
				key.startsWith('--color-primary') ||
				key.startsWith('--color-accent') ||
				key === '--pigment-grain' ||
				key === '--paper-fiber' ||
				key === '--brush-grain-opacity' ||
				key === '--grain-blend' ||
				key === '--radius-box' ||
				key === '--size-selector'
			);
		})
		.join('; ');
}

function pickGrainVars(body) {
	return body
		.split(';')
		.map((s) => s.trim())
		.filter((s) => {
			if (!s.startsWith('--')) return false;
			const key = s.split(':')[0];
			return (
				key === '--pigment-grain' ||
				key === '--paper-fiber' ||
				key === '--brush-grain-opacity' ||
				key === '--grain-blend'
			);
		})
		.join('; ');
}

const byName = new Map();
for (const re of [
	/:where\(:root\),\[data-theme=([a-z0-9-]+)\]\{([^}]+)\}/g,
	/\[data-theme=([a-z0-9-]+)\]\)\{([^}]+)\}/g,
	/\[data-theme=([a-z0-9-]+)\]\{([^}]+)\}/g
]) {
	let m;
	while ((m = re.exec(css)) !== null) {
		if (!m[2].includes('--color-primary')) continue;
		const prev = byName.get(m[1]) ?? '';
		const chunk = pickVars(m[2]);
		byName.set(m[1], prev ? `${prev}; ${chunk}` : chunk);
	}
}

for (const re of [
	/\[data-theme=([a-z0-9-]+)\][^{]*\{([^}]*--pigment-grain[^}]*)\}/g
]) {
	let m;
	while ((m = re.exec(css)) !== null) {
		const grain = pickGrainVars(m[2]);
		if (!grain) continue;
		const prev = byName.get(m[1]) ?? '';
		byName.set(
			m[1],
			prev.includes('--pigment-grain')
				? prev
				: prev
					? `${prev}; ${grain}`
					: grain
		);
	}
}

const rules = [...byName.entries()]
	.sort(([a], [b]) => a.localeCompare(b))
	.map(([name, vars]) => `html[data-theme="${name}"]{${vars}}`);

const content = `/* Wash pigment tokens — generated from menzies-design-wash-ui (npm run sync:bootstrap-wash-theme) */\n${rules.join('\n')}\n`;
fs.writeFileSync(out, content);
console.log(`Wrote ${rules.length} themes to ${path.relative(root, out)}`);
