/**
 * Shared building blocks for Medora transactional email HTML.
 * Table-based fragments for clients that strip `<div>` layout.
 */
import { escapeHtml } from './email-escape';

export const EMAIL_SUPPORT_EMAIL = 'menzies@mariesta.com';

const TEAL = '#0d9488';
const TEAL_DARK = '#134e4a';
const TEXT = '#475569';
const MUTED = '#64748b';
const FOOTER = '#6b7280';

/** Hidden inbox preview line (keep under ~130 chars). */
export function emailPreheaderBlock(preheader: string): string {
	const safe = escapeHtml(preheader.trim());
	return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;height:0;width:0;">${safe}</div>`;
}

/** Logo + wordmark row — requires {{logoUrl}} and {{brandName}} already substituted. */
export function emailBrandHeaderRow(logoUrl: string, brandName: string): string {
	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;border-collapse:collapse;">
	<tr>
		<td style="vertical-align:middle;padding-right:10px;width:40px;">
			<img src="${logoUrl}" alt="${escapeHtml(brandName)}" width="36" height="36" style="display:block;width:36px;height:36px;border:0;border-radius:8px;" />
		</td>
		<td style="vertical-align:middle;">
			<span style="font-size:18px;font-weight:600;letter-spacing:-0.02em;color:${TEAL};">${escapeHtml(brandName)}</span>
		</td>
	</tr>
</table>`;
}

export function emailPrimaryButton(href: string, label: string): string {
	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;border-collapse:collapse;">
	<tr>
		<td style="border-radius:10px;background:${TEAL};">
			<a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;background:${TEAL};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:10px;mso-padding-alt:0;">${escapeHtml(label)}</a>
		</td>
	</tr>
</table>`;
}

export function emailDetailsTable(rows: [string, string][]): string {
	const cells = rows
		.map(
			([label, value]) =>
				`<tr>
			<td style="padding:10px 12px;font-size:13px;color:${MUTED};font-weight:600;width:38%;vertical-align:top;border-bottom:1px solid #e2e8f0;">${escapeHtml(label)}</td>
			<td style="padding:10px 12px;font-size:14px;color:#334155;line-height:1.5;vertical-align:top;border-bottom:1px solid #e2e8f0;">${escapeHtml(value)}</td>
		</tr>`
		)
		.join('');
	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin:0 0 8px;">
		${cells}
	</table>`;
}

export function emailCardFootnote(text: string): string {
	return `<p style="margin:24px 0 0;font-size:13px;line-height:1.55;color:#9ca3af;">${escapeHtml(text)}</p>`;
}

export function emailOuterFooter(supportEmail = EMAIL_SUPPORT_EMAIL): string {
	return `<p style="margin:20px auto 0;max-width:520px;text-align:center;font-size:12px;line-height:1.5;color:${FOOTER};">
		Need help? <a href="mailto:${escapeHtml(supportEmail)}" style="color:${TEAL};text-decoration:none;">${escapeHtml(supportEmail)}</a><br />
		Sent with care by Medora · hospital operations, simplified.
	</p>`;
}

export type EmailShellParams = {
	pageTitle: string;
	preheader: string;
	/** Inner HTML inside the white card (headings, copy, CTAs). */
	cardBodyHtml: string;
	logoUrl: string;
	brandName: string;
	maxWidthPx?: number;
};

/** Full HTML document with accent bar, brand header, and support footer. */
export function buildMedoraEmailDocument(params: EmailShellParams): string {
	const {
		pageTitle,
		preheader,
		cardBodyHtml,
		logoUrl,
		brandName,
		maxWidthPx = 480
	} = params;
	const header = emailBrandHeaderRow(logoUrl, brandName);
	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta name="color-scheme" content="light" />
	<meta name="supported-color-schemes" content="light" />
	<title>${escapeHtml(pageTitle)}</title>
</head>
<body style="margin:0;padding:28px 16px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:#ecfaf5;-webkit-text-size-adjust:100%;">
	${emailPreheaderBlock(preheader)}
	<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
		<tr>
			<td align="center">
				<div style="max-width:${maxWidthPx}px;margin:0 auto;background:#ffffff;border-radius:16px;box-shadow:0 4px 12px rgba(13,148,136,0.12);overflow:hidden;border:1px solid rgba(13,148,136,0.15);">
					<div style="height:4px;background:linear-gradient(90deg,${TEAL},#70ecad);"></div>
					<div style="padding:32px 28px;">
						${header}
						${cardBodyHtml}
					</div>
				</div>
				${emailOuterFooter()}
			</td>
		</tr>
	</table>
</body>
</html>`;
}

export const emailHeadingStyle = `margin:0 0 12px;font-size:22px;font-weight:600;line-height:1.3;color:${TEAL_DARK};`;
export const emailLeadStyle = `margin:0 0 20px;font-size:15px;line-height:1.55;color:${TEXT};`;