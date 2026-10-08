/**
 * Full WHO ICD-10 / ICD-11 MMS import into `diagnosis_code`.
 *
 * Used by:
 * - `scripts/import-icd-codes.ts` / `pnpm db:import:icd`
 * - information-table seed
 * - admin ICD reseed (SYSTEM_ADMIN)
 *
 * Runtime EMR search stays local (no WHO calls per keystroke).
 * ICD-11 is CC BY-ND 3.0 IGO; keep attribution in the product.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import {
	DiagnosisCodingSystemEnum,
	type WhoDiagnosisCodingSystem
} from '$lib/model/enum/diagnosis-coding-system.enum';
import { ensureDatabaseUrl } from '$lib/server/db/ensure-database-url';
import { upsertDiagnosisCodeRows } from '$lib/server/medora/clinical/diagnosis-code-upsert.server';

export type WhoIcdSystem = WhoDiagnosisCodingSystem;

export type WhoIcdCodedRow = {
	code: string;
	description: string;
	releaseId: string;
};

export type WhoIcdSystemImportResult = {
	system: WhoIcdSystem;
	inserted: number;
	updated: number;
	total: number;
	releaseId: string;
	visited: number;
};

export type WhoIcdImportResult = {
	systems: WhoIcdSystemImportResult[];
	inserted: number;
	updated: number;
	total: number;
};

export type WhoIcdImportOptions = {
	/** ICD10, ICD11, or both (default both). */
	systems?: WhoIcdSystem[] | 'BOTH';
	/** Cap coded rows per system (CLI testing). 0 = no limit. */
	limit?: number;
	/** Collect from WHO but skip DB writes. */
	dryRun?: boolean;
	/**
	 * If set, write/read collected rows under this directory so a failed upsert
	 * can resume without re-walking WHO (`{system}.json`).
	 * Default: `.cache/icd-import` under cwd.
	 */
	cacheDir?: string | null;
	/** Prefer cache file when present (default true when cacheDir is used). */
	useCache?: boolean;
	/** Override credentials (defaults to process.env). */
	clientId?: string;
	clientSecret?: string;
	databaseUrl?: string;
	/** Notes stored on diagnosis_code_release. */
	notesPrefix?: string;
	log?: (message: string) => void;
};

export class WhoIcdCredentialsError extends Error {
	constructor(
		message = 'Missing WHO_ICD_CLIENT_ID / WHO_ICD_CLIENT_SECRET. Register at https://icd.who.int/icdapi and set both env vars before seeding or reseeding ICD codes.'
	) {
		super(message);
		this.name = 'WhoIcdCredentialsError';
	}
}

export class WhoIcdDatabaseUrlError extends Error {
	constructor(
		message = 'Missing DATABASE_URL (required for WHO ICD import unless dry-run).'
	) {
		super(message);
		this.name = 'WhoIcdDatabaseUrlError';
	}
}

const TOKEN_URL = 'https://icdaccessmanagement.who.int/connect/token';
const ICD11_MMS_ROOT = 'https://id.who.int/icd/release/11/2025-01/mms';
const ICD10_ROOT = 'https://id.who.int/icd/release/10/2019';

const WHO_ICD_API_SOURCE = 'WHO_ICD_API';

function requestTimeoutMs(): number {
	return Number(process.env.WHO_ICD_REQUEST_TIMEOUT_MS || 120000);
}

function maxRetries(): number {
	return Number(process.env.WHO_ICD_FETCH_RETRIES || 5);
}

export function readWhoIcdCredentials(opts?: {
	clientId?: string;
	clientSecret?: string;
}): { clientId: string; clientSecret: string } {
	const clientId = (opts?.clientId ?? process.env.WHO_ICD_CLIENT_ID ?? '').trim();
	const clientSecret = (
		opts?.clientSecret ??
		process.env.WHO_ICD_CLIENT_SECRET ??
		''
	).trim();
	if (!clientId || !clientSecret) {
		throw new WhoIcdCredentialsError();
	}
	return { clientId, clientSecret };
}

export function isWhoIcdSeedSkipped(): boolean {
	const raw = (process.env.WHO_ICD_SKIP_SEED ?? '').trim().toLowerCase();
	return raw === '1' || raw === 'true' || raw === 'yes';
}

function resolveSystems(
	systems: WhoIcdImportOptions['systems']
): WhoIcdSystem[] {
	if (!systems || systems === 'BOTH') {
		return [
			DiagnosisCodingSystemEnum.ICD10,
			DiagnosisCodingSystemEnum.ICD11
		];
	}
	return systems;
}

