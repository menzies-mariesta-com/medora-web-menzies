import type { MedicationOrderMastersResponse } from '$lib/model/type/heka/medication-order.type';

export type MedOrderPrescriptionDetailInput = {
	dose: string;
	doseUnitId: number;
	frequencyId: number;
	durationValue: string;
	durationUnitId: number;
	routeId: number | null;
	orderTypeId: number | null;
	foodRelationId: number | null;
	startAt: string;
	testDose?: string | null;
};

function masterNameById(
	rows: { id: number; name: string | null }[],
	id: number | null | undefined
): string {
	if (id == null || id <= 0) return '';
	return rows.find((r) => r.id === id)?.name?.trim() ?? '';
}

function freqLabelById(
	freqs: MedicationOrderMastersResponse['freqs'],
	id: number
): string {
	const row = freqs.find((f) => f.id === id);
	return row?.label?.trim() || row?.summaryText?.trim() || '';
}

function doseUnitDisplay(name: string): string {
	const t = name.trim();
	if (!t) return '';
	if (t.endsWith('(s)')) return t;
	return `${t}(s)`;
}

function durationUnitDisplay(name: string): string {
	const t = name.trim();
	if (!t) return '';
	if (t.endsWith('(s)')) return t;
	return `${t}(s)`;
}

function formatDose(dose: string): string {
	const t = dose.trim();
	if (!t) return '';
	return t;
}

/** DD/MM/YYYY in local calendar from ISO timestamp. */
export function formatMedOrderStartDate(startAt: string): string {
	const d = new Date(startAt);
	if (Number.isNaN(d.getTime())) return '';
	const day = String(d.getDate()).padStart(2, '0');
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const year = d.getFullYear();
	return `${day}/${month}/${year}`;
}

function routeParen(routeName: string): string {
	const n = routeName.trim();
	if (!n) return '';
	if (/^oral$/i.test(n)) return '(PO)';
	if (/iv|intravenous/i.test(n) && /inf/i.test(n)) return '(IV Inf:)';
	if (/^iv$/i.test(n) || /^intravenous$/i.test(n)) return '(IV)';
	const m = n.match(/\(([^)]+)\)\s*$/);
	if (m?.[1]?.trim()) return `(${m[1].trim()})`;
	return `(${n})`;
}

function foodParen(foodName: string): string {
	const n = foodName.trim();
	if (!n) return '';
	return `(${n.toLowerCase()})`;
}

export function formatMedOrderPrescriptionDetail(
	line: MedOrderPrescriptionDetailInput,
	masters: MedicationOrderMastersResponse | null
): string {
	if (!masters) return '—';

	const doseUnitName = masterNameById(masters.doseUnits, line.doseUnitId);
	const freqLabel = freqLabelById(masters.freqs, line.frequencyId);
	const durUnitName = masterNameById(
		masters.durUnits,
		line.durationUnitId
	);
	const routeName = masterNameById(masters.routes, line.routeId);
	const orderTypeName = masterNameById(masters.orderTypes, line.orderTypeId);
	const foodName = masterNameById(masters.foodRels, line.foodRelationId);
	const startDate = formatMedOrderStartDate(line.startAt);

	const dosePart = [
		formatDose(line.dose),
		doseUnitName ? doseUnitDisplay(doseUnitName) : ''
	]
		.filter(Boolean)
		.join(' ');

	const route = routeParen(routeName);
	const food = foodParen(foodName);

	if (orderTypeName.toUpperCase() === 'STAT') {
		const body = [dosePart, route].filter(Boolean).join(' ');
		const prefix = body ? `STAT - ${body}` : 'STAT';
		const withFood = food ? `${prefix} ${food}` : prefix;
		return startDate
			? `${withFood}, Start Date: ${startDate}`
			: withFood;
	}

	const durVal = line.durationValue.trim() || '1';
	const durPart = durUnitName
		? `for ${durVal} ${durationUnitDisplay(durUnitName)}`
		: '';

	const segments = [dosePart, freqLabel, durPart].filter(Boolean);
	let main = segments.join(' - ');
	if (route) main = main ? `${main} ${route}` : route;
	if (food) main = main ? `${main} ${food}` : food;

	if (line.testDose?.trim()) {
		const td = line.testDose.trim();
		main = main ? `${td} — ${main}` : td;
	}

	return startDate
		? `${main || '—'}, Start Date: ${startDate}`
		: main || '—';
}
