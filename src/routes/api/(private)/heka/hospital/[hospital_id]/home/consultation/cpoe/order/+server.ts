import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import * as obs from '$lib/server/heka/observation/observation-emr.server';
import { getSubCategories } from '$lib/server/heka/administration/service-order/sub-category.server';
import { and, inArray, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const mode = event.url.searchParams.get('mode') ?? '';
	if (!mode) throw error(400, 'mode is required');

	switch (mode) {
		case 'visit.get': {
			const visitId = Number(
				event.url.searchParams.get('visitId') ?? '0'
			);
			if (!Number.isFinite(visitId) || visitId <= 0)
				throw error(400, 'visitId is required');
			return json(
				await obs.getPatientVisitById({ id: visitId, hospitalId })
			);
		}
		case 'serviceOrder.list': {
			const visitId = Number(
				event.url.searchParams.get('visitId') ?? '0'
			);
			if (!Number.isFinite(visitId) || visitId <= 0)
				throw error(400, 'visitId is required');
			return json(await obs.getServiceOrder({ visitId }));
		}
		case 'orderLine.list': {
			const visitIdForLock = Number(
				event.url.searchParams.get('visitId') ?? '0'
			);
			const serviceOrderIdsRaw =
				event.url.searchParams.getAll('serviceOrderIds');
			const serviceOrderIds = serviceOrderIdsRaw
				.map((v) => Number(v))
				.filter((n) => Number.isFinite(n));
			if (!serviceOrderIds.length)
				throw error(400, 'serviceOrderIds is required');
			const rows = await ensureDb()
				.select()
				.from(table.serviceOrderDetailTable)
				.where(
					and(
						inArray(
							table.serviceOrderDetailTable.serviceOrderId,
							serviceOrderIds
						),
						ne(
							table.serviceOrderDetailTable.statusId,
							StatusEnum.DELETED
						)
					)
				)
				.orderBy(table.serviceOrderDetailTable.id);
			const lockedIds =
				Number.isFinite(visitIdForLock) && visitIdForLock > 0
					? await obs.getServiceOrderDetailIdsOnClosedOpBillsForVisit(
							{
								visitId: visitIdForLock
							}
						)
					: null;
			return json(
				rows.map((r) => ({
					...r,
					lockedByClosedOpBill: lockedIds
						? lockedIds.has(r.id)
						: false
				}))
			);
		}
		case 'serviceTagging.list': {
			const branchId = event.url.searchParams.get('branchId') ?? '';
			if (!branchId) throw error(400, 'branchId is required');
			const serviceIdRaw = event.url.searchParams.get('serviceId');
			const serviceId =
				serviceIdRaw != null && serviceIdRaw.trim() !== ''
					? Number(serviceIdRaw)
					: undefined;
			return json(
				await obs.getServiceTagging({ branchId, serviceId })
			);
		}
		case 'serviceItem.paginated': {
			const serviceName =
				event.url.searchParams.get('serviceName') ?? undefined;
			const statusIdRaw = event.url.searchParams.get('statusId');
			const statusId =
				statusIdRaw != null && statusIdRaw.trim() !== ''
					? Number(statusIdRaw)
					: undefined;
			const page = Number(event.url.searchParams.get('page') ?? '1');
			const pageSize = Number(
				event.url.searchParams.get('pageSize') ?? '20'
			);
			return json(
				await obs.getServiceItemPaginated({
					hospitalId,
					serviceName,
					statusId,
					page,
					pageSize
				})
			);
		}
		case 'serviceItem.byId': {
			const id = Number(event.url.searchParams.get('id') ?? '0');
			if (!Number.isFinite(id) || id <= 0)
				throw error(400, 'id is required');
			const rows = await obs.getServiceItem({
				hospitalId,
				statusId: null,
				id
			});
			return json(rows[0] ?? null);
		}
		case 'subCategory.list': {
			return json(await getSubCategories(event));
		}
		case 'doctor.search': {
			const search = event.url.searchParams.get('search') ?? '';
			const page = Number(event.url.searchParams.get('page') ?? '1');
			const pageSize = Number(
				event.url.searchParams.get('pageSize') ?? '20'
			);
			return json(
				await obs.getDoctorStaffPaginated({
					hospitalId,
					search,
					page,
					pageSize
				})
			);
		}
		case 'staff.get': {
			const id = event.url.searchParams.get('id') ?? '';
			if (!id) throw error(400, 'id is required');
			return json(await obs.getStaffByIdWithRelations({ id }));
		}
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const body = (await event.request.json().catch(() => null)) as any;
	const mode = String(body?.mode ?? '');
	if (!mode) throw error(400, 'mode is required');

	switch (mode) {
		case 'serviceOrder.create': {
			return json(await obs.createServiceOrder(event, body?.payload));
		}
		case 'orderLine.create': {
			return json(await obs.createServiceOrderDetail(body?.payload));
		}
		case 'orderLine.update': {
			return json(await obs.updateServiceOrderDetail(body?.payload));
		}
		case 'orderLine.delete': {
			await obs.deleteServiceOrderDetail({
				id: Number(body?.id ?? 0),
				cancelRemark:
					body?.cancelRemark != null
						? String(body.cancelRemark)
						: null,
				cancelBy: event.locals.user?.id ?? null
			});
			return json({ ok: true });
		}
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}
