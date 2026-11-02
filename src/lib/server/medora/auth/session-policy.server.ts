import { AppEnum } from '$lib/model/enum/app.enum';

export function computeExtendedSessionExpiry(input: {
	currentExpiresAt: string | Date | null | undefined;
	nowMs?: number;
}): string {
	const nowMs = input.nowMs ?? Date.now();
	const currentMs = input.currentExpiresAt
		? new Date(input.currentExpiresAt).getTime()
		: Number.NaN;
	const baseMs = Number.isNaN(currentMs)
		? nowMs
		: Math.max(currentMs, nowMs);
	const bumpedMs =
		baseMs + AppEnum.SESSION_EXTEND_BUMP_SECONDS * 1000;
	const capMs = nowMs + AppEnum.MAX_SESSION_SECONDS * 1000;
	const nextMs = Math.min(bumpedMs, capMs);
	return new Date(nextMs).toISOString();
}

export function cookieMaxAgeSecondsForExpiry(
	expiresAt: string | Date,
	nowMs = Date.now()
): number {
	const expMs = new Date(expiresAt).getTime();
	if (Number.isNaN(expMs)) return AppEnum.MAX_SESSION_SECONDS;
	return Math.max(60, Math.ceil((expMs - nowMs) / 1000));
}
