#!/usr/bin/env node
/**
 * Translate non-en messages/<locale>.json from messages/en.json via the free
 * Google Translate web endpoint (client=gtx). No LLM API keys.
 *
 * Loomline (`../loomline-web-menzies`) only had agent-authored ja + my (no MT
 * script). This scales the same outcome (literal values in messages/*.json)
 * across Medora's worldwide locales.
 *
 * Optimizations:
 * - Deduplicate by English string
 * - Translate each Google `tl` once; copy to regional variants (ar-eg → ar)
 * - Disk cache under `.cache/translate-gtx/<tl>.json` (resumable)
 * - Seed matching keys from Loomline ja/my when English sources match
 *
 * Usage:
 *   node scripts/translate-messages.mjs
 *   node scripts/translate-messages.mjs --locales fr,de,ja
 *   node scripts/translate-messages.mjs --force
 *   node scripts/translate-messages.mjs --batch-size 25 --delay-ms 400
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MESSAGES_DIR = path.join(ROOT, 'messages');
const EN_PATH = path.join(MESSAGES_DIR, 'en.json');
const CACHE_DIR = path.join(ROOT, '.cache', 'translate-gtx');
const LOOMLINE_MESSAGES = path.join(
	ROOT,
	'..',
	'loomline-web-menzies',
	'messages'
);

/** Delimiter that survives clients5 Google Translate (avoid `<` HTML escape). */
const SEP = '\n@@@\n';
const SKIP_LOCALES = new Set(['en', 'en-us', 'en-au', 'en-ca']);

/** Prefer high-traffic app locales first (Loomline-style ja/my near top). */
const TL_PRIORITY = [
	'ja',
	'my',
	'ko',
	'hi',
	'zh-CN',
	'zh-TW',
	'es',
	'fr',
	'de',
	'pt',
	'ar',
	'ru',
	'it',
	'id',
	'th',
	'vi',
	'tr',
	'nl',
	'pl',
	'uk',
	'sv',
	'ro',
	'cs',
	'hu',
	'el',
	'he',
	'iw',
	'bn',
	'ta',
	'te',
	'mr',
	'gu',
	'kn',
	'ml',
	'pa',
	'ur',
	'fa',
	'ms',
	'tl',
	'sw'
];

