/**
 * Enforces Menzies Design Wash UI usage:
 * - Reuse `$lib/component/wash` (Wash*) adapters that mirror Design components
 * - No `$lib/component/daisyui` / DaisyUi* / d-* prefixed classes
 * - No Medora* UI clone path (`own/library/menzies`)
 * - No daisyUI Tailwind plugin / package dependency
 * - Wash styles.css imported before app layout.css
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DAISY_IMPORT = /\$lib\/component\/daisyui\b/;
const MENZIES_CLONE = /\$lib\/component\/own\/library\/menzies\b/;
const DAISY_UI_NAME = /\bDaisyUi[A-Z]\w*\b/;
const DAISY_PREFIXED_CLASS =
	/\bd-(?:btn|input|select|modal|table|tooltip|navbar|dropdown|menu|drawer|card|checkbox|toggle|textarea|toast|alert|badge|tabs|tab|join|loading|label|link|radio|range|stats|stat|swap|collapse|skeleton|progress|avatar|breadcrumbs|fieldset|pagination|file-input|indicator|kbd|divider|dock|fab|footer|hero|mask|list|filter|stack|status|diff|countdown|mockup|carousel|chat|radial-progress|cally|validator|form-control)(?![a-z0-9])/;

function walk(dir, out) {
	for (const name of readdirSync(dir, { withFileTypes: true })) {
		if (name.name === 'node_modules' || name.name === '.git') continue;
		const p = join(dir, name.name);
		if (name.isDirectory()) walk(p, out);
		else out.push(p);
	}
}

const violations = [];
const files = [];
walk('src', files);

if (!existsSync(join('src', 'lib', 'component', 'wash'))) {
	violations.push(
		'src/lib/component/wash/: missing — app must reuse Wash* components from Menzies Design'
	);
}

for (const f of files) {
	if (!/\.(svelte|ts|js|css)$/.test(f)) continue;
	if (f.includes(`${join('src', 'lib', 'server')}`)) continue;
	let text;
	try {
		text = readFileSync(f, 'utf8');
	} catch {
		continue;
	}
	const hits = [];
	if (DAISY_IMPORT.test(text)) hits.push('daisyui import path');
	if (MENZIES_CLONE.test(text)) hits.push('own/library/menzies clone path');
	if (DAISY_UI_NAME.test(text)) hits.push('DaisyUi* name');
	if (DAISY_PREFIXED_CLASS.test(text)) hits.push('d-* Daisy class');
	if (hits.length) violations.push(`${f}: ${hits.join(', ')}`);
}

const layoutPath = join('src', 'routes', '+layout.svelte');
try {
	const layout = readFileSync(layoutPath, 'utf8');
	const washIdx = layout.indexOf('menzies-design-wash-ui/styles.css');
	const appCssIdx = layout.indexOf('./layout.css');
	if (washIdx === -1 || appCssIdx === -1) {
		violations.push(`${layoutPath}: missing Wash styles.css and/or ./layout.css import`);
	} else if (washIdx > appCssIdx) {
		violations.push(
			`${layoutPath}: import Wash styles.css BEFORE ./layout.css (Tailwind responsive variants must win)`
		);
	}
	if (!/\$lib\/component\/wash\//.test(layout)) {
		violations.push(
			`${layoutPath}: root layout should import Wash* from $lib/component/wash`
		);
	}
} catch {
	violations.push(`${layoutPath}: could not read for CSS import-order check`);
}

const layoutCssPath = join('src', 'routes', 'layout.css');
try {
	const layoutCss = readFileSync(layoutCssPath, 'utf8');
	if (/@plugin\s+['"]daisyui['"]/.test(layoutCss)) {
		violations.push(
			`${layoutCssPath}: remove @plugin 'daisyui' — use Wash styles.css only`
		);
	}
} catch {
	violations.push(`${layoutCssPath}: could not read for daisyUI plugin check`);
}

const WASH_MODAL_IMPORT = /\$lib\/component\/wash\/modal\b/;
const MODAL_OPEN_CLASS = /\bmodal-open\b/;

for (const f of files) {
	if (!/\.(svelte|ts|js)$/.test(f)) continue;
	if (f.includes(`${join('src', 'lib', 'server')}`)) continue;
	let text;
	try {
		text = readFileSync(f, 'utf8');
	} catch {
		continue;
	}
	if (WASH_MODAL_IMPORT.test(text)) {
		violations.push(
			`${f}: WashModal removed — use $lib/component/wash/dialog/WashDialog`
		);
	}
	if (
		MODAL_OPEN_CLASS.test(text) &&
		!f.includes(`${join('src', 'lib', 'component', 'wash', 'dialog')}`)
	) {
		violations.push(
			`${f}: raw modal-open overlay — use WashDialog (Menzies Design Dialog)`
		);
	}
}

try {
	const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
	const allDeps = {
		...(pkg.dependencies || {}),
		...(pkg.devDependencies || {})
	};
	if (allDeps.daisyui) {
		violations.push(
			`package.json: remove daisyui dependency (Wash styles.css is standalone)`
		);
	}
} catch {
	violations.push('package.json: could not read for daisyui dependency check');
}

if (violations.length) {
	console.error(
		'Wash UI boundary: reuse $lib/component/wash (Menzies Design) — no daisyUI plugin / menzies clone path.\n'
	);
	for (const v of violations) console.error(`  ${v}`);
	process.exit(1);
}

console.log(
	'Wash UI boundary OK ($lib/component/wash + Wash styles.css; no daisyui plugin/dep).'
);
