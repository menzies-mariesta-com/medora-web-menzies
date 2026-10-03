#!/usr/bin/env node
/**
 * Import WHO ICD-10 and ICD-11 MMS codes into `diagnosis_code`.
 *
 * Prerequisites:
 *   1. Register at https://icd.who.int/icdapi and create API access keys
 *   2. Set env: WHO_ICD_CLIENT_ID, WHO_ICD_CLIENT_SECRET, DATABASE_URL
 *
 * Usage:
 *   node --env-file=.env scripts/import-icd-codes.mjs
 *   node --env-file=.env scripts/import-icd-codes.mjs --system ICD11
 *   node --env-file=.env scripts/import-icd-codes.mjs --system ICD10 --dry-run
 *   node --env-file=.env scripts/import-icd-codes.mjs --limit 500
 *
 * Notes:
 *   - Runtime EMR search stays local (no WHO calls per keystroke).
 *   - ICD-11 is CC BY-ND 3.0 IGO; keep attribution in the product.
 *   - Prefer MMS linearization entities that have a code.
 */

import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

// WHO hosts are in Azure North Europe; Node's default connect timeout (~10s) is flaky.
const requestTimeoutMs = Number(
	process.env.WHO_ICD_REQUEST_TIMEOUT_MS || 120000
);
const maxRetries = Number(process.env.WHO_ICD_FETCH_RETRIES || 5);

const TOKEN_URL =
	'https://icdaccessmanagement.who.int/connect/token';
const ICD11_MMS_ROOT =
	'https://id.who.int/icd/release/11/2025-01/mms';
const ICD10_ROOT = 'https://id.who.int/icd/release/10/2019';

const args = process.argv.slice(2);
function flagValue(name, fallback = null) {
	const idx = args.indexOf(name);
	if (idx === -1) return fallback;
	return args[idx + 1] ?? fallback;
}
const dryRun = args.includes('--dry-run');
const systemArg = (flagValue('--system', 'BOTH') || 'BOTH').toUpperCase();
const hardLimit = Number(flagValue('--limit', '0') || '0');

const clientId = process.env.WHO_ICD_CLIENT_ID ?? '';
const clientSecret = process.env.WHO_ICD_CLIENT_SECRET ?? '';
const databaseUrl = process.env.DATABASE_URL ?? '';

if (!clientId || !clientSecret) {
	console.error(
		'Missing WHO_ICD_CLIENT_ID / WHO_ICD_CLIENT_SECRET. Register at https://icd.who.int/icdapi'
	);
	process.exit(1);
}
if (!dryRun && !databaseUrl) {
	console.error('Missing DATABASE_URL (or pass --dry-run).');
	process.exit(1);
}

/** @type {string | null} */
let accessToken = null;

function isRetryableNetworkError(err) {
	const code =
		err?.cause?.code ||
		err?.code ||
		(typeof err?.cause?.message === 'string' ? err.cause.message : '');
	const msg = String(err?.message || err || '');
	return (
		code === 'UND_ERR_CONNECT_TIMEOUT' ||
		code === 'UND_ERR_HEADERS_TIMEOUT' ||
		code === 'UND_ERR_BODY_TIMEOUT' ||
		code === 'ECONNRESET' ||
		code === 'ETIMEDOUT' ||
		code === 'ENOTFOUND' ||
		msg.includes('fetch failed') ||
		msg.includes('Connect Timeout')
	);
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, init = {}, label = 'WHO') {
	let lastErr;
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
		try {
			return await fetch(url, { ...init, signal: controller.signal });
		} catch (err) {
			lastErr = err;
			if (!isRetryableNetworkError(err) || attempt === maxRetries) {
				break;
			}
			const waitMs = Math.min(15000, 1000 * 2 ** (attempt - 1));
			console.warn(
				`${label} network error (attempt ${attempt}/${maxRetries}): ${err?.cause?.code || err?.name || err?.message || err}. Retrying in ${waitMs}ms...`
			);
			await sleep(waitMs);
		} finally {
			clearTimeout(timer);
		}
	}
	const cause = lastErr?.cause?.code || lastErr?.cause?.message || '';
	throw new Error(
		`${label} request failed after ${maxRetries} tries (${url}). ${cause || lastErr?.message || lastErr}. Check VPN/firewall/DNS to WHO Azure (icdaccessmanagement.who.int / id.who.int).`
	);
}

async function getToken() {
	const body = new URLSearchParams({
		grant_type: 'client_credentials',
		client_id: clientId,
		client_secret: clientSecret,
		scope: 'icdapi_access'
	});
	const res = await fetchWithRetry(
		TOKEN_URL,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body
		},
		'WHO token'
	);
	if (!res.ok) {
		const text = await res.text();
		if (res.status === 400 || res.status === 401) {
			throw new Error(
				`WHO token rejected (${res.status}). Check WHO_ICD_CLIENT_ID / WHO_ICD_CLIENT_SECRET from https://icd.who.int/icdapi (View API access key). Body: ${text}`
			);
		}
		throw new Error(`WHO token failed: ${res.status} ${text}`);
	}
	const json = await res.json();
	accessToken = json.access_token;
	return accessToken;
}

/** WHO entity URIs are often published as http://; prefer https for the request. */
function requestUrlFor(uri) {
	if (typeof uri !== 'string') return uri;
	if (uri.startsWith('http://id.who.int/')) {
		return `https://${uri.slice('http://'.length)}`;
	}
	return uri;
}

