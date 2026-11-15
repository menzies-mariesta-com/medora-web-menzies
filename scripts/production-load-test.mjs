/**
 * Lightweight production load probe (TTFB percentiles).
 * Usage:
 *   npm run build && npm run preview &  # port 4173
 *   LOAD_TEST_BASE_URL=http://127.0.0.1:4173 pnpm run test:load:production
 */
import { performance } from 'node:perf_hooks';
import { spawn } from 'node:child_process';

const BASE =
	process.env.LOAD_TEST_BASE_URL?.replace(/\/$/, '') ??
	'http://127.0.0.1:4173';

const PATHS = [
	'/',
	'/pricing',
	'/medora-logo.svg',
	'/medora-bootstrap-wash-theme.css',
	'/favicon.ico'
];

const CONCURRENCY = Number(process.env.LOAD_TEST_CONCURRENCY ?? 24);
const DURATION_MS = Number(process.env.LOAD_TEST_DURATION_MS ?? 15_000);
const TARGET_P95_MS = Number(process.env.LOAD_TEST_P95_MS ?? 800);

function percentile(sorted, p) {
	const idx = Math.min(
		sorted.length - 1,
		Math.ceil((p / 100) * sorted.length) - 1
	);
	return sorted[idx] ?? 0;
}

async function fetchTtfb(url) {
	const start = performance.now();
	try {
		const res = await fetch(url, {
			headers: { Accept: '*/*' },
			redirect: 'follow'
		});
		await res.arrayBuffer();
		return { ok: res.ok, ms: performance.now() - start, status: res.status };
	} catch (e) {
		return {
			ok: false,
			ms: performance.now() - start,
			status: 0,
			error: e instanceof Error ? e.message : String(e)
		};
	}
}

async function ensureServer() {
	const probe = await fetchTtfb(`${BASE}/favicon.ico`);
	if (probe.ok || probe.status === 404) return null;

	if (process.env.LOAD_TEST_SKIP_SPAWN === '1') {
		throw new Error(
			`Server not reachable at ${BASE} (set LOAD_TEST_BASE_URL or start preview)`
		);
	}

	console.log(`Spawning vite preview at ${BASE}...`);
	const child = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'], {
		cwd: process.cwd(),
		stdio: 'ignore',
		env: { ...process.env }
	});
	for (let i = 0; i < 60; i++) {
		await new Promise((r) => setTimeout(r, 1000));
		const p = await fetchTtfb(`${BASE}/favicon.ico`);
		if (p.ok || p.status === 404) return child;
	}
	child.kill('SIGTERM');
	throw new Error('Preview did not start within 60s');
}

async function runLoad() {
	const child = await ensureServer();
	const urls = PATHS.map((p) => `${BASE}${p}`);
	const samples = [];
	const endAt = Date.now() + DURATION_MS;
	const workers = Array.from({ length: CONCURRENCY }, async () => {
		let i = 0;
		while (Date.now() < endAt) {
			const url = urls[i % urls.length];
			i += 1;
			samples.push(await fetchTtfb(url));
		}
	});
	await Promise.all(workers);
	if (child) child.kill('SIGTERM');

	const ok = samples.filter((s) => s.ok);
	const ms = ok.map((s) => s.ms).sort((a, b) => a - b);
	const p50 = percentile(ms, 50);
	const p95 = percentile(ms, 95);
	const p99 = percentile(ms, 99);

	const report = {
		base: BASE,
		durationMs: DURATION_MS,
		concurrency: CONCURRENCY,
		requests: samples.length,
		ok: ok.length,
		errors: samples.length - ok.length,
		ttfbMs: { p50, p95, p99 }
	};

	console.log(JSON.stringify(report, null, 2));

	if (p95 > TARGET_P95_MS) {
		console.error(
			`LOAD TEST FAIL: p95 TTFB ${p95.toFixed(1)}ms > ${TARGET_P95_MS}ms`
		);
		process.exit(1);
	}
	console.log(`LOAD TEST PASS: p95 TTFB ${p95.toFixed(1)}ms <= ${TARGET_P95_MS}ms`);
}

runLoad().catch((e) => {
	console.error(e);
	process.exit(1);
});