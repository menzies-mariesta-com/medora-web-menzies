/**
 * Crawl every Medora page after login; assert Wash UI + original full-bleed layout.
 * Usage: node scripts/crawl-medora-pages.mjs
 * Requires: pnpm run dev on :5173, system Chrome (Playwright channel: chrome)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.MEDORA_BASE_URL ?? 'http://localhost:5173';
const hospitalId =
	process.env.MEDORA_HOSPITAL_ID ??
	'01a05ffb-aa1d-738a-9121-4bac865280a9';
const email =
	process.env.MEDORA_TEST_EMAIL ?? 'aungkaungmyat9604@gmail.com';
const password = process.env.MEDORA_TEST_PASSWORD ?? 'Akm@3193';

function listPageUrls() {
	const routesDir = path.join(root, 'src/routes/(private)/medora');
	const publicDir = path.join(root, 'src/routes/(public)');
	const urls = [];

	function walk(dir, prefix) {
		for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
			const p = path.join(dir, ent.name);
			if (ent.isDirectory()) walk(p, prefix);
			else if (ent.name === '+page.svelte') {
				let route = path
					.relative(prefix, path.dirname(p))
					.split(path.sep)
					.join('/');
				route = route.replace(/^\(private\)\/?/, '').replace(/^\(public\)\/?/, '');
				// strip route groups
				route = route
					.split('/')
					.filter((seg) => !(seg.startsWith('(') && seg.endsWith(')')))
					.join('/');
				route = route.replaceAll('[hospital_id]', hospitalId);
				// Skip remaining dynamic detail routes (e.g. [pr_id])
				if (route.includes('[')) continue;
				if (!route.startsWith('/')) route = '/' + route;
				urls.push(base + route.replace(/\/+/g, '/'));
			}
		}
	}

	walk(routesDir, path.join(root, 'src/routes/(private)'));
	walk(path.join(publicDir, 'auth'), path.join(root, 'src/routes/(public)'));
	return [...new Set(urls)].sort();
}

const urls = listPageUrls();
fs.writeFileSync(
	path.join(root, 'docs/.wash-crawl-urls.txt'),
	urls.map((u) => u.replace(base, '')).join('\n') + '\n'
);

const results = [];
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on('pageerror', (e) => {
	page._lastPageError = String(e.message).slice(0, 400);
});

async function login() {
	await page.goto(base + '/auth/login', {
		waitUntil: 'domcontentloaded',
		timeout: 60000
	});
	await page.fill(
		'input[name="email"], input[type="email"]',
		email
	);
	await page.fill(
		'input[name="password"], input[type="password"]',
		password
	);
	await Promise.all([
		page
			.waitForURL(/\/medora\//, { timeout: 60000 })
			.catch(() => {}),
		page.click('button[type="submit"], button:has-text("Login")')
	]);
	await page.waitForTimeout(1000);
}

await login();

// Re-login helper if session drops mid-crawl
async function ensureAuthed(targetUrl) {
	if (page.url().includes('/auth/login')) {
		await login();
		await page.goto(targetUrl, {
			waitUntil: 'domcontentloaded',
			timeout: 30000
		});
	}
}

for (const url of urls) {
	page._lastPageError = null;
	const row = { url: url.replace(base, ''), ok: true, issues: [] };
	try {
		const res = await page.goto(url, {
			waitUntil: 'domcontentloaded',
			timeout: 30000
		});
		await page.waitForTimeout(350);
		await ensureAuthed(url);
		const status = res?.status() ?? 0;
		if (status >= 500) {
			row.ok = false;
			row.issues.push(`HTTP ${status}`);
		}

		const body = await page.evaluate(() => {
			const text = document.body?.innerText?.slice(0, 800) || '';
			const vite = !!document.querySelector('vite-error-overlay');
			const hasDPrefix = !!document.querySelector(
				'[class*="d-btn"], [class*="d-input"], [class*="d-modal"], [class*="d-table"]'
			);
			const washShell = !!document.querySelector('.wash-shell');
			const pageWash = !!document.querySelector('.page-wash');
			const washShellMain = !!document.querySelector('.wash-shell-main');
			const myApp = document.querySelector('.my-app');
			const appHasOpaqueBg =
				!!myApp &&
				/\bbg-base-100\b/.test(myApp.className) &&
				!/\bbg-base-100\//.test(myApp.className);
			const nestedPageWash = !!myApp?.querySelector('.page-wash');
			const appRect = myApp?.getBoundingClientRect();
			const vw = window.innerWidth;
			const fullBleed =
				!myApp ||
				(appRect &&
					appRect.width >= vw * 0.95 &&
					appRect.left <= 8);
			const errorPage =
				/Internal Error|Unexpected Error|Cannot read properties|is not defined/.test(
					text
				) && /error|Error|500/.test(text.slice(0, 200));
			const loginRedirect = location.pathname.includes('/auth/login');
			const scrollW = Math.max(
				document.documentElement.scrollWidth,
				document.body?.scrollWidth ?? 0
			);
			const clientW = document.documentElement.clientWidth;
			const horizontalOverflowPx = scrollW - clientW;
			return {
				text: text.slice(0, 180),
				vite,
				hasDPrefix,
				washShell,
				pageWash,
				washShellMain,
				appHasOpaqueBg,
				nestedPageWash,
				fullBleed,
				appW: appRect ? Math.round(appRect.width) : null,
				vw,
				errorPage,
				loginRedirect,
				horizontalOverflowPx,
				href: location.pathname + location.search
			};
		});

		if (body.vite) {
			row.ok = false;
			row.issues.push('vite-error-overlay');
		}
		if (body.hasDPrefix) {
			row.ok = false;
			row.issues.push('legacy d-* classes in DOM');
		}
		if (body.washShellMain) {
			row.ok = false;
			row.issues.push('nested wash-shell-main (breaks full-bleed)');
		}
		if (!body.washShell) {
			row.ok = false;
			row.issues.push('missing wash-shell');
		}
		if (!body.pageWash) {
			row.ok = false;
			row.issues.push('missing page-wash atmosphere');
		}
		if (body.nestedPageWash) {
			row.ok = false;
			row.issues.push('nested page-wash inside .my-app');
		}
		if (body.appHasOpaqueBg) {
			row.ok = false;
			row.issues.push('.my-app has opaque bg-base-100 (hides page-wash)');
		}
		if (body.errorPage) {
			row.ok = false;
			row.issues.push('error content: ' + body.text.slice(0, 100));
		}
		if (page._lastPageError) {
			row.ok = false;
			row.issues.push('pageerror: ' + page._lastPageError);
		}
		if (
			body.loginRedirect &&
			!url.includes('/auth/') &&
			!url.includes('/signup')
		) {
			row.ok = false;
			row.issues.push('redirected to login');
		}
		// Layout: private app pages with .my-app must stay full-bleed
		if (body.appW != null && !body.fullBleed) {
			row.ok = false;
			row.issues.push(
				`layout not full-bleed (appW=${body.appW}, vw=${body.vw})`
			);
		}
		// Page-level horizontal scroll (ignore 1px subpixel rounding)
		if ((body.horizontalOverflowPx ?? 0) > 1) {
			row.ok = false;
			row.issues.push(
				`horizontal overflow ${body.horizontalOverflowPx}px`
			);
		}

		row.href = body.href;
		row.appW = body.appW;
	} catch (e) {
		row.ok = false;
		row.issues.push('nav: ' + String(e.message).slice(0, 200));
	}
	results.push(row);
	if (!row.ok) console.log('FAIL', row.url, '→', row.issues.join(' | '));
	else process.stdout.write('.');
}

console.log('\n');
const fails = results.filter((r) => !r.ok);
const outPath = path.join(root, 'docs/.wash-crawl-results.json');
fs.writeFileSync(
	outPath,
	JSON.stringify(
		{ total: results.length, failCount: fails.length, fails, results },
		null,
		2
	)
);
console.log(
	`Done: ${results.length} pages, ${fails.length} failures. Results: ${outPath}`
);
await browser.close();
process.exit(fails.length ? 1 : 0);
