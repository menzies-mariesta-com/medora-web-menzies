import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
import type {
	DialogInterface,
	DialogSlotProps
} from '$lib/model/interface/dialog.interface';
import { DialogState } from '$lib/state/dialog.state.svelte';
import type { Component, Snippet } from 'svelte';

export interface DialogOpenOptions {
	title?: string;
	message?: string;
	variant?: DialogVariantEnum;
	children?: Snippet<[DialogSlotProps]>;
	component?: Component<DialogSlotProps>;
	onClose?: () => void;
	onConfirm?: (data?: unknown) => void;
	onCancel?: () => void;
}

export type DialogResult<T = unknown> =
	| { confirmed: true; data?: T }
	| { confirmed: false };

export class DialogService {
	open<T = unknown>(options: DialogOpenOptions): Promise<DialogResult<T>> {
		return new Promise((resolve) => {
			const dialog: DialogInterface = {
				id: Date.now(),
				title: options.title,
				message: options.message,
				variant: options.variant ?? DialogVariantEnum.ALERT,
				children: options.children,
				component: options.component,
				onClose: options.onClose,
				onConfirm: options.onConfirm,
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
