/** Staff / user display name for Document Master `{{print_by}}`. */
export function staffPrintByName(locals: App.Locals): string {
	const s = locals.staff;
	if (s) {
		const withTitle = [
			s.title?.name?.trim() ?? '',
			s.firstName,
			s.middleName,
			s.lastName
		]
			.filter((x) => Boolean(x && String(x).trim()))
			.join(' ')
			.trim();
		if (withTitle) return withTitle;
	}
	const u = locals.user;
	return (u?.name || u?.email || '').trim();
}