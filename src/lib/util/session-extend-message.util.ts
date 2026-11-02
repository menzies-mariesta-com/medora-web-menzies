import { AppEnum } from '$lib/model/enum/app.enum';

/** Paraglide inputs for session-extend copy tied to {@link AppEnum.SESSION_EXTEND_BUMP_SECONDS}. */
export function sessionExtendMessageParams(): { hours: number } {
	return { hours: AppEnum.SESSION_EXTEND_BUMP_SECONDS / (60 * 60) };
}
