import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { runInventoryStockAlertsCronJobs } from '$lib/server/heka/inventory/stock-alerts.server';

function extractCronSecret(request: Request): string | null {
	const h = request.headers.get('authorization');
	if (h?.startsWith('Bearer ')) return h.slice(7).trim();
	const x = request.headers.get('x-cron-secret');
	return x?.trim() ?? null;
}

/**
 * Secured poller for stock alerts (in-app + optional email).
 * Configure `CRON_SECRET` and call on a schedule (e.g. Fly cron, GitHub Actions):
 *
 * `curl -X POST -H "Authorization: Bearer $CRON_SECRET" "https://host/api/cron/inventory-stock-alerts?email=1"`
 */
export const POST: RequestHandler = async (event) => {
	const expected = env.CRON_SECRET?.trim();
	if (!expected) throw error(503, 'CRON_SECRET is not configured');

	const token = extractCronSecret(event.request);
	if (!token || token !== expected) throw error(401, 'Unauthorized');

	const sendEmail = event.url.searchParams.get('email') === '1';
	const result = await runInventoryStockAlertsCronJobs({ sendEmail });
	return json(result);
};
