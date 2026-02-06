import { command } from '$app/server';
import { sendEmailServer } from '$lib/server/util/mailer.server';

/** Client-callable: same implementation as sendEmailServer. Use sendEmailServer from server code (e.g. auth). */
export const sendEmail = command(
	'unchecked' as const,
	async (payload: { to: string; subject: string; message: string }): Promise<boolean> => {
		return sendEmailServer(payload);
	}
);
