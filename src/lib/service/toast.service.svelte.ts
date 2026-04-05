import { StatusColorEnum } from '$lib/model/enum/color.enum';
import type { ToastInterface } from '$lib/model/interface/toast.interface';
import { ToastState } from '$lib/state/toast.state.svelte';
import { toastErrorParts } from '$lib/util/toast-message.util';

let nextToastId = 1;

/** Remove a toast by id (e.g. dismiss button). Safe if the toast was already removed. */
export function dismissToast(id: number) {
	const index = ToastState.findIndex((a) => a.id === id);
	if (index !== -1) {
		ToastState.splice(index, 1);
	}
}

export class ToastService {
	/**
	 * @param message Primary line (what happened).
	 * @param type Visual severity + icon (success / info / warning / error).
	 * @param detail Optional second line (e.g. API message, field hint). Longer toasts stay visible slightly longer.
	 */
	addToast(message: string, type: StatusColorEnum, detail?: string) {
		const newToast: ToastInterface = {
			id: nextToastId++,
			message,
			type,
			...(detail?.trim() ? { detail: detail.trim() } : {})
		};
		ToastState.push(newToast);

		const ms = detail?.trim() ? 8000 : 5000;
		setTimeout(() => this.removeToast(newToast.id), ms);
	}

	/** Shorthand for {@link addToast} with success styling. */
	addSuccessToast(message: string, detail?: string) {
		this.addToast(message, StatusColorEnum.SUCCESS, detail);
	}

	/** Shorthand for {@link addToast} with info styling. */
	addInfoToast(message: string, detail?: string) {
		this.addToast(message, StatusColorEnum.INFO, detail);
	}

	/** Shorthand for {@link addToast} with warning styling. */
	addWarningToast(message: string, detail?: string) {
		this.addToast(message, StatusColorEnum.WARNING, detail);
	}

	/**
	 * Error toast with optional `Error` / string / `{ message }` merged into detail.
	 * @param whatFailed Short label, e.g. "Could not save patient".
	 */
	addErrorToast(whatFailed: string, err?: unknown) {
		const { message, detail } = toastErrorParts(whatFailed, err);
		this.addToast(message, StatusColorEnum.ERROR, detail);
	}

	removeToast(id: number) {
		dismissToast(id);
	}

	clearAll() {
		ToastState.splice(0, ToastState.length);
	}
}