/** Map Medora locale codes → Google Translate `tl` (or `en` = leave English). */
const GOOGLE_TL = {
	af: 'af',
	ak: 'ak',
	am: 'am',
	ar: 'ar',
	'ar-eg': 'ar',
	'ar-ma': 'ar',
	as: 'as',
	awa: 'hi',
	'awa-in': 'hi',
	ay: 'ay',
	az: 'az',
	ba: 'ba',
	be: 'be',
	bg: 'bg',
	bh: 'bho',
	bho: 'bho',
	bi: 'en',
	bm: 'bm',
	bn: 'bn',
	bo: 'bo',
	br: 'br',
	brx: 'en',
	bs: 'bs',
	ca: 'ca',
	ceb: 'ceb',
	ch: 'en',
	ckb: 'ckb',
	co: 'co',
	cr: 'en',
	cs: 'cs',
	cv: 'cv',
	cy: 'cy',
	da: 'da',
	de: 'de',
	doi: 'doi',
	dv: 'dv',
	dz: 'dz',
	ee: 'ee',
	el: 'el',
	eo: 'eo',
	es: 'es',
	'es-ar': 'es',
	'es-mx': 'es',
	et: 'et',
	eu: 'eu',
	fa: 'fa',
	ff: 'ff',
	fi: 'fi',
	fil: 'fil',
	fj: 'fj',
	fo: 'fo',
	fr: 'fr',
	'fr-ca': 'fr',
	fy: 'fy',
	ga: 'ga',
	gd: 'gd',
	gl: 'gl',
	gn: 'gn',
	'gn-py': 'gn',
	gom: 'gom',
	gu: 'gu',
	ha: 'ha',
	hak: 'zh-TW',
	haw: 'haw',
	he: 'iw',
	hi: 'hi',
	hmn: 'hmn',
	hne: 'hi',
	hr: 'hr',
	ht: 'ht',
	hu: 'hu',
	hy: 'hy',
	ia: 'en', // Interlingua: Google MT unsupported
	id: 'id',
	ig: 'ig',
	ilo: 'ilo',
	io: 'eo',
	is: 'is',
	it: 'it',
	iu: 'iu',
	ja: 'ja',
	jv: 'jw',
	'jv-id': 'jw',
	ka: 'ka',
	kg: 'kg',
	kha: 'en',
	kk: 'kk',
	kl: 'kl',
	km: 'km',
	kn: 'kn',
	ko: 'ko',
	kok: 'kok',
	ks: 'ur', // Kashmiri unsupported → Urdu
	ku: 'ku',
	ky: 'ky',
	la: 'la',
	lb: 'lb',
	lg: 'lg',
	ln: 'ln',
	lo: 'lo',
	lt: 'lt',
	lus: 'en',
	lv: 'lv',
	mag: 'hi',
	mai: 'mai',
	mg: 'mg',
	mh: 'en',
	mi: 'mi',
	mk: 'mk',
	ml: 'ml',
	mn: 'mn',
	mni: 'bn', // Manipuri unsupported → Bengali
	mr: 'mr',
	ms: 'ms',
	'ms-bn': 'ms',
	'ms-sg': 'ms',
	mt: 'mt',
	my: 'my',
	na: 'en',
	nan: 'zh-TW',
	nb: 'no',
	nd: 'zu', // Northern Ndebele unsupported → Zulu
	ne: 'ne',
	new: 'ne',
	nl: 'nl',
	nn: 'no',
	nr: 'nr',
	nso: 'nso',
	ny: 'ny',
	oc: 'oc',
	oj: 'en',
	om: 'om',
	or: 'or',
	pa: 'pa',
	pl: 'pl',
	ps: 'ps',
	pt: 'pt',
	'pt-br': 'pt',
	'pt-pt': 'pt',
	qu: 'qu',
	raj: 'hi',
	rm: 'de', // Romansh unsupported → German
	rn: 'rn',
	ro: 'ro',
	ru: 'ru',
	rw: 'rw',
	sa: 'sa',
	sat: 'sat',
	sc: 'it', // Sardinian unsupported → Italian
	sd: 'sd',
	sg: 'sg',
	si: 'si',
	sk: 'sk',
	sl: 'sl',
	sm: 'sm',
	sn: 'sn',
	so: 'so',
	sq: 'sq',
	sr: 'sr',
	ss: 'ss',
	st: 'st',
	su: 'su',
	sv: 'sv',
	sw: 'sw',
	'sw-ke': 'sw',
	'sw-tz': 'sw',
	syr: 'en',
	ta: 'ta',
	'ta-lk': 'ta',
	'ta-sg': 'ta',
	tcy: 'kn',
	te: 'te',
	tg: 'tg',
	th: 'th',
	ti: 'ti',
	tk: 'tk',
	tl: 'tl',
	tn: 'tn',
	to: 'to',
	tpi: 'en',
	tr: 'tr',
	ts: 'ts',
	tt: 'tt',
	tw: 'ak',
	ty: 'ty',
	ug: 'ug',
	uk: 'uk',
	ur: 'ur',
	uz: 'uz',
	ve: 've',
	vi: 'vi',
	vo: 'en',
	war: 'war',
	wo: 'wo',
	wuu: 'zh-CN',
	xh: 'xh',
	yi: 'yi',
	yo: 'yo',
	yue: 'zh-TW',
	'zh-cn': 'zh-CN',
	'zh-hk': 'zh-TW',
	'zh-sg': 'zh-CN',
	'zh-tw': 'zh-TW',
	zu: 'zu'
};

function parseArgs(argv) {
	const out = {
		locales: /** @type {string[] | null} */ (null),
		batchSize: Number(process.env.TRANSLATE_BATCH_SIZE || 15),
		force: process.env.TRANSLATE_FORCE === '1',
		delayMs: Number(process.env.TRANSLATE_DELAY_MS || 1200),
		tlPauseMs: Number(process.env.TRANSLATE_TL_PAUSE_MS || 8000)
	};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--locales' && argv[i + 1]) {
			out.locales = argv[++i]
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
		} else if (a === '--batch-size' && argv[i + 1]) {
			out.batchSize = Math.max(5, Math.min(40, Number(argv[++i])));
		} else if (a === '--delay-ms' && argv[i + 1]) {
			out.delayMs = Math.max(0, Number(argv[++i]));
		} else if (a === '--tl-pause-ms' && argv[i + 1]) {
			out.tlPauseMs = Math.max(0, Number(argv[++i]));
		} else if (a === '--force') {
			out.force = true;
		} else if (a === '--help' || a === '-h') {
			console.log(`Usage: node scripts/translate-messages.mjs [options]
  --locales fr,de,ja   Only these locales
  --batch-size N       Strings per Google request (default 15)
  --delay-ms N         Pause between requests (default 1200)
  --tl-pause-ms N      Pause between language groups (default 8000)
  --force              Ignore existing translations and cache`);
			process.exit(0);
		}
	}
	return out;
}

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

