import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import { and, eq } from 'drizzle-orm';
import { parseTimelineDurationDays } from '$lib/util/timeline-duration-days.util';

export {
	DEFAULT_TIMELINE_DURATION_DAYS,
	DEFAULT_TIMELINE_UNIT_LABEL,
	parseTimelineDurationDays
} from '$lib/util/timeline-duration-days.util';

export type TimelineUnitMeta = {
	id: number | null;
	name: string;
	durationDays: number;
};

export async function getTimelineUnitMeta(
	unitId: number | null | undefined
): Promise<TimelineUnitMeta> {
	if (unitId == null) {
		return {
			id: null,
			name: DEFAULT_TIMELINE_UNIT_LABEL,
			durationDays: DEFAULT_TIMELINE_DURATION_DAYS
		};
	}
	const [row] = await ensureDb()
		.select({
			id: table.unitTable.id,
			name: table.unitTable.name,
			timelineDurationDays: table.unitTable.timelineDurationDays,
			isTimeline: table.unitTypeTable.isTimeline
		})
		.from(table.unitTable)
		.innerJoin(
			table.unitTypeTable,
			eq(table.unitTable.unitTypeId, table.unitTypeTable.id)
		)
		.where(
			and(
				eq(table.unitTable.id, unitId),
				eq(table.unitTable.statusId, StatusEnum.ACTIVE),
				eq(table.unitTypeTable.statusId, StatusEnum.ACTIVE),
				eq(table.unitTypeTable.isTimeline, true)
			)
		)
		.limit(1);
	if (!row) {
		throw error(400, 'Billing unit must be an active Timeline unit from Unit Master');
	}
	const durationDays =
		parseTimelineDurationDays(row.timelineDurationDays) ??
		DEFAULT_TIMELINE_DURATION_DAYS;
	const name = row.name?.trim() || DEFAULT_TIMELINE_UNIT_LABEL;
	return { id: row.id, name, durationDays };
}

export async function assertActiveTimelineUnitId(
	unitId: number | null | undefined
): Promise<number | null> {
	if (unitId == null) return null;
	if (!Number.isFinite(unitId) || unitId <= 0) {
		throw error(400, 'Invalid billing unit');
	}
	await getTimelineUnitMeta(unitId);
	return unitId;
}

export async function isUnitTypeTimeline(
	unitTypeId: number | null | undefined
): Promise<boolean> {
	if (unitTypeId == null || !Number.isFinite(unitTypeId)) return false;
	const [row] = await ensureDb()
		.select({ isTimeline: table.unitTypeTable.isTimeline })
		.from(table.unitTypeTable)
		.where(
			and(
				eq(table.unitTypeTable.id, unitTypeId),
				eq(table.unitTypeTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.limit(1);
	return Boolean(row?.isTimeline);
}
