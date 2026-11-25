/**
 * Care plan body for the print button: the four fields as a readable document,
 * interventions numbered, plus a sign-off block. Feeds the shared print iframe
 * the same way the eMAR sheet does.
 */
import type { CarePlanContent } from '$lib/model/type/medora/clinical-platform.type';
import { parseInterventionLines } from '$lib/tool/nursing/care-plan.util';

export type CarePlanPrintInput = {
	patient: {
		name: string;
		code: string | null;
		visitNo: string | null;
	};
	title: string;
	content: CarePlanContent;
	signedAt?: string | null;
	signedByName?: string | null;
};

export function escapeCarePlanHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function paragraph(value: string | undefined): string {
	const text = (value ?? '').trim();
	return text
		? escapeCarePlanHtml(text).replace(/\n/g, '<br>')
		: '&ndash;';
}

export function buildCarePlanPrintHtml(
	input: CarePlanPrintInput
): string {
	const interventions = parseInterventionLines(
		input.content.interventions
	);
	const list = interventions.length
		? `<ol style="margin:4px 0 0 18px;padding:0;">${interventions
				.map((line) => `<li>${escapeCarePlanHtml(line)}</li>`)
				.join('')}</ol>`
		: '&ndash;';
	const identity = [input.patient.code, input.patient.visitNo]
		.filter(Boolean)
		.map((v) => escapeCarePlanHtml(String(v)))
		.join(' &middot; ');
	const signOff = input.signedAt
		? `<p><small>Signed by ${escapeCarePlanHtml(input.signedByName ?? '–')} on ${escapeCarePlanHtml(input.signedAt)}</small></p>`
		: '<p><small>Not signed</small></p>';
	return `<article>
<h2>${escapeCarePlanHtml(input.title)}</h2>
<p><small>${escapeCarePlanHtml(input.patient.name)}${identity ? ` &middot; ${identity}` : ''}</small></p>
<h3>Problem</h3><p>${paragraph(input.content.problem)}</p>
<h3>Goal / expected outcome</h3><p>${paragraph(input.content.goal)}</p>
<h3>Interventions</h3>${list}
<h3>Evaluation</h3><p>${paragraph(input.content.evaluation)}</p>
${signOff}
</article>`;
}
