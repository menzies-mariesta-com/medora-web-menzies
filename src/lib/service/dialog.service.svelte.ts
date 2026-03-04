import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
import type {
	DialogInterface,
	DialogOpenOptions,
	DialogSlotProps
} from '$lib/model/interface/dialog.interface';
import { DialogState } from '$lib/state/dialog.state.svelte';
import type { Component, Snippet } from 'svelte';

export type { DialogOpenOptions };

export type DialogResult<T = unknown> =
	| { confirmed: true; data?: T }
	| { confirmed: false };

export class DialogService {
	open<T = unknown>(
		options: DialogOpenOptions<T>
	): Promise<DialogResult<T>> {
		return new Promise((resolve) => {
			const dialog: DialogInterface = {
				id: Date.now(),
				title: options.title,
				message: options.message,
				variant: options.variant ?? DialogVariantEnum.ALERT,
				fullScreen: options.fullScreen,
				modalClassName: options.modalClassName,
				children: options.children,
				component: options.component,
				onClose: options.onClose,
				onConfirm: options.onConfirm as (data?: unknown) => void,
				onCancel: options.onCancel,
				_resolve: resolve as DialogInterface['_resolve']
			};
			DialogState.current = dialog;
		});
	}

	close(): void {
		this._resolveAndClose({ confirmed: false });
	}

	confirm(data?: unknown): void {
		const current = DialogState.current;
		current?.onConfirm?.(data);
		this._resolveAndClose({ confirmed: true, data });
	}

	cancel(): void {
		const current = DialogState.current;
		current?.onCancel?.();
		this._resolveAndClose({ confirmed: false });
	}

	private _resolveAndClose(result: {
		confirmed: boolean;
		data?: unknown;
	}): void {
		const current = DialogState.current;
		DialogState.current = null;
		if (!result.confirmed) {
			current?.onClose?.();
		}
		current?._resolve?.(result);
	}

	alert(message: string, title?: string, onClose?: () => void): void {
		this.open({
			message,
			title,
			variant: DialogVariantEnum.ALERT,
			onClose
		});
	}

	confirmDialog(
		message: string,
		title?: string,
		onConfirm?: () => void,
		onCancel?: () => void
	): void {
		this.open({
			message,
			title,
			variant: DialogVariantEnum.CONFIRM,
			onConfirm,
			onCancel
		});
	}
}

export const dialogService = new DialogService();
