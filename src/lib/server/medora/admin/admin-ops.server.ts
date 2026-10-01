import { type RequestEvent } from '@sveltejs/kit';
import { and, count, desc, eq, gt, gte, sql } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { AdminPageKeyEnum, RoleEnum } from '$lib/model/enum/db-link';
import type {
	AdminOpsActivityItem,
	AdminOpsDbHealth,
	AdminOpsPayload,
	AdminOpsUsage
} from '$lib/model/type/medora/admin-ops.type';
import { requireAdminPagePermission } from './admin-permission.server';

async function assertMonitoringView(event: RequestEvent) {
	await requireAdminPagePermission(
		event,
		AdminPageKeyEnum.MONITORING,
		'view'
	);
}

function rowsOf<T>(result: unknown): T[] {
	if (Array.isArray(result)) return result as T[];
	if (
		result &&
		typeof result === 'object' &&
		Array.isArray((result as { rows?: unknown }).rows)
	) {
		return (result as { rows: T[] }).rows;
	}
	return [];
}

function toIso(value: string | Date | null | undefined): string {
	if (!value) return new Date().toISOString();
	if (value instanceof Date) return value.toISOString();
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

async function getUsage(db: ReturnType<typeof ensureDb>): Promise<AdminOpsUsage> {
	const now = new Date();
	const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
	const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
	const nowIso = now.toISOString();

	const [
		activeSessionsRow,
		sessions24hRow,
		owners7dRow,
		hospitals7dRow,
		staff7dRow,
		twoFactorRow
	] = await Promise.all([
		db
			.select({ count: count() })
			.from(table.sessionTable)
			.where(gt(table.sessionTable.expiresAt, nowIso)),
		db
			.select({ count: count() })
			.from(table.sessionTable)
			.where(gte(table.sessionTable.createdAt, dayAgo)),
		db
			.select({ count: count() })
			.from(table.userTable)
			.where(
				and(
					eq(table.userTable.roleId, RoleEnum.OWNER),
					gte(table.userTable.createdAt, weekAgo)
				)
			),
		db
			.select({ count: count() })
			.from(table.hospitalTable)
			.where(gte(table.hospitalTable.createdAt, weekAgo)),
		db
			.select({ count: count() })
			.from(table.userTable)
			.where(
				and(
					eq(table.userTable.roleId, RoleEnum.STAFF),
					gte(table.userTable.createdAt, weekAgo)
				)
			),
		db
			.select({ count: count() })
			.from(table.userTable)
			.where(eq(table.userTable.twoFactorEnabled, true))
	]);

	return {
		activeSessions: Number(activeSessionsRow[0]?.count ?? 0),
		sessionsCreatedLast24h: Number(sessions24hRow[0]?.count ?? 0),
		ownersCreatedLast7d: Number(owners7dRow[0]?.count ?? 0),
		hospitalsCreatedLast7d: Number(hospitals7dRow[0]?.count ?? 0),
		staffCreatedLast7d: Number(staff7dRow[0]?.count ?? 0),
		twoFactorEnabledUsers: Number(twoFactorRow[0]?.count ?? 0)
	};
}

async function getActivity(
	db: ReturnType<typeof ensureDb>,
	limit = 20
): Promise<AdminOpsActivityItem[]> {
	const [logins, owners, hospitals, staff] = await Promise.all([
		db
			.select({
				id: table.sessionTable.id,
				title: table.userTable.name,
				subtitle: table.userTable.email,
				occurredAt: table.sessionTable.createdAt
			})
			.from(table.sessionTable)
			.innerJoin(
				table.userTable,
				eq(table.sessionTable.userId, table.userTable.id)
			)
			.orderBy(desc(table.sessionTable.createdAt))
			.limit(limit),
		db
			.select({
				id: table.userTable.id,
				title: table.userTable.name,
				subtitle: table.userTable.email,
				occurredAt: table.userTable.createdAt
			})
			.from(table.userTable)
			.where(eq(table.userTable.roleId, RoleEnum.OWNER))
			.orderBy(desc(table.userTable.createdAt))
			.limit(limit),
		db
			.select({
				id: table.hospitalTable.id,
				title: table.hospitalTable.name,
				subtitle: table.hospitalTable.code,
				occurredAt: table.hospitalTable.createdAt
			})
			.from(table.hospitalTable)
			.orderBy(desc(table.hospitalTable.createdAt))
			.limit(limit),
		db
			.select({
				id: table.userTable.id,
				title: table.userTable.name,
				subtitle: table.userTable.email,
				occurredAt: table.userTable.createdAt
			})
			.from(table.userTable)
			.where(eq(table.userTable.roleId, RoleEnum.STAFF))
			.orderBy(desc(table.userTable.createdAt))
			.limit(limit)
	]);

	const items: AdminOpsActivityItem[] = [
		...logins.map((row) => ({
			id: `login:${row.id}`,
			kind: 'login' as const,
			title: row.title || row.subtitle || 'User',
			subtitle: row.subtitle,
			occurredAt: toIso(row.occurredAt)
		})),
		...owners.map((row) => ({
			id: `owner:${row.id}`,
			kind: 'owner_created' as const,
			title: row.title || row.subtitle || 'Owner',
			subtitle: row.subtitle,
			occurredAt: toIso(row.occurredAt)
		})),
		...hospitals.map((row) => ({
			id: `hospital:${row.id}`,
			kind: 'hospital_created' as const,
			title: row.title || row.subtitle || 'Hospital',
			subtitle: row.subtitle,
			occurredAt: toIso(row.occurredAt)
		})),
		...staff.map((row) => ({
			id: `staff:${row.id}`,
			kind: 'staff_created' as const,
			title: row.title || row.subtitle || 'Staff',
			subtitle: row.subtitle,
			occurredAt: toIso(row.occurredAt)
		}))
	];

	items.sort(
		(a, b) =>
			new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
	);

	return items.slice(0, limit);
}

async function getDbHealth(
	db: ReturnType<typeof ensureDb>
): Promise<AdminOpsDbHealth> {
	const notes: string[] = [
		'size_from_pg',
		'quota_via_neon',
		'live_counts'
	];
	const checkedAt = new Date().toISOString();

	const started = performance.now();
	try {
		await db.execute(sql`SELECT 1`);
	} catch {
		return {
			connectionOk: false,
			latencyMs: Math.round(performance.now() - started),
			databaseName: null,
			sizeBytes: null,
			sizePretty: null,
			storageQuotaBytes: null,
			activeConnections: null,
			maxConnections: null,
			tableCounts: [],
			checkedAt,
			notes: [...notes, 'connection_failed']
		};
	}
	const latencyMs = Math.round(performance.now() - started);

	const sizeRows = rowsOf<{
		database_name: string;
		size_bytes: string | number;
		size_pretty: string;
	}>(
		await db.execute(sql`
			SELECT
				current_database() AS database_name,
				pg_database_size(current_database()) AS size_bytes,
				pg_size_pretty(pg_database_size(current_database())) AS size_pretty
		`)
	);
	const size = sizeRows[0];

	const connRows = rowsOf<{
		active_connections: string | number;
		max_connections: string | number;
	}>(
		await db.execute(sql`
			SELECT
				(
					SELECT count(*)::int
					FROM pg_stat_activity
					WHERE datname = current_database()
				) AS active_connections,
				(
					SELECT setting::int
					FROM pg_settings
					WHERE name = 'max_connections'
				) AS max_connections
		`)
	);
	const conn = connRows[0];

	const [usersRow, sessionsRow, hospitalsRow, staffRow] = await Promise.all([
		db.select({ count: count() }).from(table.userTable),
		db.select({ count: count() }).from(table.sessionTable),
		db.select({ count: count() }).from(table.hospitalTable),
		db.select({ count: count() }).from(table.staffTable)
	]);

	return {
		connectionOk: true,
		latencyMs,
		databaseName: size?.database_name ?? null,
		sizeBytes:
			size?.size_bytes != null ? Number(size.size_bytes) : null,
		sizePretty: size?.size_pretty ?? null,
		storageQuotaBytes: null,
		activeConnections:
			conn?.active_connections != null
				? Number(conn.active_connections)
				: null,
		maxConnections:
			conn?.max_connections != null ? Number(conn.max_connections) : null,
		tableCounts: [
			{ name: 'user', rows: Number(usersRow[0]?.count ?? 0) },
			{ name: 'session', rows: Number(sessionsRow[0]?.count ?? 0) },
			{ name: 'hospital', rows: Number(hospitalsRow[0]?.count ?? 0) },
			{ name: 'staff', rows: Number(staffRow[0]?.count ?? 0) }
		],
		checkedAt,
		notes
	};
}

export async function getAdminOps(
	event: RequestEvent
): Promise<AdminOpsPayload> {
	await assertMonitoringView(event);
	const db = ensureDb();

	const [activity, usage, dbHealth] = await Promise.all([
		getActivity(db),
		getUsage(db),
		getDbHealth(db)
	]);

	return {
		activity,
		usage,
		db: dbHealth
	};
}
