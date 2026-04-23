import type {
	PrefixFieldPath,
	PrefixFormatPart,
	PrefixFormatSpec
} from '$lib/model/type/heka/prefix-format.type';

const KNOWN_FIELD_PATHS: readonly PrefixFieldPath[] = [
	'financial_year.code',
	'hospital.code',
	'branch.code',
	'visit_type.code',
	'order_date.year_2digit',
	'visit.order_key'
];

function isPrefixFieldPath(s: string): s is PrefixFieldPath {
	return (KNOWN_FIELD_PATHS as readonly string[]).includes(s);
}

export type UiFormatPart =
	| { id: string; kind: 'literal'; value: string }
	| { id: string; kind: 'field'; path: PrefixFieldPath }
	| { id: string; kind: 'sequence'; padStart: number };

export const PREFIX_FIELD_PATHS: readonly PrefixFieldPath[] =
	KNOWN_FIELD_PATHS;

export function newPartId(): string {
	return crypto.randomUUID();
}

export function defaultFormatParts(): UiFormatPart[] {
	return defaultFormatPartsForStorageKey('PATIENT_CODE');
}

/** Default template when saving a purpose for the first time. */
export function defaultFormatPartsForStorageKey(
	storageKey:
		| 'PATIENT_CODE'
		| 'VISIT_NO'
		| 'ORDER_NO'
		| 'PURCHASE_REQUISITION_NO'
		| 'PURCHASE_ORDER_NO'
		| 'MEDICATION_ORDER_BATCH_NO'
): UiFormatPart[] {
	if (
		storageKey === 'PURCHASE_REQUISITION_NO' ||
		storageKey === 'PURCHASE_ORDER_NO'
	) {
		return [
			{ id: newPartId(), kind: 'field', path: 'financial_year.code' },
			{ id: newPartId(), kind: 'field', path: 'hospital.code' },
			{ id: newPartId(), kind: 'field', path: 'branch.code' },
			{ id: newPartId(), kind: 'sequence', padStart: 6 }
		];
	}
	if (storageKey === 'VISIT_NO') {
		return [
			{ id: newPartId(), kind: 'field', path: 'financial_year.code' },
			{ id: newPartId(), kind: 'field', path: 'hospital.code' },
			{ id: newPartId(), kind: 'field', path: 'branch.code' },
			{ id: newPartId(), kind: 'field', path: 'visit_type.code' },
			{ id: newPartId(), kind: 'sequence', padStart: 6 }
		];
	}
	if (storageKey === 'ORDER_NO') {
		return [
			{ id: newPartId(), kind: 'field', path: 'order_date.year_2digit' },
			{ id: newPartId(), kind: 'literal', value: '/' },
			{ id: newPartId(), kind: 'field', path: 'visit.order_key' },
			{ id: newPartId(), kind: 'literal', value: '/' },
			{ id: newPartId(), kind: 'sequence', padStart: 3 }
		];
	}
	if (storageKey === 'MEDICATION_ORDER_BATCH_NO') {
		return [
			{ id: newPartId(), kind: 'field', path: 'financial_year.code' },
			{ id: newPartId(), kind: 'field', path: 'hospital.code' },
			{ id: newPartId(), kind: 'literal', value: '/MO/' },
			{ id: newPartId(), kind: 'sequence', padStart: 5 }
		];
	}
	return [
		{ id: newPartId(), kind: 'field', path: 'financial_year.code' },
		{ id: newPartId(), kind: 'field', path: 'hospital.code' },
		{ id: newPartId(), kind: 'sequence', padStart: 6 }
	];
}

const FIELD_PATHS_PATIENT: readonly PrefixFieldPath[] = [
	'financial_year.code',
	'hospital.code',
	'branch.code'
];

