function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function nlToBr(text: string): string {
	return escapeHtml(text).replace(/\r\n|\r|\n/g, '<br/>');
}

export type DischargeSummaryPrintLabels = {
	hospitalCourse: string;
	dischargeMedications: string;
	followUp: string;
	redFlags: string;
	empty: string;
};

function sectionHtml(
	title: string,
	body: string,
	emptyLabel: string
): string {
	const trimmed = body.trim();
	const content = trimmed
		? `<div class="discharge-print-body">${nlToBr(trimmed)}</div>`
		: `<p class="case-sheet-empty">${escapeHtml(emptyLabel)}</p>`;
	return `<section class="case-sheet-section"><h3>${escapeHtml(title)}</h3>${content}</section>`;
}

/** Body HTML for Document Master `{{print.body_html}}` on discharge summary. */
export function buildDischargeSummaryPrintBodyHtml(opts: {
	labels: DischargeSummaryPrintLabels;
	hospitalCourse: string;
	dischargeMedications: string;
	followUp: string;
	redFlags: string;
}): string {
	const { labels } = opts;
	return [
		sectionHtml(
			labels.hospitalCourse,
			opts.hospitalCourse,
			labels.empty
		),
		sectionHtml(
			labels.dischargeMedications,
			opts.dischargeMedications,
			labels.empty
		),
		sectionHtml(labels.followUp, opts.followUp, labels.empty),
		sectionHtml(labels.redFlags, opts.redFlags, labels.empty)
	].join('');
}
