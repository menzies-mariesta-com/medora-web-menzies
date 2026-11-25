/**
 * MAR sheet body for the eMAR print button: the dose matrix the nurse sees on
 * screen plus a signature block, as one HTML string for the shared print iframe.
 */
import type { EmarBedLocation } from '$lib/model/type/medora/clinical-platform.type';
import {
	infusionMarLines,
	prnMarLines,
	scheduledMarLines,
	type MarGrid,
	type MarLine
} from '$lib/tool/nursing/emar-mar.util';

export type EmarPrintInput = {
	grid: MarGrid;
	patient: { name: string; code: string | null; visitNo: string | null };
	bedLocation: EmarBedLocation | null;
};

const STATE_LABEL: Record<string, string> = {
	pending: '',
	late: 'Late',
	given: 'Given',
	held: 'Held',
	refused: 'Refused',
	not_given: 'Not given'
};

export function escapeEmarHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function bedLabel(bed: EmarBedLocation | null): string {
	if (!bed) return 'No bed assigned';
	return [bed.wardName, bed.roomName, bed.bedName].filter(Boolean).join(' · ');
}

function lineLabel(line: MarLine): string {
	return [line.itemName, line.doseText, line.routeName]
		.filter(Boolean)
		.join(' · ');
}

function cellText(line: MarLine, index: number): string {
	const cell = line.cells[index];
	if (!cell) return '';
	const label = STATE_LABEL[cell.state] ?? '';
	if (!cell.administration) return label;
	const reason = cell.administration.displayReason;
	return reason ? `${label} (${reason})` : label;
}

function matrixTable(lines: MarLine[], grid: MarGrid): string {
	if (!lines.length) return '<p class="empty">No scheduled medications.</p>';
	const head = grid.columns
		.map((column) => `<th>${escapeEmarHtml(column.label)}</th>`)
		.join('');
	const rows = lines
		.map((line) => {
			const cells = grid.columns
				.map((_, index) => `<td>${escapeEmarHtml(cellText(line, index))}</td>`)
				.join('');
			return `<tr><th>${escapeEmarHtml(lineLabel(line))}</th>${cells}</tr>`;
		})
		.join('');
	return `<table class="mar"><thead><tr><th>Medication</th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

function prnTable(lines: MarLine[]): string {
	if (!lines.length) return '';
	const rows = lines
		.map(
			(line) =>
				`<tr><th>${escapeEmarHtml(lineLabel(line))}</th><td>${escapeEmarHtml(line.lastGivenAt ?? 'Not given')}</td><td>${escapeEmarHtml(line.prnNextAllowedAt ?? '—')}</td></tr>`
		)
		.join('');
	return `<h4>As needed (PRN)</h4><table class="mar"><thead><tr><th>Medication</th><th>Last given</th><th>Next allowed</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function infusionTable(lines: MarLine[]): string {
	if (!lines.length) return '';
	const rows = lines
		.map(
			(line) =>
				`<tr><th>${escapeEmarHtml(line.itemName)}</th><td>${escapeEmarHtml(line.rateMlHr ?? '—')}</td><td>${line.infusionRunning ? 'Running' : 'Stopped'}</td></tr>`
		)
		.join('');
	return `<h4>Continuous infusion</h4><table class="mar"><thead><tr><th>Medication</th><th>Rate mL/h</th><th>State</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function signatureBlock(): string {
	return `<div class="sign"><div>Nurse signature</div><div>Designation</div><div>Date / time</div></div>`;
}

/** Body HTML only; the caller wraps it with `buildPrintDocumentHtml`. */
export function buildMarPrintBody(input: EmarPrintInput): string {
	const { grid, patient, bedLocation } = input;
	return `<div class="mar-sheet">
	<h3>Medication administration record</h3>
	<p class="meta">Patient: <strong>${escapeEmarHtml(patient.name)}</strong> · Code: ${escapeEmarHtml(patient.code ?? '—')} · Visit: ${escapeEmarHtml(patient.visitNo ?? '—')} · Location: ${escapeEmarHtml(bedLabel(bedLocation))}</p>
	${matrixTable(scheduledMarLines(grid), grid)}
	${prnTable(prnMarLines(grid))}
	${infusionTable(infusionMarLines(grid))}
	${signatureBlock()}
</div>`;
}
