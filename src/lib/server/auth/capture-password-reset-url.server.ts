/** One-shot capture of Better Auth reset URL (skip standalone reset email). */
let pending: {
	email: string;
	resolve: (url: string) => void;
	reject: (err: Error) => void;
} | null = null;

const CAPTURE_MS = 30_000;

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function beginPasswordResetUrlCapture(email: string): Promise<string> {
	const normalized = normalizeEmail(email);
	if (pending) {
		return Promise.reject(new Error('Password reset capture already in progress'));
	}
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			if (pending?.email === normalized) pending = null;
			reject(new Error('Password reset URL capture timed out'));
		}, CAPTURE_MS);
		pending = {
			email: normalized,
			resolve: (url) => {
				clearTimeout(timer);
				pending = null;
				resolve(url);
			},
			reject: (err) => {
				clearTimeout(timer);
				pending = null;
				reject(err);
			}
		};
	});
}

export function tryConsumePasswordResetCapture(
	email: string,
	url: string
): boolean {
	const normalized = normalizeEmail(email);
	if (!pending || pending.email !== normalized) return false;
	pending.resolve(url);
	return true;
}
