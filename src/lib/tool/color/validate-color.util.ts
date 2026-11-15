const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGBA_RE =
	/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*(0|1|0?\.\d+))?\s*\)$/;

export function normalizeColorInput(raw: string): string | null {
	const v = raw.trim();
	if (!v) return null;
	if (HEX_RE.test(v)) {
		if (v.length === 4) {
			const r = v[1]!;
			const g = v[2]!;
			const b = v[3]!;
			return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
		}
		return v.toLowerCase();
	}
	if (RGBA_RE.test(v)) return v;
	return null;
}

export function isValidColorInput(raw: string): boolean {
	return normalizeColorInput(raw) != null;
}