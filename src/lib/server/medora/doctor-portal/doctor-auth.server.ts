import { and, eq, ne } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';
import { auth } from '$lib/auth/server';
import { ensureDb } from '$lib/server/db';
import {
	accountTable,
	sessionTable,
	userTable
} from '$lib/server/db/table/auth-table/auth-table';
import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
import { PasswordHashUtil } from '$lib/server/auth/password-hash.server';
import { getStaffByUserIdWithRelations } from '$lib/server/medora/administration/staff.server';
import {
	DOCTOR_STAFF_TYPE_IDS,
	doctorHospitals,
	type DoctorPortalContext,
	type DoctorStaffRow
} from './doctor-context.server';
import { buildDoctorProfile } from './doctor-profile.server';

const passwordHashUtil = new PasswordHashUtil();
const TWO_FACTOR_COOKIE = 'two_factor';
const TRUST_DEVICE_COOKIE = 'trust_device';

type AuthResponseBody = {
	token?: string;
	user?: { id?: string; email?: string | null };
	twoFactorRedirect?: boolean;
	message?: string;
};

type SetCookieInfo = {
	name: string;
	value: string;
	expired: boolean;
};

export class DoctorAuthError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'DoctorAuthError';
	}
}

export type DoctorSessionResult = Record<string, unknown> & {
	token: string;
	twoFactorRequired?: false;
	trustDeviceCookie?: string;
	clearTrustDeviceCookie?: boolean;
};

export type DoctorSignInResult =
	| {
			twoFactorRequired: true;
			twoFactorCookie: string;
			email: string;
			clearTrustDeviceCookie?: boolean;
	  }
	| DoctorSessionResult;

function configuredAuthOrigin(): string {
	const raw =
		env.BETTER_AUTH_BASE_URL ||
		env.BETTER_AUTH_URL ||
		'http://localhost:4002';
	try {
		return new URL(raw).origin;
	} catch {
		return 'http://localhost:4002';
	}
}

/**
 * Build the headers used for server-side Better Auth calls.
 *
 * Do not forward the mobile request's Authorization header here. During an
 * add-account flow it belongs to the currently active account, and Better Auth
 * must resolve the account from the email/password or 2FA cookie instead.
 */
function authHeaders(
	event: RequestEvent,
	cookies: string[] = []
): Headers {
	const headers = new Headers();
	headers.set('content-type', 'application/json');
	headers.set('origin', configuredAuthOrigin());
	for (const name of [
		'user-agent',
		'x-forwarded-for',
		'x-real-ip',
		'accept-language'
	]) {
		const value = event.request.headers.get(name);
		if (value) headers.set(name, value);
	}
	if (cookies.length > 0) {
		headers.set('cookie', cookies.join('; '));
	}
	return headers;
}

function isExpiredCookie(raw: string, value: string): boolean {
	if (!value) return true;
	const maxAge = raw.match(/;\s*max-age\s*=\s*(-?\d+)/i);
	if (maxAge && Number(maxAge[1]) <= 0) return true;
	const expires = raw.match(/;\s*expires\s*=\s*([^;]+)/i);
	if (expires) {
		const time = new Date(expires[1]!).getTime();
		if (Number.isFinite(time) && time <= Date.now()) return true;
	}
	return false;
}

function readSetCookies(headers: Headers): Map<string, SetCookieInfo> {
	const cookies = new Map<string, SetCookieInfo>();
	const getSetCookie = (
		headers as Headers & { getSetCookie?: () => string[] }
	).getSetCookie;
	const rawCookies =
		typeof getSetCookie === 'function'
			? getSetCookie.call(headers)
			: splitCombinedSetCookie(headers.get('set-cookie') ?? '');
	for (const raw of rawCookies) {
		const first = raw.split(';', 1)[0]?.trim() ?? '';
		const eq = first.indexOf('=');
		if (eq <= 0) continue;
		const name = first.slice(0, eq).trim();
		const value = first.slice(eq + 1);
		cookies.set(name, {
			name,
			value,
			expired: isExpiredCookie(raw, value)
		});
	}
	return cookies;
}

/** Split a combined Set-Cookie header without cutting an Expires date. */
function splitCombinedSetCookie(value: string): string[] {
	const result: string[] = [];
	let current = '';
	for (let i = 0; i < value.length; i += 1) {
		const char = value[i]!;
		if (char === ',') {
			const lower = current.toLowerCase();
			if (lower.includes('expires=') && !lower.includes('gmt')) {
				current += char;
				continue;
			}
			if (current.trim()) result.push(current.trim());
			current = '';
			continue;
		}
		current += char;
	}
	if (current.trim()) result.push(current.trim());
	return result;
}

