import { createInterface } from 'node:readline';

/** Prompt on stdin (fresh TOTP when the previous code expired). */
export function promptLine(message: string): Promise<string> {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	return new Promise((resolve) => {
		rl.question(message, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

export async function promptTotpCode(context: string): Promise<string> {
	console.log('');
	console.log(context);
	console.log('Tip: wait for a new code if the last one expired.');
	const raw = await promptLine('6-digit authenticator code: ');
	const code = raw.replace(/\D/g, '').slice(0, 6);
	if (code.length !== 6) {
		throw new Error('A 6-digit code is required.');
	}
	return code;
}
