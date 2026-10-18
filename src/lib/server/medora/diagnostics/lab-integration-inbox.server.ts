import { and, count, desc, eq, ne } from 'drizzle-orm';
import { LabIntegrationParseStatusEnum } from '$lib/model/enum/diagnostics.enum';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { LabIntegrationHealthRow } from '$lib/model/type/medora/diagnostics.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function getIntegrationHealth(
	hospitalId: string
): Promise<LabIntegrationHealthRow> {
	const db = ensureDb();
	const base = and(
		eq(table.labIntegrationMessageTable.hospitalId, hospitalId),
		ne(table.labIntegrationMessageTable.statusId, StatusEnum.DELETED)
	);

	const [[pending], [errors], [last]] = await Promise.all([
		db
			.select({ c: count() })
			.from(table.labIntegrationMessageTable)
			.where(
				and(
					base,
					eq(
						table.labIntegrationMessageTable.parseStatus,
						LabIntegrationParseStatusEnum.PENDING
					)
				)
			),
		db
			.select({ c: count() })
			.from(table.labIntegrationMessageTable)
			.where(
				and(
					base,
					eq(
						table.labIntegrationMessageTable.parseStatus,
						LabIntegrationParseStatusEnum.ERROR
					)
				)
			),
		db
			.select({ createdAt: table.labIntegrationMessageTable.createdAt })
			.from(table.labIntegrationMessageTable)
			.where(base)
			.orderBy(desc(table.labIntegrationMessageTable.createdAt))
			.limit(1)
	]);

	return {
		pendingCount: pending?.c ?? 0,
		errorCount: errors?.c ?? 0,
		lastReceivedAt: last?.createdAt ?? null
	};
}

export async function enqueueIntegrationMessage(input: {
	hospitalId: string;
	direction: 'inbound' | 'outbound';
	rawPayload: string;
	protocol?: string;
}) {
	const [row] = await ensureDb()
		.insert(table.labIntegrationMessageTable)
		.values({
			hospitalId: input.hospitalId,
			direction: input.direction,
			rawPayload: input.rawPayload,
			protocol: input.protocol ?? 'hl7_v2',
			parseStatus: LabIntegrationParseStatusEnum.PENDING
		})
		.returning();
	return row;
}

export async function listRecentIntegrationMessages(input: {
	hospitalId: string;
	limit?: number;
}) {
	return ensureDb()
		.select()
		.from(table.labIntegrationMessageTable)
		.where(
			and(
				eq(table.labIntegrationMessageTable.hospitalId, input.hospitalId),
				ne(table.labIntegrationMessageTable.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(desc(table.labIntegrationMessageTable.createdAt))
		.limit(input.limit ?? 20);
}
