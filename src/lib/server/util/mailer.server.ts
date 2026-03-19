import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';
import { log } from '$lib/logger';

function createTransporter() {
	return nodemailer.createTransport({
		host: env.SMTP_HOST,
		port: Number(env.SMTP_PORT),
		secure: false,
		auth: {
			user: env.SMTP_USER,
			pass: env.SMTP_PASS
		}
	});
}

/** Server-only: for use from auth or server routes. Commands cannot be called during SSR. */
export async function sendEmailServer(payload: {
	to: string;
	subject: string;
	message: string;
	html?: string;
}): Promise<boolean> {
	try {
		const transporter = createTransporter();
		await transporter.sendMail({
			from: `"Heka System" <${env.SMTP_USER}>`,
			to: payload.to,
			subject: payload.subject,
			text: payload.message,
			html: payload.html ?? `<p>${payload.message}</p>`
		});
		return true;
	} catch (err) {
		log.error(
			'Failed to send email',
			err instanceof Error ? err : new Error(String(err))
		);
		return false;
	}
}