function isRetryableNetworkError(err: unknown): boolean {
	const e = err as {
		cause?: { code?: string; message?: string };
		code?: string;
		message?: string;
		name?: string;
	};
	const code =
		e?.cause?.code ||
		e?.code ||
		(typeof e?.cause?.message === 'string' ? e.cause.message : '');
	const msg = String(e?.message || err || '');
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

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
	url: string,
	init: RequestInit = {},
	label = 'WHO'
): Promise<Response> {
	const retries = maxRetries();
	const timeoutMs = requestTimeoutMs();
	let lastErr: unknown;
	for (let attempt = 1; attempt <= retries; attempt++) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		try {
			return await fetch(url, { ...init, signal: controller.signal });
		} catch (err) {
			lastErr = err;
			if (!isRetryableNetworkError(err) || attempt === retries) {
				break;
			}
			const waitMs = Math.min(15000, 1000 * 2 ** (attempt - 1));
			console.warn(
				`${label} network error (attempt ${attempt}/${retries}): ${(err as { cause?: { code?: string }; name?: string; message?: string })?.cause?.code || (err as Error)?.name || (err as Error)?.message || err}. Retrying in ${waitMs}ms...`
			);
			await sleep(waitMs);
		} finally {
			clearTimeout(timer);
		}
	}
	const e = lastErr as {
		cause?: { code?: string; message?: string };
		message?: string;
	};
	const cause = e?.cause?.code || e?.cause?.message || '';
	throw new Error(
		`${label} request failed after ${retries} tries (${url}). ${cause || e?.message || lastErr}. Check VPN/firewall/DNS to WHO Azure (icdaccessmanagement.who.int / id.who.int).`
	);
}

type WhoClient = {
	getToken: () => Promise<string>;
	whoFetch: (url: string) => Promise<Record<string, unknown>>;
};

function createWhoClient(
	clientId: string,
	clientSecret: string
): WhoClient {
	let accessToken: string | null = null;

	async function getToken(): Promise<string> {
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
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
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
		const json = (await res.json()) as { access_token?: string };
		if (!json.access_token) {
			throw new Error('WHO token response missing access_token');
		}
		accessToken = json.access_token;
		return accessToken;
	}

	function requestUrlFor(uri: string): string {
		if (uri.startsWith('http://id.who.int/')) {
			return `https://${uri.slice('http://'.length)}`;
		}
		return uri;
	}

	async function whoFetch(url: string): Promise<Record<string, unknown>> {
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
		return (await res.json()) as Record<string, unknown>;
	}

	return { getToken, whoFetch };
}

function titleOf(entity: Record<string, unknown>): string {
	const t = entity?.title;
	if (!t) return '';
	if (typeof t === 'string') return t.trim();
	if (
		typeof t === 'object' &&
		t !== null &&
		typeof (t as { '@value'?: unknown })['@value'] === 'string'
	) {
		return String((t as { '@value': string })['@value']).trim();
	}
	return '';
}

function codeOf(entity: Record<string, unknown>): string {
	const c = entity?.code ?? entity?.theCode ?? null;
	return typeof c === 'string' ? c.trim() : '';
}

