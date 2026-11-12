import { error, json, type RequestHandler } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { buildBillingBillContext } from '$lib/server/medora/billing/billing-bill-context.server';

export const GET: RequestHandler = async (event) => {
	if (!event.locals.user) throw error(401, 'Unauthorized');

	const hospitalId = String(event.params.hospital_id ?? '');
	if (!hospitalId) {
		return json({ error: 'Missing hospital id' }, { status: 400 });
	}
	await ensureCanAccessHospital(event, hospitalId);

	const patientId = event.url.searchParams.get('patientId');
	const visitId = event.url.searchParams.get('visitId');

	return json(
		await buildBillingBillContext({
			hospitalId,
			patientId,
			visitId,
			syncActor: {
				userId: event.locals.user.id,
				staffId: event.locals.staff?.id ?? null
			}
		})
	);
};
