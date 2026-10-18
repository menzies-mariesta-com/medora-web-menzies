/**
 * Transactional inventory demo data for workflow docs capture (Testing Hospital 1).
 *
 * SQL-only (tsx safe). Prerequisites: db:seed, visit-history-demo (store + items).
 */
import { pathToFileURL } from 'node:url';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { uuidV7 } from '$lib/util/id.util';
import { seedLogger } from '$lib/logger';
import { ensureDatabaseUrl } from '$lib/server/db/ensure-database-url';
import {
	InvDepartmentConsumptionStatusTaggingEnum,
	InvDepartmentIssueStatusTaggingEnum,
	InvGrnStatusTaggingEnum,
	StatusEnum,
	YesNoEnum
} from '$lib/model/enum/db-link';

export const DOCS_INV_MARKER = '[docs-demo-inv]';
export const DOCS_DEMO_WARD_STORE_NAME = 'Docs Demo Ward Store';
export const DOCS_DEMO_GRN_INVOICE = 'DOCS-DEMO-INV-001';

const DEFAULT_HOSPITAL_ID = '01a0cd12-1af6-7839-a4ce-6d834497a0ba';

const db = drizzle(neon(ensureDatabaseUrl()));

type QueryRows<T> = { rows: T[] };

function rowsOf<T>(result: unknown): T[] {
	const r = result as QueryRows<T>;
	return Array.isArray(r?.rows) ? r.rows : [];
}

function resolveHospitalId(): string {
	return (
		process.env.SEED_HOSPITAL_ID?.trim() ||
		process.env.DOCS_DEMO_HOSPITAL_ID?.trim() ||
		DEFAULT_HOSPITAL_ID
	);
}

function isoDateOffset(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d.toISOString().slice(0, 10);
}

async function seedAlreadyComplete(hospitalId: string): Promise<boolean> {
	const rows = rowsOf<{ id: string }>(
		await db.execute(sql`
			SELECT id::text AS id
			FROM goods_receipt_note
			WHERE hospital_id = ${hospitalId}::uuid
			  AND invoice_no = ${DOCS_DEMO_GRN_INVOICE}
			LIMIT 1
		`)
	);
	return rows.length > 0;
}

async function resolveSeedAdminUserId(): Promise<string> {
	const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
	if (!email) {
		throw new Error(
			'SEED_ADMIN_EMAIL is required for inventory docs demo seed.'
		);
	}
	const rows = rowsOf<{ id: string }>(
		await db.execute(sql`
			SELECT id::text AS id FROM "user"
			WHERE lower(email) = ${email}
			LIMIT 1
		`)
	);
	const id = rows[0]?.id;
	if (!id) {
		throw new Error(`Seed admin user not found for ${email}. Run db:seed:auth first.`);
	}
	return id;
}

async function ensureWardStore(branchId: string): Promise<number> {
	const existing = rowsOf<{ id: number }>(
		await db.execute(sql`
			SELECT id FROM store
			WHERE branch_id = ${branchId}::uuid
			  AND store_name = ${DOCS_DEMO_WARD_STORE_NAME}
			  AND status_id = ${StatusEnum.ACTIVE}
			LIMIT 1
		`)
	);
	if (existing[0]?.id) return existing[0].id;

	const created = rowsOf<{ id: number }>(
		await db.execute(sql`
			INSERT INTO store (branch_id, store_name, remark, status_id)
			VALUES (
				${branchId}::uuid,
				${DOCS_DEMO_WARD_STORE_NAME},
				${DOCS_INV_MARKER},
				${StatusEnum.ACTIVE}
			)
			RETURNING id
		`)
	);
	const id = created[0]?.id;
	if (!id) throw new Error('Failed to create ward store');
	return id;
}

async function resolveCentralStoreId(hospitalId: string): Promise<number> {
	const rows = rowsOf<{ id: number }>(
		await db.execute(sql`
			SELECT s.id
			FROM store s
			INNER JOIN hospital_branch hb ON hb.id = s.branch_id
			WHERE hb.hospital_id = ${hospitalId}::uuid
			  AND s.status_id = ${StatusEnum.ACTIVE}
			ORDER BY s.id
			LIMIT 1
		`)
	);
	const id = rows[0]?.id;
	if (!id) {
		throw new Error('No active store. Run visit-history demo seed first.');
	}
	return id;
}

