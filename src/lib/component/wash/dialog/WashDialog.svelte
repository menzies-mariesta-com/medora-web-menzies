<script lang="ts">
	/**
	 * Svelte adapter for Menzies Design Wash Dialog.
	 * @see https://design-menzies.netlify.app/ — Components → Dialog
	 * Mirrors `@menzies-mariesta-com/menzies-design-wash-ui` React Dialog markup:
	 *   <dialog class="modal">
	 *     <div class="modal-box border border-ink-border bg-base-100">…</div>
	 *     <form|div class="modal-backdrop">…</form|div>
	 *   </dialog>
	 * Centering comes from daisyUI `.modal` grid (`items-center` / `justify-items-center`)
	 * + `.modal-box` / `.modal-backdrop` sharing `col-start-1 row-start-1`.
	 */
	import { tick, type Snippet } from 'svelte';
	import gsap from 'gsap';
	import {
		createWashId,
		trapFocus
	} from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';

	type DialogTone = 'primary' | 'secondary' | 'error';
	type DialogLayout = 'default' | 'fullscreen';

	let {
		open = true,
		onClose,
		title,
		description,
		tone = 'primary',
		actions,
		children,
		/** Optional layer above the box (e.g. in-dialog toasts). */
		layer,
		className = '',
		boxClassName = '',
		layout = 'default',
		/** When false, omit `.modal-action` (content owns its footer). */
		showActions = true,
		/** When true and `actions` is unset, render Design ghost Close. */
		showDefaultClose = true,
		id
	}: {
		open?: boolean;
		onClose: () => void;
		title?: string;
		description?: string;
		tone?: DialogTone;
		actions?: Snippet;
		children?: Snippet;
		layer?: Snippet;
		className?: string;
		boxClassName?: string;
		layout?: DialogLayout;
		showActions?: boolean;
		showDefaultClose?: boolean;
		id?: string;
	} = $props();

	let dialogEl = $state<HTMLDialogElement | null>(null);
	let boxEl = $state<HTMLDivElement | null>(null);
	/** Browsers fire dialog `cancel` when an OS file picker is dismissed (Esc/Close). */
	let suppressCancelClose = false;
	let suppressCancelTimer: ReturnType<typeof setTimeout> | null = null;

	const titleId = createWashId('dialog-title');
	const descId = createWashId('dialog-desc');

	const titleToneClass = $derived(
		tone === 'error'
			? 'text-error'
			: tone === 'secondary'
				? 'text-secondary'
				: 'text-primary'
	);

	/** Match Design: `modal-box border border-ink-border bg-base-100` (+ app fullscreen). */
	const resolvedBoxClass = $derived(
		[
			'modal-box border border-ink-border bg-base-100',
			layout === 'fullscreen' ? 'wash-dialog-box--fullscreen' : '',
			boxClassName
		]
			.filter(Boolean)
			.join(' ')
	);

	/** Match Design: `className: ["modal", className]` — do not add `modal-middle`. */
	const dialogClass = $derived(
		['modal', className].filter(Boolean).join(' ')
	);

	const renderActions = $derived(
		showActions && (actions != null || showDefaultClose)
	);

	function armFilePickerCancelGuard() {
		suppressCancelClose = true;
		if (suppressCancelTimer) clearTimeout(suppressCancelTimer);
		suppressCancelTimer = setTimeout(() => {
			suppressCancelClose = false;
			suppressCancelTimer = null;
		}, 1500);
	}

	function isFileInput(target: EventTarget | null): target is HTMLInputElement {
		return target instanceof HTMLInputElement && target.type === 'file';
	}

	$effect(() => {
		if (open && dialogEl) {
			tick().then(() => {
				if (dialogEl && !dialogEl.open) dialogEl.showModal();
			});
		}
	});

	$effect(() => {
		if (!open && dialogEl?.open) {
			dialogEl.close();
		}
	});

	$effect(() => {
		if (!open || !boxEl) return;
		return trapFocus(boxEl);
	});

	$effect(() => {
		if (!open || !dialogEl) return;

		const root = dialogEl;

		function onClickCapture(e: Event) {
			if (isFileInput(e.target)) armFilePickerCancelGuard();
		}

		function onInputCancel(e: Event) {
			if (isFileInput(e.target)) armFilePickerCancelGuard();
		}

		function onWindowFocus() {
			if (!suppressCancelClose) return;
			if (suppressCancelTimer) clearTimeout(suppressCancelTimer);
			suppressCancelTimer = setTimeout(() => {
				suppressCancelClose = false;
				suppressCancelTimer = null;
			}, 300);
		}

		root.addEventListener('click', onClickCapture, true);
		root.addEventListener('cancel', onInputCancel, true);
		window.addEventListener('focus', onWindowFocus);

		return () => {
			root.removeEventListener('click', onClickCapture, true);
			root.removeEventListener('cancel', onInputCancel, true);
			window.removeEventListener('focus', onWindowFocus);
			if (suppressCancelTimer) clearTimeout(suppressCancelTimer);
			suppressCancelClose = false;
		};
	});

	// Enter animation once per open — do not re-run on table/content mutations
	// (GSAP `transform` was fighting daisyUI grid centering on Choose Visit).
	$effect(() => {
		if (!open || !boxEl) return;
		const el = boxEl;
		gsap.fromTo(
			el,
			{ opacity: 0, scale: 0.95 },
			{
				opacity: 1,
				scale: 1,
				duration: 0.25,
				ease: 'power2.out',
				onComplete: () => {
					// Clear inline transform so CSS grid centering stays authoritative.
					gsap.set(el, { clearProps: 'transform,scale,opacity' });
				}
			}
		);
		return () => {
			gsap.killTweensOf(el);
			gsap.set(el, { clearProps: 'transform,scale,opacity' });
		};
	});

	function handleClose() {
		onClose();
	}

	function handleCancel(e: Event) {
		e.preventDefault();
		if (suppressCancelClose) return;
		onClose();
	}
</script>

<dialog
	bind:this={dialogEl}
	{id}
	class={dialogClass}
	aria-labelledby={title ? titleId : undefined}
	aria-describedby={description ? descId : undefined}
	onclose={handleClose}
	oncancel={handleCancel}
>
	<div bind:this={boxEl} class={resolvedBoxClass} role="document">
		{#if title}
			<h2
				id={titleId}
				class="card-title font-bold {titleToneClass} {layout ===
				'fullscreen'
					? 'shrink-0 px-4 pt-4'
					: ''}"
			>
				{title}
			</h2>
		{/if}
		{#if description}
			<p
				id={descId}
				class="py-2 text-sm text-ink-muted {layout === 'fullscreen'
					? 'shrink-0 px-4'
					: ''}"
			>
				{description}
			</p>
		{/if}
		{#if children}
			{#if layout === 'fullscreen'}
				<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
					{@render children()}
				</div>
			{:else}
				{@render children()}
			{/if}
		{/if}
		{#if renderActions}
			<div class="modal-action">
				{#if actions}
					{@render actions()}
				{:else}
					<WashButton variant="ghost" onClick={onClose}>Close</WashButton>
				{/if}
			</div>
		{/if}
	</div>
	<!-- Visual dimmer only — do not close on outside click (Design uses form method=dialog). -->
	<div class="modal-backdrop" aria-hidden="true"></div>
	{#if layer}
		<!-- Absolute overlay; not a grid item that can displace the box. -->
		<div class="pointer-events-none absolute inset-0 z-[10001]">
			<div class="pointer-events-auto contents">
				{@render layer()}
			</div>
		</div>
	{/if}
</dialog>
