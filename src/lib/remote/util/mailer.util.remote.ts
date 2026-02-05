import { command } from '$app/server';
import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

class NodeMailerUtil {
	private transporter = nodemailer.createTransport({
		host: env.SMTP_HOST,
		port: Number(env.SMTP_PORT),
		secure: false,
		auth: {
			user: env.SMTP_USER,
			pass: env.SMTP_PASS
		}
	});

	async sendEmail(
		to: string,
		subject: string,
		message: string
	): Promise<boolean> {
		try {
			await this.transporter.sendMail({
				from: `"Heka System" <${env.SMTP_USER}>`,
				to,
				subject,
				text: message,
				html: `<p>${message}</p>`
			});

			return true;
		} catch (err) {
			console.error(err);
			return false;
		}
	}
}

export const sendEmail = command(
	'unchecked' as const,
	async (payload: { to: string; subject: string; message: string }): Promise<boolean> => {
		const mailer = new NodeMailerUtil();
		return mailer.sendEmail(payload.to, payload.subject, payload.message);
	}
);