async function ensureSupplier(hospitalId: string): Promise<number> {
	const rows = rowsOf<{ id: number }>(
		await db.execute(sql`
			SELECT id FROM supplier
			WHERE hospital_id = ${hospitalId}::uuid
			  AND remark = ${DOCS_INV_MARKER}
			  AND status_id = ${StatusEnum.ACTIVE}
			LIMIT 1
		`)
	);
	if (rows[0]?.id) return rows[0].id;

	const created = rowsOf<{ id: number }>(
		await db.execute(sql`
			INSERT INTO supplier (hospital_id, name, code, remark, status_id)
			VALUES (
				${hospitalId}::uuid,
				${'Docs Demo Supplier'},
				${'DOCS-SUP'},
				${DOCS_INV_MARKER},
				${StatusEnum.ACTIVE}
			)
			RETURNING id
		`)
	);
	const id = created[0]?.id;
	if (!id) throw new Error('Failed to create demo supplier');
	return id;
}

type ItemUnitRow = {
	itemId: number;
	purchaseUnitId: number;
	iumId: number;
};

async function resolveDemoItemWithUnit(hospitalId: string): Promise<ItemUnitRow> {
	const linked = rowsOf<ItemUnitRow>(
		await db.execute(sql`
			SELECT
				im.id AS "itemId",
				ium.purchase_unit_id AS "purchaseUnitId",
				ium.id AS "iumId"
			FROM item_master im
			INNER JOIN item_master_item_unit_master link
				ON link.item_master_id = im.id
				AND link.hospital_id = im.hospital_id
				AND link.deleted_at IS NULL
				AND link.is_default_yes_no = ${YesNoEnum.YES}
			INNER JOIN item_unit_master ium
				ON ium.id = link.item_unit_master_id
				AND ium.deleted_at IS NULL
			WHERE im.hospital_id = ${hospitalId}::uuid
			  AND im.status_id = ${StatusEnum.ACTIVE}
			ORDER BY im.id
			LIMIT 1
		`)
	);
	if (linked[0]?.itemId) return linked[0];

	const itemRow = rowsOf<{ id: number }>(
		await db.execute(sql`
			SELECT id FROM item_master
			WHERE hospital_id = ${hospitalId}::uuid AND status_id = ${StatusEnum.ACTIVE}
			ORDER BY id LIMIT 1
		`)
	);
	const itemId = itemRow[0]?.id;
	if (!itemId) {
		throw new Error('No item_master for hospital. Run visit-history demo seed.');
	}

	const unitRows = rowsOf<{ id: number }>(
		await db.execute(sql`
			SELECT id FROM unit WHERE status_id = ${StatusEnum.ACTIVE} ORDER BY id LIMIT 2
		`)
	);
	const purchaseUnitId = unitRows[0]?.id ?? 1;
	const issueUnitId = unitRows[1]?.id ?? purchaseUnitId;

	const iumInsert = rowsOf<{ id: number }>(
		await db.execute(sql`
			INSERT INTO item_unit_master (
				hospital_id, purchase_unit_id, purchase_conversion_factor,
				issue_unit_id, issue_conversion_factor, status_id
			)
			SELECT
				${hospitalId}::uuid,
				${purchaseUnitId},
				1,
				${issueUnitId},
				1,
				${StatusEnum.ACTIVE}
			WHERE NOT EXISTS (
				SELECT 1 FROM item_unit_master
				WHERE hospital_id = ${hospitalId}::uuid
				  AND purchase_unit_id = ${purchaseUnitId}
				  AND issue_unit_id = ${issueUnitId}
				  AND deleted_at IS NULL
			)
			RETURNING id
		`)
	);
	let iumId = iumInsert[0]?.id;
	if (!iumId) {
		const existingIum = rowsOf<{ id: number }>(
			await db.execute(sql`
				SELECT id FROM item_unit_master
				WHERE hospital_id = ${hospitalId}::uuid
				  AND purchase_unit_id = ${purchaseUnitId}
				  AND issue_unit_id = ${issueUnitId}
				  AND deleted_at IS NULL
				LIMIT 1
			`)
		);
		iumId = existingIum[0]?.id;
	}
	if (!iumId) throw new Error('Failed to ensure item_unit_master');

	await db.execute(sql`
		INSERT INTO item_master_item_unit_master (
			hospital_id, item_master_id, item_unit_master_id, is_default_yes_no
		)
		SELECT
			${hospitalId}::uuid,
			${itemId},
			${iumId},
			${YesNoEnum.YES}
		WHERE NOT EXISTS (
			SELECT 1 FROM item_master_item_unit_master
			WHERE hospital_id = ${hospitalId}::uuid
			  AND item_master_id = ${itemId}
			  AND item_unit_master_id = ${iumId}
			  AND deleted_at IS NULL
		)
	`);

	return { itemId, purchaseUnitId, iumId };
}

