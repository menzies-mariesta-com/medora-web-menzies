import { error, json, type RequestHandler } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';

export const GET: RequestHandler = async (event) => {
	const { url, params, locals } = event;
	if (!locals.user) throw error(401, 'Unauthorized');

	const hospitalId = params.hospital_id ?? '';
	const visitId = Number(url.searchParams.get('visitId') ?? '0');
	if (!Number.isFinite(visitId) || visitId <= 0) {
		throw error(400, 'visitId is required');
	}

	const visit = await ensureDb().query.patientVisitTable.findFirst({
		where: (t, { eq }) => eq(t.id, visitId),
		columns: { id: true, hospitalId: true }
	});
	if (!visit) throw error(404, 'Visit not found');
	if (String(visit.hospitalId ?? '') !== hospitalId) {
		throw error(400, 'Visit does not belong to hospital');
	}

	const bills = await ensureDb().query.opBillingTable.findMany({
		where: and(
			eq(table.opBillingTable.visitId, visitId),
			eq(table.opBillingTable.hospitalId, hospitalId),
			ne(table.opBillingTable.statusId, StatusEnum.DELETED)
		),
		with: {
			discountedByStaff: { with: { title: true } },
			printedByStaff: { with: { title: true } }
		},
		orderBy: [desc(table.opBillingTable.id)]
	});

	return json({ items: bills }, { status: 200 });
};

export const POST: RequestHandler = async (event) => {
	const { request, params, locals } = event;
	if (!locals.user) throw error(401, 'Unauthorized');

	const hospitalId = params.hospital_id ?? '';
	const body: unknown = await request.json().catch(() => ({}));
	const billingId =
		typeof body === 'object' && body !== null
			? Number((body as { billingId?: unknown }).billingId ?? 0)
			: 0;
	if (!Number.isFinite(billingId) || billingId <= 0) {
		throw error(400, 'billingId is required');
	}

	const bill = await ensureDb().query.opBillingTable.findFirst({
		where: and(
			eq(table.opBillingTable.id, billingId),
			eq(table.opBillingTable.hospitalId, hospitalId),
			ne(table.opBillingTable.statusId, StatusEnum.DELETED)
		),
		with: {
			visit: true,
			branch: true,
			hospital: true,
			discountedByStaff: { with: { title: true } },
			printedByStaff: { with: { title: true } },
			lines: true
		}
	});
	if (!bill) throw error(404, 'Bill not found');

	const lines = [...(bill.lines ?? [])].sort(
		(a, b) => (a.lineIndex ?? 0) - (b.lineIndex ?? 0)
	);

	// Include sub-category names from snapshot first; fall back to relation lookup only when needed.
	const subCategoryIds = Array.from(
		new Set(
			lines
				.map((l) => l.subCategoryId)
				.filter((id): id is number => id != null)
		)
	);
	let subCategoryNameById = new Map<number, string | null>();
	if (subCategoryIds.length > 0) {
		const subs = await ensureDb()
			.select({
				id: table.subCategoryTable.id,
				name: table.subCategoryTable.subCategoryName
			})
			.from(table.subCategoryTable)
			.where(inArray(table.subCategoryTable.id, subCategoryIds));
		subCategoryNameById = new Map(subs.map((s) => [s.id, s.name]));
	}

	return json(
		{
			bill,
			lines: lines.map((l) => ({
				...l,
				subCategoryName:
					l.subCategoryNameSnapshot ??
					(l.subCategoryId != null
						? subCategoryNameById.get(l.subCategoryId) ?? null
						: null),
				serviceName: l.serviceNameSnapshot ?? null,
				orderNo: l.orderNoSnapshot ?? null
			}))
		},
		{ status: 200 }
	);
};

