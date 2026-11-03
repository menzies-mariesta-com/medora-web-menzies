import { drizzle } from 'drizzle-orm/neon-serverless';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { AsyncLocalStorage } from 'node:async_hooks';
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
// Audit columns (created_by, updated_by, deleted_by): use ensureDb() or the
// exported `db` proxy for all request-time writes. Transaction callbacks are
// audited. Seeds/scripts use ensureDbUnaudited() or set columns explicitly.
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

/** Request-scoped user id for audit columns (fallback when `getRequestEvent()` is unavailable). */
const requestAuditUserStorage = new AsyncLocalStorage<string | null>();

/**
 * Run the rest of a SvelteKit request with a fixed audit user id for all DB writes.
 * Called from `hooks.server.ts` after `event.locals.user` is populated.
 */
export function runWithRequestAuditUser<T>(
	userId: string | null,
	fn: () => T
): T {
	return requestAuditUserStorage.run(userId, fn);
}

function getAuditedDbInstance(): DbInstance {
	if (!dbInternal) {
		throw new Error('DATABASE_URL is not set');
	}
	return withAudit(dbInternal, getRequestUserId());
}

/** Better Auth adapter + legacy imports; writes use the same audit injection as `ensureDb()`. */
export const db: DbInstance | null = dbInternal
	? (new Proxy({} as DbInstance, {
			get(_target, prop) {
				const audited = getAuditedDbInstance();
				const value = Reflect.get(audited as object, prop, audited);
				return typeof value === 'function' ? value.bind(audited) : value;
			}
		}) as DbInstance)
	: null;

type TableLike = Record<string, unknown>;
type RowLike = Record<string, unknown>;

function isObject(value: unknown): value is RowLike {
	return typeof value === 'object' && value !== null;
}

function hasColumn(tableDef: unknown, key: string): boolean {
	return isObject(tableDef) && key in tableDef;
}

function getRequestUserId(): string | null {
	const fromStore = requestAuditUserStorage.getStore();
	if (fromStore !== undefined) return fromStore;
	try {
		return getRequestEvent()?.locals?.user?.id ?? null;
	} catch {
		return null;
	}
}

/** Current session user for created_by / updated_by / deleted_by injection. */
export function getRequestAuditUserId(): string | null {
	return getRequestUserId();
}

/** Apply insert audit columns when missing (works with audited or raw db/tx). */
export function withRowInsertAudit<T extends RowLike>(
	tableDef: unknown,
	row: T,
	userId?: string | null
): T {
	const uid = userId ?? getRequestUserId();
	return addInsertAudit(tableDef, row, uid) as T;
}

/** Apply update audit columns when missing (raw `.set()` or upsert conflict target). */
export function withRowUpdateAudit<T extends RowLike>(
	tableDef: unknown,
	row: T,
	userId?: string | null
): T {
	const uid = userId ?? getRequestUserId();
	return addUpdateAudit(tableDef, row, uid) as T;
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

function wrapInsertBuilder(
	tableDef: TableLike,
	builder: object,
	userId: string | null
): object {
	return new Proxy(builder, {
		get(builderTarget, builderProp, builderReceiver) {
			if (builderProp === 'values') {
				return (values: unknown) => {
					const next = (
						builderTarget as {
							values: (v: unknown) => object;
						}
					).values(addInsertAudit(tableDef, values, userId));
					return wrapInsertBuilder(tableDef, next, userId);
				};
			}
			if (builderProp === 'onConflictDoUpdate') {
				return (config: unknown) => {
					if (!isObject(config) || config.set == null) {
						return (
							builderTarget as {
								onConflictDoUpdate: (c: unknown) => unknown;
							}
						).onConflictDoUpdate(config);
					}
					const next = (
						builderTarget as {
							onConflictDoUpdate: (c: unknown) => object;
						}
					).onConflictDoUpdate({
						...config,
						set: addUpdateAudit(tableDef, config.set, userId)
					});
					return typeof next === 'object' && next !== null
						? wrapInsertBuilder(tableDef, next, userId)
						: next;
				};
			}
			return Reflect.get(builderTarget, builderProp, builderReceiver);
		}
	});
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
					return wrapInsertBuilder(tableDef, builder as object, userId);
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

			if (prop === 'transaction') {
				const boundTransaction = (
					target as DbInstance
				).transaction.bind(target);
				return (arg1: unknown, arg2?: unknown) => {
					const wrapCallback = (
						callback: (tx: DbInstance) => unknown
					) => {
						return async (tx: DbInstance) => {
							const auditedTx = withAudit(tx, userId);
							return callback(auditedTx);
						};
					};
					if (typeof arg1 === 'function') {
						return boundTransaction(wrapCallback(arg1 as never));
					}
					if (typeof arg2 === 'function') {
						return boundTransaction(
							arg1 as never,
							wrapCallback(arg2 as never)
						);
					}
					return boundTransaction(arg1 as never, arg2 as never);
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

/**
 * Same pool/schema as {@link ensureDb}, but without request-user audit column injection.
 * Use for rare retries when the session user id is missing from `"user"` (e.g. after a DB wipe).
 */
export function ensureDbUnaudited(): DbInstance {
	if (!url || !dbInternal) {
		throw new Error('DATABASE_URL is not set');
	}
	return dbInternal;
}
