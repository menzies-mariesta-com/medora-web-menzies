import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getStockAlertSettingsBundle,
	replaceStockAlertRecipients,
	upsertStockAlertSettings
} from '$lib/server/heka/inventory/stock-alert-settings.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const bundle = await getStockAlertSettingsBundle(event, hospitalId);
	return json(bundle);
};

export const PUT: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!body) throw error(400, 'Invalid JSON');

	if (body.settings != null && typeof body.settings === 'object') {
		const s = body.settings as Record<string, unknown>;
		await upsertStockAlertSettings(event, {
			hospitalId,
			defaultExpiringSoonDays: Number(
				s.defaultExpiringSoonDays ?? 30
			),
			emailLowStock: Boolean(s.emailLowStock),
			emailExpired: Boolean(s.emailExpired),
			emailExpiringSoon: Boolean(s.emailExpiringSoon),
			emailMinGapMinutes: Number(s.emailMinGapMinutes ?? 360),
			inAppMinGapMinutes: Number(s.inAppMinGapMinutes ?? 360)
		});
	}

	if (body.recipients != null) {
		const raw = body.recipients;
		if (!Array.isArray(raw))
			throw error(400, 'recipients must be an array');
		await replaceStockAlertRecipients(event, {
			hospitalId,
			recipients: raw.map((x: Record<string, unknown>) => ({
				storeId: Number(x.storeId),
				staffId: String(x.staffId ?? ''),
				notifyLowStock: Boolean(x.notifyLowStock ?? true),
				notifyExpired: Boolean(x.notifyExpired ?? true),
				notifyExpiringSoon: Boolean(x.notifyExpiringSoon ?? true)
			}))
		});
	}

	const bundle = await getStockAlertSettingsBundle(event, hospitalId);
	return json(bundle);
};
