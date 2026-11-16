import { StringUtil } from '$lib/util/string.util.svelte';

type StaffForPrint = {
	title?: { name?: string | null } | null;
	firstName?: string | null;
	middleName?: string | null;
	lastName?: string | null;
} | null;

type UserForPrint = {
	name?: string | null;
	email?: string | null;
} | null;

/** Logged-in staff (or user) name for `{{print_by}}` on Document Master prints. */
export function resolvePrintByName(
	staff: StaffForPrint | undefined,
	user: UserForPrint | undefined
): string {
	if (staff) {
		const name = StringUtil.fullNameWithTitle(
			staff.title?.name ?? null,
			staff.firstName,
			staff.middleName,
			staff.lastName
		).trim();
		if (name) return name;
	}
	return (user?.name || user?.email || '').trim();
}