/** @param {string} s */
function protectPlaceholders(s) {
	/** @type {string[]} */
	const toks = [];
	const protectedText = s.replace(/\{[^}]+\}/g, (m) => {
		const i = toks.length;
		toks.push(m);
		return `XQ${i}ZQ`;
	});
	return { protectedText, toks };
}

/** @param {string} s @param {string[]} toks */
function unprotectPlaceholders(s, toks) {
	let out = s;
	for (let i = 0; i < toks.length; i++) {
		out = out
			.replaceAll(`XQ${i}ZQ`, toks[i])
			.replaceAll(`xq${i}zq`, toks[i])
			.replaceAll(`⟦${i}⟧`, toks[i])
			.replaceAll(`[${i}]`, toks[i]);
	}
	return out;
}

function sanitizeCopy(s) {
	return s
		.replace(/\u2014/g, ': ')
		.replace(/\u2013/g, '-')
		.replace(/\u2212/g, '-')
		.replace(/\s+:\s+/g, ': ')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

function cachePath(tl) {
	return path.join(CACHE_DIR, `${tl.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
}

/** @param {string} tl */
function loadCache(tl) {
	const p = cachePath(tl);
	if (!fs.existsSync(p)) return /** @type {Record<string, string>} */ ({});
	try {
		return JSON.parse(fs.readFileSync(p, 'utf8'));
	} catch {
		return {};
	}
}

/** @param {string} tl @param {Record<string, string>} cache */
function saveCache(tl, cache) {
	fs.mkdirSync(CACHE_DIR, { recursive: true });
	fs.writeFileSync(cachePath(tl), JSON.stringify(cache), 'utf8');
}

/**
 * @param {string} text
 * @param {string} tl
 */
/**
 * Free Google Translate (no API key). Rotates hosts/clients; waits out 429s
 * instead of failing a whole language mid-run.
 * @param {string} text
 * @param {string} tl
 */
async function googleTranslate(text, tl) {
	const endpoints = [
		{
			host: 'https://clients5.google.com/translate_a/single',
			client: 'dict-chrome-ex'
		},
		{
			host: 'https://translate.googleapis.com/translate_a/single',
			client: 'at'
		},
		{
			host: 'https://translate.googleapis.com/translate_a/single',
			client: 'gtx'
		}
	];

	/** @type {Set<string>} */
	const bad400 = new Set();
	let attempt = 0;
	const maxAttempts = 24; // ~8 full rotations; then fail the TL

	while (attempt < maxAttempts) {
		const ep = endpoints[attempt % endpoints.length];
		const epKey = `${ep.client}@${ep.host.includes('clients5') ? 'clients5' : 'googleapis'}`;
		if (bad400.has(epKey) && bad400.size >= endpoints.length) {
			throw new Error(`Unsupported Google tl=${tl} (all endpoints HTTP 400)`);
		}
		if (bad400.has(epKey)) {
			attempt++;
			continue;
		}
		const url =
			ep.host +
			'?' +
			new URLSearchParams({
				client: ep.client,
				sl: 'en',
				tl,
				dt: 't',
				q: text
			}).toString();
		try {
			const res = await fetch(url, {
				headers: {
					'User-Agent':
						'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					Accept: '*/*'
				}
			});
			if (res.status === 400) {
				bad400.add(epKey);
				console.warn(`    HTTP 400 ${epKey} for tl=${tl} (mark unsupported)`);
				attempt++;
				continue;
			}
			if (res.status === 429 || res.status >= 500) {
				const tier = Math.floor(attempt / endpoints.length);
				const wait = Math.min(120_000, 4000 * 2 ** Math.min(5, tier));
				console.warn(
					`    ${res.status} ${epKey} attempt=${attempt}, wait ${Math.round(wait / 1000)}s`
				);
				await sleep(wait);
				attempt++;
				continue;
			}
			if (!res.ok) throw new Error(`HTTP ${res.status} (${ep.client})`);
			const data = await res.json();
			if (!Array.isArray(data) || !Array.isArray(data[0])) {
				throw new Error('Unexpected Google Translate payload');
			}
			return data[0]
				.filter((part) => part && typeof part[0] === 'string')
				.map((part) => part[0])
				.join('');
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (msg.includes('HTTP 400')) {
				bad400.add(epKey);
				attempt++;
				continue;
			}
			const wait = Math.min(
				120_000,
				4000 * 2 ** Math.min(5, Math.floor(attempt / endpoints.length))
			);
			console.warn(`    error ${msg}, wait ${Math.round(wait / 1000)}s`);
			await sleep(wait);
			attempt++;
		}
	}
	throw new Error(`translate failed for tl=${tl} after ${maxAttempts} attempts`);
}

/**
 * @param {string[]} texts
 * @param {string} tl
 * @param {number} delayMs
 */
async function translateBatch(texts, tl, delayMs) {
	const protectedList = texts.map((t) => protectPlaceholders(t));
	const joined = protectedList.map((p) => p.protectedText).join(SEP);
	const translated = await googleTranslate(joined, tl);
	if (delayMs > 0) await sleep(delayMs);
	let parts = translated.split(SEP);
	if (parts.length !== texts.length) {
		const out = [];
		for (let i = 0; i < texts.length; i++) {
			const { protectedText, toks } = protectedList[i];
			let one = await googleTranslate(protectedText, tl);
			if (delayMs > 0) await sleep(delayMs);
			one = sanitizeCopy(unprotectPlaceholders(one, toks));
			out.push(one || texts[i]);
		}
		return out;
	}
	return parts.map((part, i) => {
		const restored = sanitizeCopy(
			unprotectPlaceholders(part, protectedList[i].toks)
		);
		return restored || texts[i];
	});
}

/** @param {string} locale @param {Record<string, string>} en @param {Record<string, string>} target */
function seedFromLoomline(locale, en, target) {
	if (locale !== 'ja' && locale !== 'my') return 0;
	const loomPath = path.join(LOOMLINE_MESSAGES, `${locale}.json`);
	const loomEnPath = path.join(LOOMLINE_MESSAGES, 'en.json');
	if (!fs.existsSync(loomPath) || !fs.existsSync(loomEnPath)) return 0;
	const loom = JSON.parse(fs.readFileSync(loomPath, 'utf8'));
	const loomEn = JSON.parse(fs.readFileSync(loomEnPath, 'utf8'));
	let n = 0;
	for (const [key, enVal] of Object.entries(en)) {
		if (key === '$schema') continue;
		if (typeof loom[key] !== 'string' || typeof loomEn[key] !== 'string')
			continue;
		if (loomEn[key] !== enVal) continue;
		if (loom[key] === loomEn[key]) continue;
		target[key] = sanitizeCopy(loom[key]);
		n++;
	}
	return n;
}

/**
 * Ensure cache has translations for every unique English string needed.
 * @param {string} tl
 * @param {string[]} uniqueTexts
 * @param {{ force: boolean, batchSize: number, delayMs: number }} opts
 */
async function fillCache(tl, uniqueTexts, opts) {
	/** @type {Record<string, string>} */
	let cache = opts.force ? {} : loadCache(tl);
	const missing = uniqueTexts.filter((t) => !cache[t]);
	const coverage = 1 - missing.length / Math.max(1, uniqueTexts.length);
	// Skip tiny gaps (brand names / loanwords often identical) to save quota
	if (missing.length === 0 || (!opts.force && coverage >= 0.96)) {
		console.log(
			`  [tl=${tl}] cache ok (${uniqueTexts.length - missing.length}/${uniqueTexts.length}, coverage=${(coverage * 100).toFixed(1)}%)`
		);
		return cache;
	}
	console.log(
		`  [tl=${tl}] translating ${missing.length}/${uniqueTexts.length} missing`
	);
	for (let i = 0; i < missing.length; i += opts.batchSize) {
		const chunk = missing.slice(i, i + opts.batchSize);
		const translated = await translateBatch(chunk, tl, opts.delayMs);
		for (let j = 0; j < chunk.length; j++) {
			cache[chunk[j]] = translated[j] ?? chunk[j];
		}
		saveCache(tl, cache);
		const done = Math.min(i + chunk.length, missing.length);
		if (done % 60 < opts.batchSize || done === missing.length) {
			console.log(`  [tl=${tl}] ${done}/${missing.length}`);
		}
	}
	return cache;
}

/**
 * @param {string} locale
 * @param {Record<string, string>} en
 * @param {Record<string, string>} cache  English → translated
 * @param {boolean} force
 */
function writeLocale(locale, en, cache, force) {
	const outPath = path.join(MESSAGES_DIR, `${locale}.json`);
	/** @type {Record<string, string>} */
	let existing = {};
	if (fs.existsSync(outPath)) {
		existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
	}
	/** @type {Record<string, string>} */
	const result = { $schema: en.$schema };
	const seeded = seedFromLoomline(locale, en, result);

	for (const [key, enVal] of Object.entries(en)) {
		if (key === '$schema') continue;
		if (typeof enVal !== 'string') {
			result[key] = /** @type {any} */ (enVal);
			continue;
		}
		if (result[key] && result[key] !== enVal) continue;
		const prev = existing[key];
		if (
			!force &&
			typeof prev === 'string' &&
			prev !== enVal &&
			prev.trim() !== ''
		) {
			result[key] = prev;
			continue;
		}
		result[key] = cache[enVal] ?? enVal;
	}

	const ordered = { $schema: en.$schema };
	for (const key of Object.keys(en)) {
		if (key === '$schema') continue;
		ordered[key] = result[key] ?? en[key];
	}
	fs.writeFileSync(
		outPath,
		JSON.stringify(ordered, null, '\t') + '\n',
		'utf8'
	);
	return seeded;
}

function resolveTl(locale) {
	return GOOGLE_TL[locale] ?? locale.split('-')[0];
}

async function main() {
	const opts = parseArgs(process.argv.slice(2));
	const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
	const uniqueEn = [
		...new Set(
			Object.entries(en)
				.filter(([k, v]) => k !== '$schema' && typeof v === 'string')
				.map(([, v]) => /** @type {string} */ (v))
		)
	];

	const allLocales = fs
		.readdirSync(MESSAGES_DIR)
		.filter((f) => f.endsWith('.json'))
		.map((f) => f.replace(/\.json$/, ''))
		.filter((code) => !SKIP_LOCALES.has(code))
		.sort();

	const locales = opts.locales
		? allLocales.filter((c) => opts.locales.includes(c))
		: allLocales;

	/** @type {Map<string, string[]>} */
	const byTl = new Map();
	/** @type {string[]} */
	const identityLocales = [];

	for (const locale of locales) {
		const tl = resolveTl(locale);
		if (tl === 'en') {
			identityLocales.push(locale);
			continue;
		}
		const list = byTl.get(tl) || [];
		list.push(locale);
		byTl.set(tl, list);
	}

	console.log(
		`Unique English strings: ${uniqueEn.length}; locales: ${locales.length}; Google tl groups: ${byTl.size}; identity(en): ${identityLocales.length}`
	);
	console.log(
		`batch=${opts.batchSize} delayMs=${opts.delayMs} tlPauseMs=${opts.tlPauseMs} force=${opts.force}`
	);

	/** @type {string[]} */
	const translatedLocales = [];
	/** @type {{ tl: string, error: string }[]} */
	const failedTls = [];

	const orderedTls = [...byTl.keys()].sort((a, b) => {
		const ia = TL_PRIORITY.indexOf(a);
		const ib = TL_PRIORITY.indexOf(b);
		const pa = ia === -1 ? 999 : ia;
		const pb = ib === -1 ? 999 : ib;
		if (pa !== pb) return pa - pb;
		return a.localeCompare(b);
	});

	for (const tl of orderedTls) {
		const group = byTl.get(tl) || [];
		console.log(`→ tl=${tl} → locales: ${group.join(', ')}`);
		try {
			const cache = await fillCache(tl, uniqueEn, opts);
			for (const locale of group) {
				const seeded = writeLocale(locale, en, cache, opts.force);
				translatedLocales.push(locale);
				console.log(`  wrote ${locale}.json (seeded=${seeded})`);
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			failedTls.push({ tl, error: msg });
			console.error(`  FAILED tl=${tl}: ${msg}`);
			// Flush whatever cache we have so progress is not lost
			const partial = loadCache(tl);
			for (const locale of group) {
				writeLocale(locale, en, partial, false);
				console.log(`  wrote partial ${locale}.json`);
			}
		}
		if (opts.tlPauseMs > 0) await sleep(opts.tlPauseMs);
	}

	// Identity / unsupported: keep English (key-complete)
	for (const locale of identityLocales) {
		writeLocale(locale, en, {}, false);
		console.log(`  identity ${locale}.json (left English; no Google tl)`);
	}

	console.log('\n=== Summary ===');
	console.log(`Locales with Google MT applied: ${translatedLocales.length}`);
	console.log(`Locales left English (unsupported): ${identityLocales.length}`);
	if (identityLocales.length) console.log(`  ${identityLocales.join(', ')}`);
	console.log(`Failed Google tl groups: ${failedTls.length}`);
	for (const f of failedTls) console.log(`  ${f.tl}: ${f.error}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
