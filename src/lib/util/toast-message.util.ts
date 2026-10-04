import {
	sanitizeErrorToastMessage,
	toUserFacingErrorDetail
} from '$lib/util/user-facing-error.util';

/**
 * Helpers for user-visible toast copy: consistent, specific wording and optional detail lines.
 * Error details are sanitized so users never see stack traces, HTML, SQL, or JSON dumps.
 */

/**
 * Builds a primary line + optional detail for error toasts (e.g. API/business failure + safe hint).
 */
export function toastErrorParts(
	whatFailed: string,
	err?: unknown
): { message: string; detail?: string } {
	const base = sanitizeErrorToastMessage(whatFailed.trim() || 'Error');
	const detail = toUserFacingErrorDetail(err);
	if (err != null) console.error('[toast-error]', whatFailed, err);
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
	return detail ? `${message}. ${detail}` : message;
}
