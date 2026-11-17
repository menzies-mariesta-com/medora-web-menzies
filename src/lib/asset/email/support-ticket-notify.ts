import { buildMedoraEmailDocument, emailDetailsTable } from './email-layout';
import { applyEmailBrandPlaceholders, emailLogoSrcForSend } from './email-brand';
import { escapeHtml } from './email-escape';

export type SupportTicketNotifyFields = {
	ticketId: number;
	subject: string;
	priority: string;
	description: string;
	contextUrl: string | null;
};

export function renderSupportTicketNotifyEmail(
	fields: SupportTicketNotifyFields
): { html: string; plainText: string } {
	const rows: [string, string][] = [
		['Ticket', `#${fields.ticketId}`],
		['Subject', fields.subject],
		['Priority', fields.priority]
	];
	if (fields.contextUrl) {
		rows.push(['Context', fields.contextUrl]);
	}
	const resolvedLogo = emailLogoSrcForSend();
	const cardBody = `
		<h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#134e4a;">New support message</h1>
		<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#475569;">
			A Medora user submitted a support request from the app.
		</p>
		${emailDetailsTable(rows)}
		<p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap;">${escapeHtml(fields.description)}</p>`;
	const html = applyEmailBrandPlaceholders(
		buildMedoraEmailDocument({
			pageTitle: `Support #${fields.ticketId} · Medora`,
			preheader: `Support ticket #${fields.ticketId}: ${fields.subject}`,
			cardBodyHtml: cardBody,
			logoUrl: resolvedLogo,
			brandName: 'Medora',
			maxWidthPx: 560
		}),
		{ logoUrl: resolvedLogo }
	);
	const plainText = [
		`New support ticket #${fields.ticketId}`,
		`Subject: ${fields.subject}`,
		`Priority: ${fields.priority}`,
		fields.contextUrl ? `Context: ${fields.contextUrl}` : null,
		'',
		fields.description
	]
		.filter(Boolean)
		.join('\n');
	return { html, plainText };
}