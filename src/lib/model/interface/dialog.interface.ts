import type { Component, Snippet } from 'svelte';
import type { DialogVariantEnum } from '../enum/dialog.enum';

export interface DialogSlotProps {
	confirm: (data?: unknown) => void;
	cancel: () => void;
}

export interface DialogInterface {
	id: number;
	title?: string;
	message?: string;
	variant?: DialogVariantEnum;
	fullScreen?: boolean;
	children?: Snippet<[DialogSlotProps]>;
	component?: Component<DialogSlotProps>;
	onClose?: () => void;
	onConfirm?: (data?: unknown) => void;
	onCancel?: () => void;
	_resolve?: (result: { confirmed: boolean; data?: unknown }) => void;
}
