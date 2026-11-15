import { eq, lt } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import { trialOtpTable } from '$lib/server/db/table/plan-table/plan-table';
import { toUtcIsoString } from '$lib/util/utc-instant.util';

const TTL_MS = 10 * 60 * 1000;

async function purgeExpiredOtps(): Promise<void> {
	const now = toUtcIsoString();
	await ensureDb()
		.delete(trialOtpTable)
		.where(lt(trialOtpTable.expiresAt, now));
}

export async function issueTrialOtp(email: string): Promise<string> {
	const code = String(Math.floor(100_000 + Math.random() * 900_000));
	const expires = toUtcIsoString(Date.now() + TTL_MS);
	const normalized = email.trim().toLowerCase();
	void purgeExpiredOtps();
	await ensureDb()
		.insert(trialOtpTable)
		.values({ email: normalized, code, expiresAt: expires })
		.onConflictDoUpdate({
			target: trialOtpTable.email,
			set: { code, expiresAt: expires }
		});
	return code;
}

export async function verifyTrialOtp(
	email: string,
	code: string
): Promise<boolean> {
	const normalized = email.trim().toLowerCase();
	const [entry] = await ensureDb()
		.select()
		.from(trialOtpTable)
		.where(eq(trialOtpTable.email, normalized))
		.limit(1);
	if (!entry) return false;
	if (Date.now() > Date.parse(entry.expiresAt)) return false;
	const norm = (s: string) => s.replace(/\D/g, '');
	if (norm(entry.code) !== norm(code)) return false;
	await ensureDb()
		.delete(trialOtpTable)
		.where(eq(trialOtpTable.email, normalized));
	return true;
}

export async function hasTrialOtp(email: string): Promise<boolean> {
	const normalized = email.trim().toLowerCase();
	const [entry] = await ensureDb()
		.select({ expiresAt: trialOtpTable.expiresAt })
		.from(trialOtpTable)
		.where(eq(trialOtpTable.email, normalized))
		.limit(1);
	if (!entry) return false;
	return Date.now() <= Date.parse(entry.expiresAt);
}
