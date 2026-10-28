export function text(
	value: string | null | undefined
): string | null {
	return value?.trim() ? value : null;
}

export function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(isoDate: string, days: number): string {
	const date = new Date(`${isoDate}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

export function dayStartIso(isoDate: string): string {
	return `${isoDate}T00:00:00.000Z`;
}

export function dayEndIso(isoDate: string): string {
	return `${addDaysIso(isoDate, 1)}T00:00:00.000Z`;
}

export function safeLimit(
	value: number | undefined,
	fallback = 50
): number {
	return Math.min(Math.max(value ?? fallback, 1), 200);
}

export function safeOffset(value: number | undefined): number {
	return Math.max(value ?? 0, 0);
}

export function patientDisplayName(
	patient:
		| {
				firstName?: string | null;
				middleName?: string | null;
				lastName?: string | null;
				title?: { name?: string | null } | null;
		  }
		| null
		| undefined
): string | null {
	if (!patient) return null;
	const parts = [
		patient.title?.name,
		patient.firstName,
		patient.middleName,
		patient.lastName
	]
		.map((value) => value?.trim())
		.filter(Boolean);
	return parts.join(' ').trim() || null;
}

export function ageLabel(input: {
	dateOfBirth?: string | null;
	ageYear?: number | null;
	ageMonth?: number | null;
	ageDay?: number | null;
}): string | null {
	if (input.ageYear != null) {
		const years = input.ageYear;
		const months = input.ageMonth ?? 0;
		const days = input.ageDay ?? 0;
		if (years > 0) return `${years}y`;
		if (months > 0) return `${months}m`;
		if (days > 0) return `${days}d`;
		return null;
	}
	const dob = input.dateOfBirth;
	if (!dob) return null;
	const birth = new Date(`${dob}T00:00:00.000Z`);
	if (Number.isNaN(birth.getTime())) return null;
	const now = new Date();
	let years = now.getUTCFullYear() - birth.getUTCFullYear();
	const beforeBirthday =
		now.getUTCMonth() < birth.getUTCMonth() ||
		(now.getUTCMonth() === birth.getUTCMonth() &&
			now.getUTCDate() < birth.getUTCDate());
	if (beforeBirthday) years -= 1;
	return years >= 0 ? `${years}y` : null;
}

export function distinctTexts(
	values: (string | null | undefined)[]
): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const value of values) {
		const trimmed = value?.trim();
		if (!trimmed) continue;
		const key = trimmed.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(trimmed);
	}
	return out;
}
