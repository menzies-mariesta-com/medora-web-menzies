import { page } from '$app/state';
import { PageActionEnum } from '$lib/model/enum/page-action.enum';
import type { PagePermissionFlags } from '$lib/model/type/medora/page-permission.type';

/**
 * `null` = unrestricted (owner / system admin).
 * `[]` = staff with no grants. Otherwise the union of their groups.
 */
let permissions = $state<PagePermissionFlags[] | null>(null);

export function setPagePermissions(
	next: PagePermissionFlags[] | null
) {
	permissions = next;
}

/** Grant check for the page currently in the URL. */
export function can(action: PageActionEnum): boolean {
	if (permissions === null) return true;

	const path = currentDbPageUrl();
	const exact = permissions.find((p) => p.pageUrl === path);
	if (exact) return exact.actions.includes(action);

	// Chart tabs live under their section URL, so fall back to the longest
	// granted prefix (same rule the nav uses to resolve the current section).
	const parent = permissions
		.filter((p) => path.startsWith(`${p.pageUrl}/`))
		.sort((a, b) => b.pageUrl.length - a.pageUrl.length)[0];
	return parent?.actions.includes(action) ?? false;
}

/** `/medora/hospital/<id>/home/<rest>` → `/medora/home/<rest>`. */
function currentDbPageUrl(): string {
	const path = page.url.pathname.replace(/\/$/, '');
	const match = path.match(
		/^\/medora\/hospital\/[^/]+\/home(\/.*)?$/
	);
	if (!match) return path;
	return `/medora/home${match[1] ?? ''}`;
}
