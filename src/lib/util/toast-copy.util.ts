import type { ToastService } from '$lib/service/toast.service.svelte';

/**
 * Toast copy helpers.
 *
 * This keeps toast wording consistent across the app while still letting each
 * feature pass in localized entity/action labels (via `m.*`).
 */

export function toastLine(entity: string, action: string): string {
	const e = String(entity ?? '').trim();
	const a = String(action ?? '').trim();
	if (!e && !a) return '';
	if (!e) return a;
	if (!a) return e;
	return `${e} ${a}`;
}

export function toastSuccess(
	toast: ToastService,
	entity: string,
	action: string,
	detail?: string
) {
	toast.addSuccessToast(toastLine(entity, action), detail);
}

export function toastInfo(
	toast: ToastService,
	entity: string,
	action: string,
	detail?: string
) {
	toast.addInfoToast(toastLine(entity, action), detail);
}

export function toastWarning(
	toast: ToastService,
	entity: string,
	action: string,
	detail?: string
) {
	toast.addWarningToast(toastLine(entity, action), detail);
}

export function toastError(
	toast: ToastService,
	entity: string,
	actionFailed: string,
	err?: unknown
) {
	toast.addErrorToast(toastLine(entity, actionFailed), err);
}