function findAuthCookie(
	headers: Headers,
	suffix: string
): SetCookieInfo | undefined {
	for (const [name, cookie] of readSetCookies(headers)) {
		if (name === suffix || name.endsWith(`.${suffix}`)) {
			return cookie;
		}
	}
	return undefined;
}

function safeCookiePair(
	raw: string | undefined,
	suffix: string
): string | undefined {
	const value = raw?.trim() ?? '';
	if (!value || /[\r\n;]/.test(value)) return undefined;
	const eq = value.indexOf('=');
	if (eq <= 0) return undefined;
	const name = value.slice(0, eq).trim();
	const cookieValue = value.slice(eq + 1).trim();
	if (!cookieValue) return undefined;
	if (name !== suffix && !name.endsWith(`.${suffix}`)) {
		return undefined;
	}
	return `${name}=${cookieValue}`;
}

function trustCookieFromResponse(
	headers: Headers
):
	| { trustDeviceCookie?: string; clearTrustDeviceCookie?: boolean }
	| undefined {
	const cookie = findAuthCookie(headers, TRUST_DEVICE_COOKIE);
	if (!cookie) return undefined;
	if (cookie.expired || !cookie.value) {
		return { clearTrustDeviceCookie: true };
	}
	return { trustDeviceCookie: `${cookie.name}=${cookie.value}` };
}

async function readJson(
	response: Response
): Promise<AuthResponseBody | null> {
	return (await response
		.clone()
		.json()
		.catch(() => null)) as AuthResponseBody | null;
}

async function revokeSessionToken(token: string): Promise<void> {
	if (!token) return;
	try {
		await auth.api.signOut({
			headers: new Headers({
				Authorization: `Bearer ${token}`
			}),
			asResponse: true
		});
	} catch {
		// The mobile client discards rejected tokens; best-effort cleanup.
	}
}

async function resolveDoctorSession(
	userId: string,
	token: string
): Promise<DoctorSessionResult> {
	const staff = (await getStaffByUserIdWithRelations(
		userId
	)) as DoctorStaffRow | null;
	if (
		!staff ||
		typeof staff.staffTypeId !== 'number' ||
		!DOCTOR_STAFF_TYPE_IDS.has(staff.staffTypeId)
	) {
		await revokeSessionToken(token);
		throw new DoctorAuthError(403, 'This account is not a doctor account');
	}
	const roleId = (staff.user as { roleId?: number | null } | null)?.roleId;
	if (roleId !== RoleEnum.STAFF) {
		await revokeSessionToken(token);
		throw new DoctorAuthError(403, 'Staff account required');
	}
	if (
		typeof staff.statusId === 'number' &&
		staff.statusId !== StatusEnum.ACTIVE
	) {
		await revokeSessionToken(token);
		throw new DoctorAuthError(403, 'This doctor account is not active');
	}
	const hospitals = doctorHospitals(staff);
	const hospitalId = hospitals[0]?.id;
	if (!hospitalId) {
		await revokeSessionToken(token);
		throw new DoctorAuthError(
			403,
			'No hospital is assigned to this doctor'
		);
	}

	const ctx: DoctorPortalContext = {
		userId,
		staff,
		staffId: staff.id,
		hospitalId,
		branchId: null
	};
	const profile = buildDoctorProfile(ctx, {
		mustChangePassword: Boolean(
			(staff.user as { mustChangePassword?: boolean } | null)
				?.mustChangePassword
		)
	});
	return { token, ...profile };
}