async function insertGrnLineWithStock(input: {
	hospitalId: string;
	userId: string;
	grnId: string;
	storeId: number;
	supplierId: number;
	itemId: number;
	unitId: number;
	batchNo: string;
	expiryDate: string;
	purchasedQty: string;
	purchasePrice: string;
}): Promise<number> {
	const lineRows = rowsOf<{ id: number }>(
		await db.execute(sql`
			INSERT INTO goods_receipt_line (
				grn_id, item_id, purchased_qty, batch_no, expiry_date,
				unit_id, purchase_price, free_qty
			) VALUES (
				${input.grnId}::uuid,
				${input.itemId},
				${input.purchasedQty},
				${input.batchNo},
				${input.expiryDate}::date,
				${input.unitId},
				${input.purchasePrice},
				0
			)
			RETURNING id
		`)
	);
	const lineId = lineRows[0]?.id;
	if (!lineId) throw new Error('GRN line insert failed');

	const batchRows = rowsOf<{ id: number }>(
		await db.execute(sql`
			INSERT INTO item_batch (
				hospital_id, item_id, batch_no, expiry_date, supplier_id,
				goods_receipt_note_id, goods_receipt_line_id
			) VALUES (
				${input.hospitalId}::uuid,
				${input.itemId},
				${input.batchNo},
				${input.expiryDate}::date,
				${input.supplierId},
				${input.grnId}::uuid,
				${lineId}
			)
			RETURNING id
		`)
	);
	const batchId = batchRows[0]?.id;
	if (!batchId) throw new Error('item_batch insert failed');

	await db.execute(sql`
		UPDATE goods_receipt_line SET batch_id = ${batchId} WHERE id = ${lineId}
	`);

	await db.execute(sql`
		INSERT INTO inv_stock (
			hospital_id, item_id, store_id, batch_id, quantity
		) VALUES (
			${input.hospitalId}::uuid,
			${input.itemId},
			${input.storeId},
			${batchId},
			${input.purchasedQty}
		)
	`);

	return batchId;
}

async function ensureReorderLowStock(
	hospitalId: string,
	storeId: number,
	itemId: number,
	iumId: number
): Promise<void> {
	await db.execute(sql`
		INSERT INTO inv_item_reorder_level (
			hospital_id, store_id, item_id, min_qty, item_unit_master_id
		)
		SELECT
			${hospitalId}::uuid,
			${storeId},
			${itemId},
			99999,
			${iumId}
		WHERE NOT EXISTS (
			SELECT 1 FROM inv_item_reorder_level
			WHERE hospital_id = ${hospitalId}::uuid
			  AND store_id = ${storeId}
			  AND item_id = ${itemId}
			  AND deleted_at IS NULL
		)
	`);
	await db.execute(sql`
		UPDATE inv_item_reorder_level
		SET min_qty = 99999, updated_at = now()
		WHERE hospital_id = ${hospitalId}::uuid
		  AND store_id = ${storeId}
		  AND item_id = ${itemId}
		  AND deleted_at IS NULL
	`);
}

async function refreshLowStockThresholdForDemoGrn(hospitalId: string): Promise<void> {
	await db.execute(sql`
		UPDATE inv_item_reorder_level irl
		SET min_qty = 99999, updated_at = now()
		FROM goods_receipt_note grn
		INNER JOIN goods_receipt_line grl ON grl.grn_id = grn.id
		WHERE grn.hospital_id = ${hospitalId}::uuid
		  AND grn.invoice_no = ${DOCS_DEMO_GRN_INVOICE}
		  AND irl.hospital_id = grn.hospital_id
		  AND irl.store_id = grn.store_id
		  AND irl.item_id = grl.item_id
		  AND irl.deleted_at IS NULL
	`);
}

