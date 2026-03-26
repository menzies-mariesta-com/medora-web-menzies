import type { Component, Snippet } from 'svelte';
import type { DialogVariantEnum } from '../enum/dialog.enum';

export interface DialogSlotProps {
	confirm: (data?: unknown) => void | Promise<void>;
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
	onConfirm?: (data?: T) => void | Promise<void>;
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
	onConfirm?: (data?: unknown) => void | Promise<void>;
	onCancel?: () => void;
	/**
	 * Set to true when an async confirm action is running, so the UI can
	 * disable confirm/cancel and show a loading indicator.
	 */
	confirmPending?: boolean;
	_resolve?: (result: { confirmed: boolean; data?: unknown }) => void;
}