export async function signInDoctor(input: {
	event: RequestEvent;
	email: string;
	password: string;
	trustDeviceCookie?: string;
}): Promise<DoctorSignInResult> {
	const trustCookie = safeCookiePair(
		input.trustDeviceCookie,
		TRUST_DEVICE_COOKIE
	);
	const response = await auth.api.signInEmail({
		body: { email: input.email, password: input.password },
		headers: authHeaders(
			input.event,
			trustCookie ? [trustCookie] : []
		),
		asResponse: true
	});
	const data = await readJson(response);
	if (!response.ok) {
		throw new DoctorAuthError(
			response.status,
			data?.message ?? 'Invalid email or password'
		);
	}

	const trust = trustCookieFromResponse(response.headers);

	if (data?.twoFactorRedirect) {
		const challenge = findAuthCookie(
			response.headers,
			TWO_FACTOR_COOKIE
		);
		if (!challenge?.value || challenge.expired) {
			throw new DoctorAuthError(
				500,
				'Two-factor challenge could not be created'
			);
		}
		return {
			twoFactorRequired: true,
			twoFactorCookie: `${challenge.name}=${challenge.value}`,
			email: input.email,
			...trust
		};
	}

	const token =
		response.headers.get('set-auth-token') ?? data?.token ?? '';
	if (!token) {
		throw new DoctorAuthError(500, 'No session token was returned');
	}
	const userId = data?.user?.id;
	if (!userId) {
		await revokeSessionToken(token);
		throw new DoctorAuthError(
			500,
			'The signed-in account could not be resolved'
		);
	}
	const session = await resolveDoctorSession(userId, token);
	return { ...session, ...trust };
}

export async function verifyDoctorTwoFactor(input: {
	event: RequestEvent;
	twoFactorCookie: string;
	code: string;
	method: 'totp' | 'backupCode';
	trustDevice: boolean;
}): Promise<DoctorSessionResult> {
	const challenge = safeCookiePair(
		input.twoFactorCookie,
		TWO_FACTOR_COOKIE
	);
	if (!challenge) {
		throw new DoctorAuthError(
			400,
			'The two-factor challenge is invalid or expired'
		);
	}
	const code = input.code.trim();
	if (!code) {
		throw new DoctorAuthError(400, 'A verification code is required');
	}

	const headers = authHeaders(input.event, [challenge]);
	const response =
		input.method === 'backupCode'
			? await auth.api.verifyBackupCode({
					body: {
						code,
						trustDevice: input.trustDevice
					},
					headers,
					asResponse: true
				})
			: await auth.api.verifyTOTP({
					body: {
						code,
						trustDevice: input.trustDevice
					},
					headers,
					asResponse: true
				});
	const data = await readJson(response);
	if (!response.ok) {
		throw new DoctorAuthError(
			response.status,
			data?.message ?? 'Invalid verification code'
		);
	}
	const token =
		response.headers.get('set-auth-token') ?? data?.token ?? '';
	const userId = data?.user?.id;
	if (!token || !userId) {
		await revokeSessionToken(token);
		throw new DoctorAuthError(
			500,
			'The verified session could not be resolved'
		);
	}
	const session = await resolveDoctorSession(userId, token);
	return {
		...session,
		...trustCookieFromResponse(response.headers)
	};
}

export async function changeDoctorPassword(input: {
	userId: string;
	currentSessionToken?: string | null;
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}): Promise<void> {
	if (input.newPassword !== input.confirmPassword) {
		throw new DoctorAuthError(
			400,
			'New password and confirmation do not match'
		);
	}
	if (input.newPassword.length < 8) {
		throw new DoctorAuthError(
			400,
			'New password must be at least 8 characters'
		);
	}
	if (input.newPassword.length > 128) {
		throw new DoctorAuthError(
			400,
			'New password must be 128 characters or fewer'
		);
	}
	if (!input.currentPassword) {
		throw new DoctorAuthError(400, 'Current password is required');
	}

	const [account] = await ensureDb()
		.select({
			id: accountTable.id,
			password: accountTable.password
		})
		.from(accountTable)
		.where(
			and(
				eq(accountTable.userId, input.userId),
				eq(accountTable.providerId, 'credential')
			)
		)
		.limit(1);
	if (!account?.password) {
		throw new DoctorAuthError(
			400,
			'Password sign-in is not available for this account'
		);
	}
	const valid = await passwordHashUtil.verify({
		password: input.currentPassword,
		hash: account.password
	});
	if (!valid) {
		throw new DoctorAuthError(401, 'Current password is incorrect');
	}

	const hashed = await passwordHashUtil.hash(input.newPassword);
	const now = new Date().toISOString();
	await ensureDb().transaction(async (tx) => {
		await tx
			.update(accountTable)
			.set({ password: hashed, updatedAt: now })
			.where(eq(accountTable.id, account.id));
		await tx
			.update(userTable)
			.set({ mustChangePassword: false, updatedAt: now })
			.where(eq(userTable.id, input.userId));
		if (input.currentSessionToken) {
			await tx
				.delete(sessionTable)
				.where(
					and(
						eq(sessionTable.userId, input.userId),
						ne(sessionTable.token, input.currentSessionToken)
					)
				);
		}
	});
}
