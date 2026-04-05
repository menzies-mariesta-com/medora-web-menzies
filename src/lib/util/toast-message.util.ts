/**
 * Helpers for user-visible toast copy: consistent, specific wording and optional detail lines.
 */

function stringifyUnknown(err: unknown): string | undefined {
	if (err == null) return undefined;
	if (typeof err === 'string') {
		const t = err.trim();
		return t !== '' ? t : undefined;
	}
	if (err instanceof Error) {
		const t = err.message?.trim();
		return t !== '' ? t : undefined;
	}
	if (typeof err === 'object' && err !== null) {
		const o = err as Record<string, unknown>;
		if (typeof o.error === 'string' && o.error.trim() !== '') {
			return o.error.trim();
		}
		if (typeof o.message === 'string' && o.message.trim() !== '') {
			return o.message.trim();
		}
	}
	return undefined;
}

/**
 * Builds a primary line + optional detail for error toasts (e.g. API/business failure + server message).
 */
export function toastErrorParts(
	whatFailed: string,
	err?: unknown
): { message: string; detail?: string } {
	const detail = stringifyUnknown(err);
	const base = whatFailed.trim();
	if (!detail) return { message: base };
	if (detail === base) return { message: base };
	return {
		message: base,
		detail
	};
}

/**
 * Single-line error toast text when detail is not needed.
 */
export function toastErrorLine(whatFailed: string, err?: unknown): string {
	const { message, detail } = toastErrorParts(whatFailed, err);
	return detail ? `${message} — ${detail}` : message;
}
