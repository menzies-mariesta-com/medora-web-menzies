import { drizzle } from 'drizzle-orm/neon-serverless';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { StatusEnum } from '$lib/model/enum/db-link';
import { dbLogger } from '$lib/logger';

const url = env.DATABASE_URL;

// During build (Docker / Vite), DATABASE_URL may be unset; don't hard‑fail there.
// We only enforce it when the DB is actually used.
if (!url && env.NODE_ENV === 'production') {
	dbLogger.warn('DATABASE_URL is not set');
}

// ensureDb() returns this singleton every time — no new Pool per call.
// Use Neon's pooler host (`-pooler`) in DATABASE_URL when possible.
//
// `neon()` + drizzle/neon-http does not support interactive transactions; staff registration
// and other code uses `ensureDb().transaction()`. Pool + drizzle/neon-serverless uses
// WebSockets (node-postgres-compatible) and supports transactions.
neonConfig.webSocketConstructor = ws;

/** Db instance type including schema so that e.g. ensureDb().query.pageTable is typed. */
type DbInstance = ReturnType<typeof drizzle<typeof schema>>;
let pool: Pool | null = null;
let dbInternal: DbInstance | null = null;

if (url) {
	pool = new Pool({ connectionString: url });
	pool.on('error', (err: unknown) => {
		dbLogger.error(
			'Unexpected error on idle Neon pool client',
			err instanceof Error ? err : new Error(String(err))
		);
	});
	dbInternal = drizzle(pool, { schema }) as DbInstance;
}

// Exported for existing imports: `import { db } from '$lib/server/db';`
export const db = dbInternal;

type TableLike = Record<string, unknown>;
type RowLike = Record<string, unknown>;

function isObject(value: unknown): value is RowLike {
	return typeof value === 'object' && value !== null;
}

function hasColumn(tableDef: unknown, key: string): boolean {
	return isObject(tableDef) && key in tableDef;
}

function getRequestUserId(): string | null {
	try {
		return getRequestEvent()?.locals?.user?.id ?? null;
	} catch {
		return null;
	}
}

function addInsertAudit(
	tableDef: unknown,
	values: unknown,
	userId: string | null
): unknown {
	const patchRow = (row: unknown): unknown => {
		if (!isObject(row)) return row;
		const next: RowLike = { ...row };
		if (
			userId &&
			hasColumn(tableDef, 'createdBy') &&
			next.createdBy == null
		) {
			next.createdBy = userId;
		}
		if (
			userId &&
			hasColumn(tableDef, 'updatedBy') &&
			next.updatedBy == null
		) {
			next.updatedBy = userId;
		}
		const shouldMarkDeleted =
			next.deletedBy != null || next.statusId === StatusEnum.DELETED;
		if (
			userId &&
			hasColumn(tableDef, 'deletedBy') &&
			next.deletedBy == null &&
			shouldMarkDeleted
		) {
			next.deletedBy = userId;
		}
		if (
			hasColumn(tableDef, 'deletedAt') &&
			next.deletedAt == null &&
			shouldMarkDeleted
		) {
			next.deletedAt = new Date().toISOString();
		}
		return next;
	};
	return Array.isArray(values)
		? values.map(patchRow)
		: patchRow(values);
}

function addUpdateAudit(
	tableDef: unknown,
	setValues: unknown,
	userId: string | null
): unknown {
	if (!isObject(setValues)) return setValues;
	const next: RowLike = { ...setValues };
	if (
		userId &&
		hasColumn(tableDef, 'updatedBy') &&
		next.updatedBy == null
	) {
		next.updatedBy = userId;
	}
	const isSoftDelete =
		next.statusId === StatusEnum.DELETED || next.deletedBy != null;
	if (
		userId &&
		hasColumn(tableDef, 'deletedBy') &&
		next.deletedBy == null &&
		isSoftDelete
	) {
		next.deletedBy = userId;
	}
	if (
		hasColumn(tableDef, 'deletedAt') &&
		next.deletedAt == null &&
		isSoftDelete
	) {
		next.deletedAt = new Date().toISOString();
	}
	return next;
}

