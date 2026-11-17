import { join } from 'node:path';
import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';
import {
	EMAIL_LOGO_CID,
	EMAIL_LOGO_PATH,
	emailLogoSrcForSend
} from '$lib/asset/email/email-brand';
import { log } from '$lib/logger';

const emailLogoFilePath = join(process.cwd(), 'static', EMAIL_LOGO_PATH.replace(/^\//, ''));

function trimEnv(value: string | undefined): string {
	return (value ?? '').trim();
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
	if (cachedTransporter) return cachedTransporter;
	const host = trimEnv(env.SMTP_HOST);
	const port = Number(trimEnv(env.SMTP_PORT) || '587');
	const user = trimEnv(env.SMTP_USER);
	const pass = trimEnv(env.SMTP_PASS);
	// 465 = implicit TLS; 587 = STARTTLS (Namecheap Private Email default)
	const secure = port === 465;

	cachedTransporter = nodemailer.createTransport({
		host,
		port,
		secure,
		...(secure ? {} : { requireTLS: true }),
		auth: {
			user,
			pass
		}
	});
	return cachedTransporter;
}

/** Server-only: for use from auth or server routes. Commands cannot be called during SSR. */
export async function sendEmailServer(payload: {
	to: string;
	subject: string;
	message: string;
	html?: string;
}): Promise<boolean> {
	const user = trimEnv(env.SMTP_USER);
	const host = trimEnv(env.SMTP_HOST);
	const port = trimEnv(env.SMTP_PORT) || '587';

	try {
		const transporter = getTransporter();
		const html = payload.html ?? `<p>${payload.message}</p>`;
		const attachments =
			html.includes(emailLogoSrcForSend()) ?
				[
					{
						filename: 'medora-logo-email.png',
						path: emailLogoFilePath,
						cid: EMAIL_LOGO_CID
					}
				]
			:	undefined;
		await transporter.sendMail({
			from: `"Medora" <${user}>`,
			to: payload.to,
			subject: payload.subject,
			text: payload.message,
			html,
			...(attachments ? { attachments } : {})
		});
		return true;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		// Log host/user/port for diagnosis; never log the password.
		log.error(
			`Failed to send email (SMTP host=${host} port=${port} user=${user}): ${message}`,
			err instanceof Error ? err : new Error(message)
		);
		return false;
	}
}