async function whoFetch(url) {
	if (!accessToken) await getToken();
	const res = await fetchWithRetry(
		requestUrlFor(url),
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: 'application/json',
				'Accept-Language': 'en',
				'API-Version': 'v2'
			}
		},
		'WHO API'
	);
	if (res.status === 401) {
		await getToken();
		return whoFetch(url);
	}
	if (!res.ok) {
		throw new Error(
			`WHO GET ${url} -> ${res.status} ${await res.text()}`
		);
	}
	return res.json();
}

function titleOf(entity) {
	const t = entity?.title;
	if (!t) return '';
	if (typeof t === 'string') return t.trim();
	if (typeof t?.['@value'] === 'string') return t['@value'].trim();
	return '';
}

function codeOf(entity) {
	const c = entity?.code ?? entity?.theCode ?? null;
	return typeof c === 'string' ? c.trim() : '';
}

/**
 * BFS walk of child entities; collect coded nodes.
 * @param {string} rootUri
 * @param {'ICD10'|'ICD11'} system
 */
async function collectCodedEntities(rootUri, system) {
	/** @type {{ code: string, description: string, releaseId: string }[]} */
	const out = [];
	const seen = new Set();
	const queue = [rootUri];
	const releaseId = system === 'ICD11' ? '2025-01-mms' : '2019';

	while (queue.length > 0) {
		if (hardLimit > 0 && out.length >= hardLimit) break;
		const uri = queue.shift();
		if (!uri || seen.has(uri)) continue;
		seen.add(uri);

		let entity;
		try {
			entity = await whoFetch(uri);
		} catch (err) {
			console.warn(
				`Skip ${uri}: ${err instanceof Error ? err.message : err}`
			);
			continue;
		}

		const code = codeOf(entity);
		const description = titleOf(entity);
		if (code && description) {
			out.push({ code, description, releaseId });
			if (hardLimit > 0 && out.length >= hardLimit) break;
		}

		const children = Array.isArray(entity?.child)
			? entity.child
			: Array.isArray(entity?.children)
				? entity.children
				: [];
		for (const child of children) {
			const childUri =
				typeof child === 'string'
					? child
					: typeof child?.['@id'] === 'string'
						? child['@id']
						: null;
			if (childUri && !seen.has(childUri)) queue.push(childUri);
		}

		if (seen.size % 100 === 0) {
			console.log(
				`[${system}] visited=${seen.size} coded=${out.length} queue=${queue.length}`
			);
		}
	}

	return { rows: out, releaseId, visited: seen.size };
}

/**
 * @param {Pool} pool
 * @param {'ICD10'|'ICD11'} system
 * @param {{ code: string, description: string, releaseId: string }[]} rows
 * @param {string} releaseId
 */
async function upsertRows(pool, system, rows, releaseId) {
	if (rows.length === 0) return 0;
	const chunkSize = 100;
	let upserted = 0;
	for (let i = 0; i < rows.length; i += chunkSize) {
		const chunk = rows.slice(i, i + chunkSize);
		const params = [];
		const placeholders = chunk
			.map((r, idx) => {
				const base = idx * 5;
				params.push(r.code, system, r.description, r.releaseId, 1);
				return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
			})
			.join(', ');
		await pool.query(
			`INSERT INTO diagnosis_code (code, system, description, release_id, status_id)
			 VALUES ${placeholders}
			 ON CONFLICT (system, code) DO UPDATE SET
			   description = EXCLUDED.description,
			   release_id = EXCLUDED.release_id,
			   status_id = EXCLUDED.status_id,
			   updated_at = now()`,
			params
		);
		upserted += chunk.length;
		if (upserted % 500 === 0 || upserted === rows.length) {
			console.log(`[${system}] upsert progress ${upserted}/${rows.length}`);
		}
	}

	await pool.query(
		`INSERT INTO diagnosis_code_release (
			system, release_id, source, title_count, imported_at, notes
		)
		VALUES ($1, $2, $3, $4, now(), $5)
		ON CONFLICT (system, release_id) DO UPDATE SET
			title_count = EXCLUDED.title_count,
			imported_at = EXCLUDED.imported_at,
			notes = EXCLUDED.notes,
			updated_at = now()`,
		[
			system,
			releaseId,
			'WHO_ICD_API',
			rows.length,
			`Imported by scripts/import-icd-codes.mjs (${new Date().toISOString()})`
		]
	);
	return upserted;
}

async function runSystem(pool, system) {
	const root = system === 'ICD11' ? ICD11_MMS_ROOT : ICD10_ROOT;
	console.log(`Collecting ${system} from ${root} ...`);
	const { rows, releaseId, visited } = await collectCodedEntities(
		root,
		system
	);
	console.log(
		`[${system}] visited=${visited} coded=${rows.length} release=${releaseId}`
	);
	if (dryRun) {
		console.log(`[${system}] dry-run sample:`, rows.slice(0, 5));
		return rows.length;
	}
	const n = await upsertRows(pool, system, rows, releaseId);
	console.log(`[${system}] upserted=${n}`);
	return n;
}

async function main() {
	const systems =
		systemArg === 'BOTH'
			? ['ICD10', 'ICD11']
			: systemArg === 'ICD10' || systemArg === 'ICD11'
				? [systemArg]
				: null;
	if (!systems) {
		console.error('--system must be ICD10, ICD11, or BOTH');
		process.exit(1);
	}

	await getToken();
	console.log('WHO ICD-API token OK');

	const pool = dryRun ? null : new Pool({ connectionString: databaseUrl });

	try {
		for (const system of systems) {
			await runSystem(pool, system);
		}
	} finally {
		if (pool) await pool.end();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
