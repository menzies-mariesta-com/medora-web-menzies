<script lang="ts">
	/**
	 * Svelte adapter for Menzies Design Wash Dialog (web 1.3.0).
	 * @see https://design-menzies.netlify.app/ — Components → Dialog
	 *
	 * DialogTemplate slot mapping (Design recipe names → this adapter):
	 *   header → title | header
	 *   desc → description | desc
	 *   contents → children | contents
	 *   actions → actions
	 *
	 * Sectioned chrome matches Design Dialog:
	 *   header band → separator → scroll body → separator → modal-action
	 *
	 * Medora exception: backdrop is visual-only (no outside-click close).
	 * Design uses `<form method="dialog">` which closes on backdrop click.
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
		/** DialogTemplate alias for `title`. */
		header,
		/** DialogTemplate alias for `description`. */
		desc,
		tone = 'primary',
		actions,
		children,
		/** DialogTemplate alias for `children`. */
		contents,
		/** Optional layer above the box (e.g. in-dialog toasts). */
		layer,
		className = '',
		boxClassName = '',
		layout = 'default',
		/** When false, omit shell `.modal-action` (content owns footer via WashDialogFooter). */
		showActions = true,
		/** When true and `actions` is unset, render Design ghost Close. */
		showDefaultClose = true,
		id
	}: {
		open?: boolean;
		onClose: () => void;
		title?: string;
		description?: string;
		header?: string | Snippet;
		desc?: string | Snippet;
		tone?: DialogTone;
		actions?: Snippet;
		children?: Snippet;
		contents?: Snippet;
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

	const resolvedTitle = $derived(title ?? (typeof header === 'string' ? header : undefined));
	const resolvedDescription = $derived(
		description ?? (typeof desc === 'string' ? desc : undefined)
	);
	const headerSnippet = $derived(typeof header === 'function' ? header : null);
	const descSnippet = $derived(typeof desc === 'function' ? desc : null);
	const bodySnippet = $derived(contents ?? children);
	const hasHeader = $derived(
		Boolean(resolvedTitle) ||
			headerSnippet != null ||
			Boolean(resolvedDescription) ||
			descSnippet != null
	);
	const hasBody = $derived(bodySnippet != null);

	const titleToneClass = $derived(
		tone === 'error'
			? 'text-error'
			: tone === 'secondary'
				? 'text-secondary'
				: 'text-primary'
	);

	/** Match Design Dialog 1.3: flex column, p-0, capped height (+ app fullscreen). */
	const resolvedBoxClass = $derived(
		[
			'modal-box flex max-h-[min(90vh,40rem)] flex-col border border-ink-border bg-base-100 p-0',
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
		const tween = gsap.fromTo(
			el,
			{ opacity: 0, scale: 0.95 },
			{
				opacity: 1,
				scale: 1,
				duration: 0.25,
				ease: 'power2.out',
				overwrite: true,
				onComplete: () => {
					// Clear inline transform so CSS grid centering stays authoritative.
					gsap.set(el, { clearProps: 'transform,scale,opacity' });
				}
			}
		);
		return () => {
			tween.kill();
			// Never leave opacity:0 after HMR / rapid remount.
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
	aria-labelledby={hasHeader ? titleId : undefined}
	aria-describedby={resolvedDescription || descSnippet ? descId : undefined}
	onclose={handleClose}
	oncancel={handleCancel}
>
	<div bind:this={boxEl} class={resolvedBoxClass} role="document">
		{#if hasHeader}
			<div class="shrink-0 px-4 pt-4 pb-3">
				{#if resolvedTitle}
					<h2 id={titleId} class="card-title font-bold {titleToneClass}">
						{resolvedTitle}
					</h2>
				{:else if headerSnippet}
					<h2 id={titleId} class="card-title font-bold {titleToneClass}">
						{@render headerSnippet()}
					</h2>
				{/if}
				{#if resolvedDescription}
					<p id={descId} class="text-ink-muted mt-0.5 text-xs">
						{resolvedDescription}
					</p>
				{:else if descSnippet}
					<p id={descId} class="text-ink-muted mt-0.5 text-xs">
						{@render descSnippet()}
					</p>
				{/if}
			</div>
		{/if}

		{#if hasBody && bodySnippet}
			{#if showActions}
				<!-- Design: separator + scroll body when shell owns actions -->
				<div class="border-base-300 shrink-0 border-t" role="separator"></div>
				<div
					class="min-h-0 flex-1 overflow-y-auto px-4 py-3 {layout ===
					'fullscreen'
						? 'flex flex-col overflow-hidden p-0'
						: ''}"
				>
					{@render bodySnippet()}
				</div>
			{:else}
				<!--
					Content owns footer (WashDialogFooter): pad the column so form
					fields match header/footer insets. Keep overflow on the form
					child (not this column) so WashDialogFooter stays pinned.
					Footer uses -mx-4 for a full-bleed separator, then px-4 on actions.
				-->
				<div class="border-base-300 shrink-0 border-t" role="separator"></div>
				<div
					class="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-3 {layout ===
					'fullscreen'
						? 'p-0'
						: ''}"
				>
					{@render bodySnippet()}
				</div>
			{/if}
		{/if}

		{#if renderActions}
			<div class="border-base-300 shrink-0 border-t" role="separator"></div>
			<div class="modal-action mt-0 shrink-0 px-4 py-3">
				{#if actions}
					{@render actions()}
				{:else}
					<WashButton variant="ghost" onClick={onClose}>Close</WashButton>
				{/if}
			</div>
		{/if}
	</div>
	<!-- Visual dimmer only — do not close on outside click (Medora exception vs Design form method=dialog). -->
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
