import { m } from '$lib/paraglide/messages';

/**
 * Turn unknown failures into short, reader-friendly copy for UI (toasts, alerts).
 * Logs stay detailed via console.error at call sites; this never returns stack/SQL/HTML/JSON dumps.
 */

const MAX_SAFE_LEN = 180;

type MsgFn = (inputs?: Record<string, never>) => string;

function msg(): Record<string, MsgFn> {
	return m as unknown as Record<string, MsgFn>;
}

function fallbackGeneric(): string {
	const key = msg().error_generic;
	return typeof key === 'function'
		? key()
		: 'Something went wrong. Please try again.';
}

/** HTTP status → localized user story. */
export function userFacingMessageForHttpStatus(status: number): string {
	const mapi = msg();
	const pick = (key: string, en: string) =>
		typeof mapi[key] === 'function' ? mapi[key]() : en;

	if (status === 0) {
		return pick(
			'error_network',
			'Could not reach the server. Check your connection and try again.'
		);
	}
	if (status === 401) {
		return pick('error_unauthorized', 'Please sign in again to continue.');
	}
	if (status === 403) {
		return pick(
			'error_forbidden',
			'You do not have permission to do that.'
		);
	}
	if (status === 404) {
		return pick('error_not_found', 'The requested item was not found.');
	}
	if (status === 408 || status === 504) {
		return pick('error_timeout', 'The request took too long. Please try again.');
	}
	if (status === 409) {
		return pick(
			'error_conflict',
			'This change conflicts with the current data. Refresh and try again.'
		);
	}
	if (status === 422 || status === 400) {
		return pick(
			'error_validation',
			'Some of the information entered is not valid. Check the form and try again.'
		);
	}
	if (status === 429) {
		return pick(
			'error_rate_limited',
			'Too many requests. Wait a moment and try again.'
		);
	}
	if (status >= 500) {
		return pick(
			'error_server',
			'The server could not complete this request. Please try again later.'
		);
	}
	return pick('error_generic', 'Something went wrong. Please try again.');
}

function looksLikeHtml(text: string): boolean {
	const t = text.trim().toLowerCase();
	return (
		t.startsWith('<!doctype') ||
		t.startsWith('<html') ||
		t.includes('<pre') ||
		t.includes('<body') ||
		t.includes('</html>') ||
		(t.includes('<') && t.includes('>') && t.includes('http'))
	);
}

