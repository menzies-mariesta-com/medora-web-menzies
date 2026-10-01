/** SYSTEM_ADMIN ops rail payload (activity, usage, DB health). */

export type AdminOpsActivityKind =
	| 'login'
	| 'owner_created'
	| 'hospital_created'
	| 'staff_created';

export type AdminOpsActivityItem = {
	id: string;
	kind: AdminOpsActivityKind;
	/** Primary label (user name, hospital name, etc.). */
	title: string;
	/** Optional secondary line (email, code). */
	subtitle: string | null;
	occurredAt: string;
};

export type AdminOpsUsage = {
	activeSessions: number;
	sessionsCreatedLast24h: number;
	ownersCreatedLast7d: number;
	hospitalsCreatedLast7d: number;
	staffCreatedLast7d: number;
	twoFactorEnabledUsers: number;
};

export type AdminOpsDbTableCount = {
	name: string;
	rows: number;
};

export type AdminOpsDbHealth = {
	/** SELECT 1 succeeded. */
	connectionOk: boolean;
	/** Round-trip latency for the health probe (ms). */
	latencyMs: number | null;
	databaseName: string | null;
	/** From pg_database_size(current_database()). */
	sizeBytes: number | null;
	sizePretty: string | null;
	/**
	 * Neon / plan storage quota is not exposed via SQL.
	 * Always null unless a future Neon API integration fills it.
	 */
	storageQuotaBytes: number | null;
	activeConnections: number | null;
	maxConnections: number | null;
	tableCounts: AdminOpsDbTableCount[];
	checkedAt: string;
	/** Machine keys for UI i18n (admin_ops_db_note_*). */
	notes: string[];
};

export type AdminOpsPayload = {
	activity: AdminOpsActivityItem[];
	usage: AdminOpsUsage;
	db: AdminOpsDbHealth;
};