/** Field dropdown options; patient omits visit type by default (optional via format). */
export function fieldPathsForEdit(
	storageKey:
		| 'PATIENT_CODE'
		| 'VISIT_NO'
		| 'ORDER_NO'
		| 'PURCHASE_REQUISITION_NO'
		| 'PURCHASE_ORDER_NO'
		| 'MEDICATION_ORDER_BATCH_NO',
	currentParts: UiFormatPart[]
): readonly PrefixFieldPath[] {
	const base =
		storageKey === 'PATIENT_CODE' ? FIELD_PATHS_PATIENT : KNOWN_FIELD_PATHS;
	const used = new Set(
		currentParts
			.filter((p): p is Extract<UiFormatPart, { kind: 'field' }> => p.kind === 'field')
			.map((p) => p.path)
	);
	const allowed = new Set<PrefixFieldPath>([...base]);
	for (const u of used) {
		allowed.add(u);
	}
	const ordered: PrefixFieldPath[] = [];
	for (const p of KNOWN_FIELD_PATHS) {
		if (allowed.has(p)) ordered.push(p);
	}
	return ordered;
}

function partToSpecPart(p: UiFormatPart): PrefixFormatPart | null {
	if (p.kind === 'literal') {
		return { type: 'literal', value: p.value };
	}
	if (p.kind === 'field') {
		return { type: 'field', path: p.path };
	}
	if (p.kind === 'sequence') {
		const seq: PrefixFormatPart = {
			type: 'sequence',
			source: 'prefix_counter.last_no',
			op: 'inc'
		};
		if (p.padStart > 0) {
			seq.padStart = Math.min(24, Math.floor(p.padStart));
		}
		return seq;
	}
	return null;
}

export function uiToFormatSpec(
	parts: UiFormatPart[]
): PrefixFormatSpec | null {
	if (parts.length === 0) return null;
	const out: PrefixFormatPart[] = [];
	for (const p of parts) {
		const sp = partToSpecPart(p);
		if (!sp) return null;
		out.push(sp);
	}
	return { parts: out };
}

export function formatSpecToUi(
	spec: unknown
): { ok: true; parts: UiFormatPart[] } | { ok: false } {
	if (!spec || typeof spec !== 'object') return { ok: false };
	const raw = spec as { parts?: unknown };
	if (!Array.isArray(raw.parts)) return { ok: false };
	const ui: UiFormatPart[] = [];
	for (const p of raw.parts) {
		if (!p || typeof p !== 'object') return { ok: false };
		const part = p as Record<string, unknown>;
		if (part.type === 'literal') {
			if (typeof part.value !== 'string') return { ok: false };
			ui.push({
				id: newPartId(),
				kind: 'literal',
				value: part.value
			});
		} else if (part.type === 'field') {
			if (typeof part.path !== 'string' || !isPrefixFieldPath(part.path)) {
				return { ok: false };
			}
			ui.push({
				id: newPartId(),
				kind: 'field',
				path: part.path
			});
		} else if (part.type === 'sequence') {
			const src = part.source;
			const okSource =
				src === 'prefix_counter.last_no' ||
				src === 'prefix_configuration.last_no';
			if (!okSource || part.op !== 'inc') {
				return { ok: false };
			}
			const pad = part.padStart;
			const padStart =
				typeof pad === 'number' && pad > 0
					? Math.min(24, Math.floor(pad))
					: 0;
			ui.push({
				id: newPartId(),
				kind: 'sequence',
				padStart
			});
		} else {
			return { ok: false };
		}
	}
	return { ok: true, parts: ui };
}

const PREVIEW_BY_PATH: Record<PrefixFieldPath, string> = {
	'financial_year.code': 'FY25',
	'hospital.code': 'HOSP',
	'branch.code': 'BR01',
	'visit_type.code': 'OP',
	'order_date.year_2digit': '26',
	'visit.order_key': 'V-1001'
};

export function previewExample(parts: UiFormatPart[]): string {
	let s = '';
	for (const p of parts) {
		if (p.kind === 'literal') {
			s += p.value;
		} else if (p.kind === 'field') {
			s += PREVIEW_BY_PATH[p.path] ?? '';
		} else {
			s += p.padStart > 0 ? '1'.padStart(p.padStart, '0') : '1';
		}
	}
	return s;
}