export async function seedInventoryDocsDemo(): Promise<void> {
	const hospitalId = resolveHospitalId();
	if (await seedAlreadyComplete(hospitalId)) {
		await refreshLowStockThresholdForDemoGrn(hospitalId);
		seedLogger.info('Inventory docs demo seed already applied (skipping)');
		return;
	}

	const userId = await resolveSeedAdminUserId();
	const branchRow = rowsOf<{ id: string }>(
		await db.execute(sql`
			SELECT id::text AS id FROM hospital_branch
			WHERE hospital_id = ${hospitalId}::uuid AND status_id = ${StatusEnum.ACTIVE}
			ORDER BY created_at LIMIT 1
		`)
	);
	const branchId = branchRow[0]?.id;
	if (!branchId) throw new Error('No active branch for hospital');

	const centralStoreId = await resolveCentralStoreId(hospitalId);
	const wardStoreId = await ensureWardStore(branchId);
	const supplierId = await ensureSupplier(hospitalId);
	const { itemId, purchaseUnitId, iumId } = await resolveDemoItemWithUnit(hospitalId);

	const grnId = uuidV7();
	const receivedDate = isoDateOffset(0);

	await db.execute(sql`
		INSERT INTO goods_receipt_note (
			id, hospital_id, supplier_id, store_id, invoice_no,
			received_by, received_date, status_tagging_id,
			created_by, updated_by
		) VALUES (
			${grnId}::uuid,
			${hospitalId}::uuid,
			${supplierId},
			${centralStoreId},
			${DOCS_DEMO_GRN_INVOICE},
			${userId},
			${receivedDate}::date,
			${InvGrnStatusTaggingEnum.POSTED},
			${userId},
			${userId}
		)
	`);

	const okBatchId = await insertGrnLineWithStock({
		hospitalId,
		userId,
		grnId,
		storeId: centralStoreId,
		supplierId,
		itemId,
		unitId: purchaseUnitId,
		batchNo: 'DOCS-BATCH-OK',
		expiryDate: isoDateOffset(365),
		purchasedQty: '100',
		purchasePrice: '10.00'
	});

	await insertGrnLineWithStock({
		hospitalId,
		userId,
		grnId,
		storeId: centralStoreId,
		supplierId,
		itemId,
		unitId: purchaseUnitId,
		batchNo: 'DOCS-BATCH-EXP',
		expiryDate: isoDateOffset(-30),
		purchasedQty: '20',
		purchasePrice: '5.00'
	});

	await ensureReorderLowStock(hospitalId, centralStoreId, itemId, iumId);

	const issueId = uuidV7();
	await db.execute(sql`
		INSERT INTO inv_department_issue (
			id, hospital_id, issue_no, from_store_id, to_store_id,
			requested_by, status_tagging_id, current_level, remarks,
			approved_by, approved_at, issued_by, issued_at,
			created_by, updated_by
		) VALUES (
			${issueId}::uuid,
			${hospitalId}::uuid,
			${'DOCS-ISSUE-001'},
			${centralStoreId},
			${wardStoreId},
			${userId},
			${InvDepartmentIssueStatusTaggingEnum.ISSUED},
			1,
			${DOCS_INV_MARKER},
			${userId},
			now(),
			${userId},
			now(),
			${userId},
			${userId}
		)
	`);

	const issueLineRows = rowsOf<{ id: number }>(
		await db.execute(sql`
			INSERT INTO inv_department_issue_line (
				issue_id, item_id, quantity, unit_id, created_by, updated_by
			) VALUES (
				${issueId}::uuid,
				${itemId},
				5,
				${purchaseUnitId},
				${userId},
				${userId}
			)
			RETURNING id
		`)
	);
	const issueLineId = issueLineRows[0]?.id;
	if (!issueLineId) throw new Error('Department issue line insert failed');

	await db.execute(sql`
		INSERT INTO inv_department_issue_line_alloc (line_id, batch_id, quantity)
		VALUES (${issueLineId}, ${okBatchId}, 5)
	`);

	await db.execute(sql`
		INSERT INTO inv_stock (hospital_id, item_id, store_id, batch_id, quantity)
		VALUES (
			${hospitalId}::uuid,
			${itemId},
			${wardStoreId},
			${okBatchId},
			5
		)
	`);

	const consumptionId = uuidV7();
	await db.execute(sql`
		INSERT INTO inv_department_consumption (
			id, hospital_id, consumption_no, store_id, requested_by,
			status_tagging_id, current_level, remarks, created_by, updated_by
		) VALUES (
			${consumptionId}::uuid,
			${hospitalId}::uuid,
			${'DOCS-DC-001'},
			${wardStoreId},
			${userId},
			${InvDepartmentConsumptionStatusTaggingEnum.PENDING},
			1,
			${DOCS_INV_MARKER},
			${userId},
			${userId}
		)
	`);

	await db.execute(sql`
		INSERT INTO inv_department_consumption_line (
			consumption_id, item_id, quantity, unit_id, batch_id, created_by, updated_by
		) VALUES (
			${consumptionId}::uuid,
			${itemId},
			1,
			${purchaseUnitId},
			${okBatchId},
			${userId},
			${userId}
		)
	`);

	seedLogger.info(
		`Inventory docs demo seed complete (central ${centralStoreId}, ward ${wardStoreId}, item ${itemId})`
	);
}

const isDirectRun =
	import.meta.url === pathToFileURL(process.argv[1] ?? '').href ||
	process.argv[1]?.endsWith('inventory-docs-demo-seed.ts');

if (isDirectRun) {
	seedLogger.info('Starting inventory docs demo seed…');
	seedInventoryDocsDemo()
		.then(() => {
			seedLogger.info('Inventory docs demo seed finished');
			process.exit(0);
		})
		.catch((err) => {
			seedLogger.error(
				'Inventory docs demo seed failed',
				err instanceof Error ? err : new Error(String(err))
			);
			process.exit(1);
		});
}