async function collectCodedEntities(
	who: WhoClient,
	rootUri: string,
	system: WhoIcdSystem,
	hardLimit: number,
	log: (message: string) => void
): Promise<{ rows: WhoIcdCodedRow[]; releaseId: string; visited: number }> {
	const out: WhoIcdCodedRow[] = [];
	const seen = new Set<string>();
	const queue = [rootUri];
	const releaseId = system === DiagnosisCodingSystemEnum.ICD11 ? '2025-01-mms' : '2019';

	while (queue.length > 0) {
		if (hardLimit > 0 && out.length >= hardLimit) break;
		const uri = queue.shift();
		if (!uri || seen.has(uri)) continue;
		seen.add(uri);

		let entity: Record<string, unknown>;
		try {
			entity = await who.whoFetch(uri);
		} catch (err) {
			log(
				`Skip ${uri}: ${err instanceof Error ? err.message : String(err)}`
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
					: typeof child === 'object' &&
						  child !== null &&
						  typeof (child as { '@id'?: unknown })['@id'] ===
								'string'
						? String((child as { '@id': string })['@id'])
						: null;
			if (childUri && !seen.has(childUri)) queue.push(childUri);
		}

		if (seen.size % 100 === 0) {
			log(
				`[${system}] visited=${seen.size} coded=${out.length} queue=${queue.length}`
			);
		}
	}

	return { rows: out, releaseId, visited: seen.size };
}

type SqlClient = NeonQueryFunction<false, false>;

function defaultCacheDir(): string {
	return join(process.cwd(), '.cache', 'icd-import');
}

function cachePath(cacheDir: string, system: WhoIcdSystem): string {
	return join(cacheDir, `${system}.json`);
}

function writeCache(
	cacheDir: string,
	system: WhoIcdSystem,
	payload: {
		releaseId: string;
		visited: number;
		rows: WhoIcdCodedRow[];
	}
): void {
	mkdirSync(cacheDir, { recursive: true });
	writeFileSync(cachePath(cacheDir, system), JSON.stringify(payload), 'utf8');
}

function readCache(
	cacheDir: string,
	system: WhoIcdSystem
): {
	releaseId: string;
	visited: number;
	rows: WhoIcdCodedRow[];
} | null {
	const path = cachePath(cacheDir, system);
	if (!existsSync(path)) return null;
	try {
		const raw = JSON.parse(readFileSync(path, 'utf8')) as {
			releaseId?: string;
			visited?: number;
			rows?: WhoIcdCodedRow[];
		};
		if (
			typeof raw.releaseId !== 'string' ||
			!Array.isArray(raw.rows) ||
			raw.rows.length === 0
		) {
			return null;
		}
		return {
			releaseId: raw.releaseId,
			visited: Number(raw.visited ?? raw.rows.length),
			rows: raw.rows
		};
	} catch {
		return null;
	}
}

/**
 * Import full WHO ICD catalogs (or a subset) into `diagnosis_code`.
 * Upsert only; does not truncate. Diagnosis FKs stay valid.
 * Uses Neon HTTP (not WebSocket Pool) so long WHO walks do not lose DB connectivity.
 * ICD-10-CM is a separate catalogue (`importIcd10CmCatalogue`).
 */
export async function importWhoIcdSystems(
	options: WhoIcdImportOptions = {}
): Promise<WhoIcdImportResult> {
	const log = options.log ?? ((m: string) => console.log(m));
	const { clientId, clientSecret } = readWhoIcdCredentials({
		clientId: options.clientId,
		clientSecret: options.clientSecret
	});
	const systems = resolveSystems(options.systems);
	const hardLimit = Number(options.limit ?? 0) || 0;
	const dryRun = Boolean(options.dryRun);
	const notesPrefix =
		options.notesPrefix?.trim() || 'Imported by who-icd-import';
	const cacheDir =
		options.cacheDir === null
			? null
			: (options.cacheDir?.trim() || defaultCacheDir());
	const useCache = options.useCache !== false && cacheDir != null;

	const who = createWhoClient(clientId, clientSecret);
	await who.getToken();
	log('WHO ICD-API token OK');

	let sql: SqlClient | null = null;
	if (!dryRun) {
		const databaseUrl =
			options.databaseUrl?.trim() ||
			(() => {
				try {
					return ensureDatabaseUrl();
				} catch {
					const raw = (process.env.DATABASE_URL ?? '').trim();
					if (!raw) throw new WhoIcdDatabaseUrlError();
					return raw;
				}
			})();
		sql = neon(databaseUrl);
	}

	const results: WhoIcdSystemImportResult[] = [];

	for (const system of systems) {
		const root =
			system === DiagnosisCodingSystemEnum.ICD11
				? ICD11_MMS_ROOT
				: ICD10_ROOT;

		let rows: WhoIcdCodedRow[];
		let releaseId: string;
		let visited: number;

		const cached =
			useCache && cacheDir ? readCache(cacheDir, system) : null;
		if (cached && (hardLimit <= 0 || cached.rows.length >= hardLimit)) {
			rows =
				hardLimit > 0
					? cached.rows.slice(0, hardLimit)
					: cached.rows;
			releaseId = cached.releaseId;
			visited = cached.visited;
			log(
				`[${system}] loaded ${rows.length} coded rows from cache ${cachePath(cacheDir!, system)}`
			);
		} else {
			log(`Collecting ${system} from ${root} ...`);
			const collected = await collectCodedEntities(
				who,
				root,
				system,
				hardLimit,
				log
			);
			rows = collected.rows;
			releaseId = collected.releaseId;
			visited = collected.visited;
			log(
				`[${system}] visited=${visited} coded=${rows.length} release=${releaseId}`
			);
			if (cacheDir && rows.length > 0) {
				writeCache(cacheDir, system, { releaseId, visited, rows });
				log(
					`[${system}] wrote cache ${cachePath(cacheDir, system)} (${rows.length} rows)`
				);
			}
		}

		if (dryRun) {
			log(`[${system}] dry-run sample: ${JSON.stringify(rows.slice(0, 5))}`);
			results.push({
				system,
				inserted: 0,
				updated: 0,
				total: rows.length,
				releaseId,
				visited
			});
			continue;
		}

		if (!sql) throw new WhoIcdDatabaseUrlError();
		const notes = `${notesPrefix} (${new Date().toISOString()})`;
		const counts = await upsertDiagnosisCodeRows(
			sql,
			system,
			rows,
			releaseId,
			WHO_ICD_API_SOURCE,
			notes,
			log
		);
		log(
			`[${system}] upserted=${counts.total} (inserted=${counts.inserted}, updated=${counts.updated})`
		);
		results.push({
			system,
			inserted: counts.inserted,
			updated: counts.updated,
			total: counts.total,
			releaseId,
			visited
		});
	}

	return {
		systems: results,
		inserted: results.reduce((s, r) => s + r.inserted, 0),
		updated: results.reduce((s, r) => s + r.updated, 0),
		total: results.reduce((s, r) => s + r.total, 0)
	};
}
