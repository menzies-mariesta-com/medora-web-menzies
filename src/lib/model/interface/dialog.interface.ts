import type { Component, Snippet } from 'svelte';
import type { DialogVariantEnum } from '../enum/dialog.enum';

export interface DialogSlotProps {
	confirm: (data?: unknown) => void;
	cancel: () => void;
}

export interface DialogOpenOptions<T = unknown> {
	title?: string;
	message?: string;
	variant?: DialogVariantEnum;
	fullScreen?: boolean;
	/** Tailwind classes for the modal box (e.g. max-w-4xl max-h-[90vh]) */
	modalClassName?: string;
	children?: Snippet<[DialogSlotProps]>;
	component?: Component<DialogSlotProps & any>;
	props?: Record<string, any>;
	onClose?: () => void;
	onConfirm?: (data?: T) => void;
	onCancel?: () => void;
}

export interface DialogInterface {
	id: number;
	title?: string;
	message?: string;
	variant?: DialogVariantEnum;
	fullScreen?: boolean;
	modalClassName?: string;
	children?: Snippet<[DialogSlotProps]>;
	component?: Component<DialogSlotProps & any>;
	props?: Record<string, any>;
	onClose?: () => void;
	onConfirm?: (data?: unknown) => void;
	onCancel?: () => void;
	_resolve?: (result: { confirmed: boolean; data?: unknown }) => void;
}
