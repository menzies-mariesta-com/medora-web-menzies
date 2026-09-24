import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { BedTariffContext } from '$lib/model/type/medora/ipd/ipd.type';
import { and, eq } from 'drizzle-orm';

function money(value: string | number | null | undefined): string {
	const n = Number(value ?? 0);
	if (!Number.isFinite(n)) return '0.00';
	return n.toFixed(2);
}

function sumMoney(...parts: Array<string | number | null | undefined>): string {
	const total = parts.reduce<number>(
		(acc, p) => acc + Number(p ?? 0),
		0
	);
	return money(total);
}

/**
 * Daily tariff from bed base with sequential % markups:
 * base × (1 + roomMarkup%/100) × (1 + wardMarkup%/100)
 */
export function computeDailyTariff(input: {
	bedBasePrice: string | number | null | undefined;
	roomMarkupPercent: string | number | null | undefined;
	wardMarkupPercent: string | number | null | undefined;
}): string {
	const base = Number(input.bedBasePrice ?? 0);
	const roomPct = Number(input.roomMarkupPercent ?? 0);
	const wardPct = Number(input.wardMarkupPercent ?? 0);
	if (!Number.isFinite(base) || base < 0) return money(0);
	const roomFactor =
		Number.isFinite(roomPct) && roomPct !== 0 ? 1 + roomPct / 100 : 1;
	const wardFactor =
		Number.isFinite(wardPct) && wardPct !== 0 ? 1 + wardPct / 100 : 1;
	return money(base * roomFactor * wardFactor);
}

/** Resolve bed → room → ward and compute daily tariff with % markups. */
export async function resolveBedTariffContext(input: {
	hospitalId: string;
	bedId: number;
}): Promise<BedTariffContext> {
	const [row] = await ensureDb()
		.select({
			bedId: table.bedTable.id,
			bedName: table.bedTable.name,
			bedBasePrice: table.bedTable.basePrice,
			bedStatusId: table.bedTable.statusId,
			roomId: table.roomTable.id,
			roomName: table.roomTable.name,
			roomMarkup: table.roomCategoryTable.roomMarkup,
			roomStatusId: table.roomTable.statusId,
			wardId: table.wardTable.id,
			wardName: table.wardTable.name,
			wardMarkup: table.wardCategoryTable.wardMarkup,
			wardStatusId: table.wardTable.statusId,
			wardCategoryStatusId: table.wardCategoryTable.statusId,
			roomCategoryStatusId: table.roomCategoryTable.statusId,
			branchId: table.wardTable.branchId
		})
		.from(table.bedTable)
		.innerJoin(
			table.roomTable,
			eq(table.bedTable.roomId, table.roomTable.id)
		)
		.innerJoin(
			table.roomCategoryTable,
			eq(
				table.roomTable.roomCategoryId,
				table.roomCategoryTable.id
			)
		)
		.innerJoin(
			table.wardTable,
			eq(table.roomTable.wardId, table.wardTable.id)
		)
		.innerJoin(
			table.wardCategoryTable,
			eq(table.wardTable.wardCategoryId, table.wardCategoryTable.id)
		)
		.where(
			and(
				eq(table.bedTable.id, input.bedId),
				eq(table.bedTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);

	if (!row) throw error(400, 'Bed not found');
	if (row.bedStatusId !== StatusEnum.ACTIVE) {
		throw error(400, 'Bed is not active');
	}
	if (row.roomStatusId !== StatusEnum.ACTIVE) {
		throw error(400, 'Room is not active');
	}
	if (row.roomCategoryStatusId !== StatusEnum.ACTIVE) {
		throw error(400, 'Room category is not active');
	}
	if (row.wardStatusId !== StatusEnum.ACTIVE) {
		throw error(400, 'Ward is not active');
	}
	if (row.wardCategoryStatusId !== StatusEnum.ACTIVE) {
		throw error(400, 'Ward category is not active');
	}

	const bedBasePrice = money(row.bedBasePrice);
	const roomMarkup = money(row.roomMarkup);
	const wardMarkup = money(row.wardMarkup);

	return {
		bedId: row.bedId,
		roomId: row.roomId,
		wardId: row.wardId,
		branchId: row.branchId,
		bedName: row.bedName,
		roomName: row.roomName,
		wardName: row.wardName,
		bedBasePrice,
		roomMarkup,
		wardMarkup,
		dailyTariff: computeDailyTariff({
			bedBasePrice,
			roomMarkupPercent: roomMarkup,
			wardMarkupPercent: wardMarkup
		})
	};
}

export { money, sumMoney };
