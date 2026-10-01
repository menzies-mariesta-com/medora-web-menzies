import { goto } from '$app/navigation';
import { authClient } from '$lib/auth/client';
import { ApiErrorCodeEnum } from '$lib/model/enum/api-error.enum';
import { RoleEnum } from '$lib/model/enum/db-link';
import { StatusColorEnum } from '$lib/model/enum/color.enum';
import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
import { ToastService } from '$lib/service/toast.service.svelte';
import { m } from '$lib/paraglide/messages';

function sanitizeRedirectTo(redirectTo: string | null | undefined): string {
	if (!redirectTo) return WebRoutesEnum.MEDORA_HOSPITAL;
	const value = redirectTo.trim();
	const lower = value.toLowerCase();
	if (!value.startsWith('/')) return WebRoutesEnum.MEDORA_HOSPITAL;
	if (value.startsWith('//')) return WebRoutesEnum.MEDORA_HOSPITAL;
	if (lower.startsWith('http:') || lower.startsWith('https:')) {
		return WebRoutesEnum.MEDORA_HOSPITAL;
	}
	return value;
}

function currentPathWithSearch(): string {
	if (typeof window === 'undefined') return WebRoutesEnum.MEDORA_HOSPITAL;
	return `${window.location.pathname}${window.location.search}`;
}

/** Build `/auth/two-factor/setup?redirectTo=...` for users who have not enrolled. */
export function twoFactorSetupUrl(redirectTo?: string | null): string {
	const target = sanitizeRedirectTo(
		redirectTo ?? currentPathWithSearch()
	);
	return `${WebRoutesEnum.TWO_FACTOR_SETUP}?redirectTo=${encodeURIComponent(target)}`;
}

/** Build `/auth/two-factor?redirectTo=...` for enrolled users who still need to verify. */
export function twoFactorVerifyUrl(redirectTo?: string | null): string {
	const target = sanitizeRedirectTo(
		redirectTo ?? currentPathWithSearch()
	);
	return `${WebRoutesEnum.TWO_FACTOR}?redirectTo=${encodeURIComponent(target)}`;
}

function roleRequiresTwoFactorForMutation(
	userRoleId: number | null | undefined
): boolean {
	return (
		userRoleId === RoleEnum.SYSTEM_ADMIN ||
		userRoleId === RoleEnum.OWNER ||
		userRoleId === RoleEnum.ADMIN_TEAM
	);
}

function notifyTwoFactorRequired(): void {
	const msg = m as unknown as Record<string, () => string>;
	const toastService = new ToastService();
	toastService.addToast(
		msg.auth_2fa_required_for_action?.() ??
			'Two-factor authentication is required for this action.',
		StatusColorEnum.WARNING
	);
}

/**
 * Before opening create/edit/delete UI for SYSTEM_ADMIN, OWNER, or ADMIN_TEAM,
 * ensure 2FA is enabled. Returns false after navigating to setup when not enrolled.
 * STAFF and other roles always pass.
 */
export async function ensureTwoFactorForMutation(options?: {
	userRoleId?: number | null;
	/** Known enrollment flag from page data / locals; skips getSession when true. */
	twoFactorEnabled?: boolean | null;
	redirectTo?: string | null;
}): Promise<boolean> {
	if (!roleRequiresTwoFactorForMutation(options?.userRoleId)) {
		return true;
	}

	let enabled = options?.twoFactorEnabled;
	if (enabled == null) {
		const { data } = await authClient.getSession();
		const user = data?.user as
			| { twoFactorEnabled?: boolean | null }
			| undefined;
		enabled = Boolean(user?.twoFactorEnabled);
	}

	if (enabled) return true;

	notifyTwoFactorRequired();
	await goto(twoFactorSetupUrl(options?.redirectTo));
	return false;
}

/**
 * If a failed Response is 403 with `TWO_FACTOR_REQUIRED`, navigate to 2FA
 * setup (or verify) and return true. Caller should stop handling the error.
 */
export async function redirectIfTwoFactorRequired(
	res: Response,
	options?: {
		redirectTo?: string | null;
		/** When known enrolled but session not verified, send to verify page. */
		twoFactorEnabled?: boolean | null;
	}
): Promise<boolean> {
	if (res.status !== 403) return false;

	let code: string | undefined;
	try {
		const body = (await res.clone().json()) as {
			code?: string;
		};
		code = body?.code;
	} catch {
		return false;
	}

	if (code !== ApiErrorCodeEnum.TWO_FACTOR_REQUIRED) return false;

	notifyTwoFactorRequired();
	const target = options?.twoFactorEnabled
		? twoFactorVerifyUrl(options?.redirectTo)
		: twoFactorSetupUrl(options?.redirectTo);
	await goto(target);
	return true;
}
