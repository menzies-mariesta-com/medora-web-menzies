import {
	MYANMAR_NRC_CITIZENSHIP,
	MYANMAR_NRC_TOWNSHIPS,
	type MyanmarNrcCitizenship
} from '$lib/model/data/myanmar-nrc.data';

export type MyanmarNrcParts = {
	townshipNumber: string;
	townshipCode: string;
	citizenship: MyanmarNrcCitizenship;
	serial: string;
};

const NRC_RE =
	/^(\d{1,2})\/([A-Za-z]{3,10})\(([NPEC])\)(\d{6})$/;

export function codesForTownshipNumber(
	townshipNumber: string
): string[] {
	const group = MYANMAR_NRC_TOWNSHIPS.find(
		(g) => g.townshipNumber === townshipNumber
	);
	return group?.codes ?? [];
}

export function formatNrc(parts: MyanmarNrcParts): string {
	const num = parts.townshipNumber.trim();
	const code = parts.townshipCode.trim().toUpperCase();
	const citizenship = parts.citizenship.trim().toUpperCase();
	const serial = parts.serial.trim();
	return `${num}/${code}(${citizenship})${serial}`;
}

export function parseNrc(
	identityNo: string | null | undefined
): MyanmarNrcParts | null {
	const raw = (identityNo ?? '').trim().toUpperCase().replace(/\s+/g, '');
	if (!raw) return null;
	const m = raw.match(NRC_RE);
	if (!m) return null;
	const townshipNumber = String(Number(m[1])); // normalize 01 → 1
	const townshipCode = m[2] ?? '';
	const citizenship = m[3] as MyanmarNrcCitizenship;
	const serial = m[4] ?? '';
	if (
		!MYANMAR_NRC_CITIZENSHIP.includes(citizenship) ||
		!codesForTownshipNumber(townshipNumber).includes(townshipCode)
	) {
		// Still accept structurally valid NRC even if code not in master list
		if (!/^\d{1,2}$/.test(townshipNumber) || !/^[A-Z]{3,10}$/.test(townshipCode)) {
			return null;
		}
	}
	return { townshipNumber, townshipCode, citizenship, serial };
}

export function isValidNrcParts(parts: Partial<MyanmarNrcParts>): boolean {
	const num = parts.townshipNumber?.trim() ?? '';
	const code = parts.townshipCode?.trim().toUpperCase() ?? '';
	const citizenship = (parts.citizenship ?? '').trim().toUpperCase();
	const serial = parts.serial?.trim() ?? '';
	if (!num || !code || !citizenship || !serial) return false;
	if (!/^\d{1,2}$/.test(num)) return false;
	if (!/^[A-Z]{3,10}$/.test(code)) return false;
	if (
		!MYANMAR_NRC_CITIZENSHIP.includes(
			citizenship as MyanmarNrcCitizenship
		)
	) {
		return false;
	}
	if (!/^\d{6}$/.test(serial)) return false;
	return true;
}

export function isNrcIdentityType(input: {
	id?: number | string | null;
	name?: string | null;
}): boolean {
	const name = (input.name ?? '').trim().toUpperCase();
	if (name === 'NRC') return true;
	const id = Number(input.id);
	return id === 1;
}
