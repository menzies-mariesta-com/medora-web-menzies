import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';
import { log } from '$lib/logger';

function trimEnv(value: string | undefined): string {
	return (value ?? '').trim();
}

function createTransporter() {
	const host = trimEnv(env.SMTP_HOST);
	const port = Number(trimEnv(env.SMTP_PORT) || '587');
	const user = trimEnv(env.SMTP_USER);
	const pass = trimEnv(env.SMTP_PASS);
	// 465 = implicit TLS; 587 = STARTTLS (Namecheap Private Email default)
	const secure = port === 465;

	return nodemailer.createTransport({
		host,
		port,
		secure,
		...(secure ? {} : { requireTLS: true }),
		auth: {
			user,
			pass
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
	const user = trimEnv(env.SMTP_USER);
	const host = trimEnv(env.SMTP_HOST);
	const port = trimEnv(env.SMTP_PORT) || '587';

	try {
		const transporter = createTransporter();
		await transporter.sendMail({
			from: `"Medora" <${user}>`,
			to: payload.to,
			subject: payload.subject,
			text: payload.message,
			html: payload.html ?? `<p>${payload.message}</p>`
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
