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
				key.startsWith('--color-secondary') ||
				key.startsWith('--color-accent') ||
				key === '--wash-a' ||
				key === '--wash-b' ||
				key === '--wash-c' ||
				key === '--ink-muted' ||
				key === '--ink-border' ||
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
	/\[data-theme=([a-z0-9-]+)\][^{]*\{([^}]*--wash-a[^}]*)\}/g,
	/\[data-theme=([a-z0-9-]+)\][^{]*\{([^}]*--pigment-grain[^}]*)\}/g
]) {
	let m;
	while ((m = re.exec(css)) !== null) {
		const extra = pickVars(m[2]);
		if (!extra) continue;
		const prev = byName.get(m[1]) ?? '';
		byName.set(m[1], prev ? `${prev}; ${extra}` : extra);
	}
}

const rules = [...byName.entries()]
	.sort(([a], [b]) => a.localeCompare(b))
	.map(([name, vars]) => {
		const unique = new Map();
		for (const part of vars.split(';')) {
			const trimmed = part.trim();
			if (!trimmed.startsWith('--')) continue;
			const key = trimmed.split(':')[0].trim();
			unique.set(key, trimmed);
		}
		return `html[data-theme="${name}"]{${[...unique.values()].join('; ')}}`;
	});

const content = `/* Wash pigment tokens — generated from menzies-design-wash-ui (npm run sync:bootstrap-wash-theme) */\n${rules.join('\n')}\n`;
fs.writeFileSync(out, content);
console.log(`Wrote ${rules.length} themes to ${path.relative(root, out)}`);

const washAssets = path.join(
	root,
	'node_modules/@menzies-mariesta-com/menzies-design-wash-ui/dist/assets'
);
const fontOutDir = path.join(root, 'static/fonts/wash');
const fontCssOut = path.join(root, 'static/medora-bootstrap-font.css');

const bootstrapFonts = [
	{ file: 'maple-mono-latin-500-normal.woff2', family: 'Maple Mono', weight: 500 },
	{ file: 'maple-mono-latin-600-normal.woff2', family: 'Maple Mono', weight: 600 },
	{ file: 'maple-mono-latin-700-normal.woff2', family: 'Maple Mono', weight: 700 }
];

fs.mkdirSync(fontOutDir, { recursive: true });
const faceRules = [];
for (const { file, family, weight } of bootstrapFonts) {
	const src = path.join(washAssets, file);
	if (!fs.existsSync(src)) {
		console.warn(`Skip missing font asset: ${file}`);
		continue;
	}
	fs.copyFileSync(src, path.join(fontOutDir, file));
	faceRules.push(
		`@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:block;src:url('/fonts/wash/${file}') format('woff2')}`
	);
}

const fontTokens = `html[data-font='maple-mono'],html[data-font='maple-mono'][data-theme],html[data-font='fraunces'],html[data-font='fraunces'][data-theme]{--font-sans:'Maple Mono',ui-monospace,monospace;--font-mono:'Maple Mono',ui-monospace,monospace}`;

const fontContent = `/* Wash typefaces for bootstrap loader — npm run sync:bootstrap-wash-theme */\n${faceRules.join('\n')}\n${fontTokens}\n`;
fs.writeFileSync(fontCssOut, fontContent);
console.log(`Wrote bootstrap fonts to ${path.relative(root, fontOutDir)}`);
