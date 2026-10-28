import type { LayoutServerLoad } from './$types';

function staffPrintBy(locals: App.Locals): string {
	const s = locals.staff;
	if (s) {
		return [s.firstName, s.middleName, s.lastName]
			.filter((x) => Boolean(x && String(x).trim()))
			.join(' ')
			.trim();
	}
	const u = locals.user;
	return (u?.name || u?.email || '').trim();
}

export const load: LayoutServerLoad = async ({ locals }) => ({
	printByName: staffPrintBy(locals)
});