function looksLikeStack(text: string): boolean {
	return (
		/\bat\s+\S+\s+\(/.test(text) ||
		/\bat\s+[A-Za-z0-9_$.]+\s+\(/.test(text) ||
		/^\s*at\s+/m.test(text) ||
		text.includes('Traceback (most recent call last)') ||
		text.includes('Caused by:') ||
		/\n\s+at\s+/.test(text)
	);
}

function looksLikeSql(text: string): boolean {
	// Prefer SQL-ish shapes; avoid matching plain English like "Select a store".
	return (
		/\b(INSERT INTO|DELETE FROM|ALTER TABLE|CREATE TABLE)\b/i.test(text) ||
		/\bSELECT\s+.+\bFROM\b/i.test(text) ||
		/\bUPDATE\s+\w+\s+SET\b/i.test(text) ||
		/\brelation\s+"[^"]+"/i.test(text) ||
		/\bsyntax error at/i.test(text) ||
		/\bviolates\s+(unique|foreign key|check)\s+constraint\b/i.test(text)
	);
}

function looksLikeFilePath(text: string): boolean {
	return (
		/\/home\/\w+/.test(text) ||
		/\/Users\/\w+/.test(text) ||
		/[A-Za-z]:\\/.test(text) ||
		/node_modules[/\\]/.test(text) ||
		/src\/(lib|routes)\//.test(text) ||
		/\.(ts|js|svelte|py|go):\d+/.test(text)
	);
}

function looksLikeZodDump(text: string): boolean {
	return (
		/\binvalid_type\b/.test(text) ||
		/\bValidation error\b/i.test(text) ||
		/\bExpected\s+\w+,\s*received\b/i.test(text) ||
		/\bRequired at\b/.test(text) ||
		/"code"\s*:\s*"invalid_/.test(text) ||
		/\bZodError\b/.test(text)
	);
}

function looksLikeBareStatus(text: string): boolean {
	const t = text.trim();
	if (/^\d{3}$/.test(t)) return true;
	if (/^(ok|error|fail(ed)?)$/i.test(t)) return true;
	return /^(internal server error|bad request|unauthorized|forbidden|not found|conflict|unprocessable entity|service unavailable|gateway timeout)$/i.test(
		t
	);
}

function looksLikeDevParamSpeak(text: string): boolean {
	// e.g. storeId required, amountPaid is required, Invalid invoiceDate
	if (/^[a-z]+[A-Z][A-Za-z0-9]*\b/.test(text.trim())) return true;
	if (/\b[a-z]+[A-Z][A-Za-z0-9]*\s+(is\s+)?required\b/.test(text)) return true;
	if (/^Invalid [a-z]+[A-Z]/.test(text.trim())) return true;
	return false;
}

/** True when the string is unsafe or useless as end-user copy. */
export function isTechnicalErrorText(text: string): boolean {
	const t = text.trim();
	if (!t) return true;
	if (t.length > MAX_SAFE_LEN) return true;
	if (looksLikeHtml(t)) return true;
	if (looksLikeStack(t)) return true;
	if (looksLikeSql(t)) return true;
	if (looksLikeFilePath(t)) return true;
	if (looksLikeZodDump(t)) return true;
	if (looksLikeBareStatus(t)) return true;
	if (looksLikeDevParamSpeak(t)) return true;
	// Multi-line dumps
	if ((t.match(/\n/g) ?? []).length >= 3) return true;
	return false;
}

function tryExtractFromJsonBlob(raw: string): string | undefined {
	const t = raw.trim();
	if (!(t.startsWith('{') || t.startsWith('['))) return undefined;
	try {
		const parsed = JSON.parse(t) as unknown;
		if (parsed == null) return undefined;
		if (typeof parsed === 'string') return parsed.trim() || undefined;
		if (typeof parsed !== 'object') return undefined;
		const o = parsed as Record<string, unknown>;
		for (const key of ['message', 'error', 'detail', 'title', 'description']) {
			const v = o[key];
			if (typeof v === 'string' && v.trim()) return v.trim();
		}
		// SvelteKit HttpError shape sometimes nests body
		const body = o.body;
		if (body && typeof body === 'object') {
			const b = body as Record<string, unknown>;
			for (const key of ['message', 'error', 'detail']) {
				const v = b[key];
				if (typeof v === 'string' && v.trim()) return v.trim();
			}
		}
	} catch {
		// Not JSON; treat as technical if it looked like an object dump
		return undefined;
	}
	return undefined;
}

function extractCandidate(raw: string): string | undefined {
	const t = raw.trim();
	if (!t) return undefined;
	const fromJson = tryExtractFromJsonBlob(t);
	if (fromJson !== undefined) return fromJson;
	// Strip a single "Error: " prefix from Error#message
	const stripped = t.replace(/^Error:\s*/i, '').trim();
	return stripped || undefined;
}

/**
 * Sanitize a string that might be shown as toast message/detail.
 * Returns undefined when nothing reader-friendly can be shown (caller uses title only / status fallback).
 */
export function sanitizeUserFacingErrorText(
	raw: string | undefined | null,
	opts?: { status?: number }
): string | undefined {
	if (raw == null) return undefined;
	const candidate = extractCandidate(String(raw));
	if (!candidate) {
		return opts?.status != null
			? userFacingMessageForHttpStatus(opts.status)
			: undefined;
	}
	if (isTechnicalErrorText(candidate)) {
		return opts?.status != null
			? userFacingMessageForHttpStatus(opts.status)
			: undefined;
	}
	// Soften long dashes if any slipped in
	return candidate.replace(/[—–]/g, '-');
}

function coerceUnknownToString(err: unknown): {
	text?: string;
	status?: number;
} {
	if (err == null) return {};
	if (typeof err === 'number' && Number.isFinite(err)) {
		return { status: err };
	}
	if (typeof err === 'string') return { text: err };
	if (err instanceof Error) {
		const anyErr = err as Error & { status?: number; statusCode?: number };
		const status =
			typeof anyErr.status === 'number'
				? anyErr.status
				: typeof anyErr.statusCode === 'number'
					? anyErr.statusCode
					: undefined;
		return { text: err.message, status };
	}
	if (typeof err === 'object') {
		const o = err as Record<string, unknown>;
		const status =
			typeof o.status === 'number'
				? o.status
				: typeof o.statusCode === 'number'
					? o.statusCode
					: undefined;
		for (const key of ['message', 'error', 'detail']) {
			if (typeof o[key] === 'string' && String(o[key]).trim()) {
				return { text: String(o[key]), status };
			}
		}
		// SvelteKit HttpError: { body: { message } }
		const body = o.body;
		if (body && typeof body === 'object') {
			const b = body as Record<string, unknown>;
			if (typeof b.message === 'string' && b.message.trim()) {
				return { text: b.message, status };
			}
		}
		try {
			return { text: JSON.stringify(o), status };
		} catch {
			return { status };
		}
	}
	return { text: String(err) };
}

/**
 * Map an unknown error (or response body text) to optional user-facing detail.
 * Prefer a known safe phrase; otherwise a status-based story; otherwise undefined.
 */
export function toUserFacingErrorDetail(
	err: unknown,
	opts?: { status?: number; fallback?: string }
): string | undefined {
	const { text, status: fromErr } = coerceUnknownToString(err);
	const status = opts?.status ?? fromErr;
	const sanitized = sanitizeUserFacingErrorText(text, { status });
	if (sanitized) return sanitized;
	if (opts?.fallback?.trim()) {
		const fb = sanitizeUserFacingErrorText(opts.fallback);
		if (fb) return fb;
	}
	if (status != null) return userFacingMessageForHttpStatus(status);
	return undefined;
}

/**
 * Read a failed Response for UI: log the raw body, return a safe detail string.
 */
export async function userFacingDetailFromResponse(
	res: Response
): Promise<string> {
	const text = await res.text().catch(() => '');
	if (text) {
		console.error('[http-error]', res.status, text.slice(0, 500));
	} else {
		console.error('[http-error]', res.status);
	}
	return (
		toUserFacingErrorDetail(text, { status: res.status }) ??
		userFacingMessageForHttpStatus(res.status)
	);
}

/**
 * Throw an Error whose message is already safe for UI (status-aware).
 * Prefer catching and calling addErrorToast(title, e) afterward.
 */
export async function throwUserFacingHttpError(
	res: Response
): Promise<never> {
	const detail = await userFacingDetailFromResponse(res);
	const err = new Error(detail) as Error & { status: number };
	err.status = res.status;
	throw err;
}

/** Ensure primary ERROR toast title is never a developer dump. */
export function sanitizeErrorToastMessage(message: string): string {
	const cleaned = sanitizeUserFacingErrorText(message);
	return cleaned ?? fallbackGeneric();
}
