import { createAuthClient } from 'better-auth/svelte';
import {
	emailOTPClient,
	twoFactorClient
} from 'better-auth/client/plugins';
import { WebRoutesEnum } from '$lib/model/enum/routes.enum';

export const authClient = createAuthClient({
	plugins: [
		emailOTPClient(),
		twoFactorClient({
			onTwoFactorRedirect() {
				if (typeof window === 'undefined') return;
				const current = new URL(window.location.href);
				const redirectTo =
					current.searchParams.get('redirectTo') ||
					WebRoutesEnum.MEDORA_HOSPITAL;
				const next = new URL(
					WebRoutesEnum.TWO_FACTOR,
					window.location.origin
				);
				next.searchParams.set('redirectTo', redirectTo);
				window.location.assign(next.toString());
			}
		})
	]
});
