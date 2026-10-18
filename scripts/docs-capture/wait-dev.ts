const DEFAULT_WAIT_MS = Number(process.env.DOCS_CAPTURE_WAIT_DEV_MS ?? 120_000);
const POLL_MS = 1_500;

export async function waitForDevServer(baseURL: string): Promise<void> {
	const healthUrl = new URL('/auth/login', baseURL).href;
	const deadline = Date.now() + DEFAULT_WAIT_MS;
	let lastError = '';

	console.log(`Waiting for dev server at ${baseURL} (up to ${Math.round(DEFAULT_WAIT_MS / 1000)}s)…`);

	while (Date.now() < deadline) {
		try {
			const res = await fetch(healthUrl, { redirect: 'manual' });
			if (res.ok || res.status === 302 || res.status === 303) {
				console.log(`Dev server is up (${healthUrl}).\n`);
				return;
			}
			lastError = `HTTP ${res.status}`;
		} catch (e) {
			lastError = e instanceof Error ? e.message : String(e);
		}
		await sleep(POLL_MS);
	}

	throw new Error(
		`Cannot reach Medora dev server at ${baseURL} (${lastError}).\n` +
			`Start it in another terminal: npm run dev\n` +
			`Then run: npm run docs:capture -- --resume\n` +
			`Or set PLAYWRIGHT_BASE_URL if you use a different port.`
	);
}

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}