function buildSoftDeleteSet(
	tableDef: unknown,
	userId: string | null
): RowLike {
	const supportsSoftDelete =
		hasColumn(tableDef, 'statusId') ||
		hasColumn(tableDef, 'deletedAt') ||
		hasColumn(tableDef, 'deletedBy');
	if (!supportsSoftDelete) {
		return {};
	}

	const setValues: RowLike = {};
	if (hasColumn(tableDef, 'statusId')) {
		setValues.statusId = StatusEnum.DELETED;
	}
	if (hasColumn(tableDef, 'deletedAt')) {
		setValues.deletedAt = new Date().toISOString();
	}
	if (userId && hasColumn(tableDef, 'deletedBy')) {
		setValues.deletedBy = userId;
	}
	if (userId && hasColumn(tableDef, 'updatedBy')) {
		setValues.updatedBy = userId;
	}
	return setValues;
}

function withAudit(
	dbInstance: DbInstance,
	userId: string | null
): DbInstance {
	return new Proxy(dbInstance as object, {
		get(target, prop, receiver) {
			if (prop === 'insert') {
				return (tableDef: TableLike) => {
					const builder = (target as DbInstance).insert(
						tableDef as never
					);
					return new Proxy(builder as object, {
						get(builderTarget, builderProp, builderReceiver) {
							if (builderProp === 'values') {
								return (values: unknown) =>
									(
										builderTarget as {
											values: (v: unknown) => unknown;
										}
									).values(addInsertAudit(tableDef, values, userId));
							}
							return Reflect.get(
								builderTarget,
								builderProp,
								builderReceiver
							);
						}
					});
				};
			}

			if (prop === 'update') {
				return (tableDef: TableLike) => {
					const builder = (target as DbInstance).update(
						tableDef as never
					);
					return new Proxy(builder as object, {
						get(builderTarget, builderProp, builderReceiver) {
							if (builderProp === 'set') {
								return (setValues: unknown) =>
									(
										builderTarget as { set: (v: unknown) => unknown }
									).set(addUpdateAudit(tableDef, setValues, userId));
							}
							return Reflect.get(
								builderTarget,
								builderProp,
								builderReceiver
							);
						}
					});
				};
			}

			if (prop === 'delete') {
				return (tableDef: TableLike) => {
					const hardDeleteBuilder = (target as DbInstance).delete(
						tableDef as never
					);
					const softDeleteSet = buildSoftDeleteSet(tableDef, userId);
					if (Object.keys(softDeleteSet).length === 0) {
						return hardDeleteBuilder;
					}

					const softUpdateBuilder = (target as DbInstance)
						.update(tableDef as never)
						.set(softDeleteSet as never);

					return new Proxy(hardDeleteBuilder as object, {
						get(builderTarget, builderProp, builderReceiver) {
							if (builderProp === 'where') {
								return (whereExpr: unknown) =>
									(
										softUpdateBuilder as {
											where: (v: unknown) => unknown;
										}
									).where(whereExpr);
							}
							if (builderProp === 'returning') {
								return (...args: unknown[]) =>
									(
										softUpdateBuilder as {
											returning: (...v: unknown[]) => unknown;
										}
									).returning(...args);
							}
							return Reflect.get(
								builderTarget,
								builderProp,
								builderReceiver
							);
						}
					});
				};
			}

			const value = Reflect.get(target, prop, receiver);
			return typeof value === 'function' ? value.bind(target) : value;
		}
	}) as DbInstance;
}

/** Returns the shared db instance. No connection is created per call (singleton). */
export function ensureDb(): DbInstance {
	if (!url || !dbInternal) {
		throw new Error('DATABASE_URL is not set');
	}
	const userId = getRequestUserId();
	return withAudit(dbInternal, userId);
}
