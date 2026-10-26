import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	applyOtBillingDiscount,
	closeOtBilling,
	getOtBillingContext,
	signOtProcedure,
	transferOtCharges
} from '$lib/server/medora/operation-theatre/ot-billing.server';
import * as admission from '$lib/server/medora/ipd/admission.server';

function visitIdFrom(event: RequestEvent, body?: Record<string, unknown>) {
	const fromQuery = event.url.searchParams.get('visitId') ?? '';
	const fromBody = body?.visitId != null ? String(body.visitId) : '';
	const visitId = (fromBody || fromQuery).trim();
	if (!visitId) throw error(400, 'visitId is required');
	return visitId;
}

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	return json(
		await getOtBillingContext({
			hospitalId,
			visitId: visitIdFrom(event)
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	const visitId = visitIdFrom(event, body);
	const action = String(body.action ?? '');
	const staffId = event.locals.staff?.id
		? String(event.locals.staff.id)
		: null;

	if (action === 'sign_procedure') {
		const caseId = Number(body.caseId);
		if (!Number.isFinite(caseId) || caseId <= 0) {
			throw error(400, 'caseId is required');
		}
		const valuesJson =
			(body.valuesJson as Record<string, unknown>) ?? {};
		await signOtProcedure({
			hospitalId,
			visitId,
			caseId,
			valuesJson,
			staffId
		});
		return json(await getOtBillingContext({ hospitalId, visitId }));
	}

	if (action === 'transfer') {
		const result = await transferOtCharges({
			hospitalId,
			visitId,
			staffId
		});
		return json({
			...result,
			context: await getOtBillingContext({ hospitalId, visitId })
		});
	}

	if (action === 'discount') {
		return json(
			await applyOtBillingDiscount({
				hospitalId,
				visitId,
				discountTypeId: Number(body.discountTypeId ?? 1),
				discountPercent: Number(body.discountPercent ?? 0),
				discountAmount: Number(body.discountAmount ?? 0),
				staffId
			})
		);
	}

	if (action === 'close') {
		return json(await closeOtBilling({ hospitalId, visitId, staffId }));
	}

	if (action === 'discharge') {
		const admissionId = Number(body.admissionId);
		if (!Number.isFinite(admissionId) || admissionId <= 0) {
			throw error(400, 'admissionId is required');
		}
		await admission.dischargeAdmission({ hospitalId, admissionId });
		return json({ ok: true });
	}

	throw error(400, 'Unknown action');
}
