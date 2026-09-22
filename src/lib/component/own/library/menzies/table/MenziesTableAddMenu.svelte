<!--
	Design Data table multi-create Add: icon-only Plus; hover opens option menu.
	Always opens upward. Menu is portaled to `document.body` (fixed) so it escapes
	MenziesTable shell `overflow-hidden` (needed for rounded-box corners) and the
	shell hover `transform` containing-block.
	WashTooltip stays on the Plus (no `title` — that would duplicate the tip).
-->
<script lang="ts">
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import { onMount } from 'svelte';

	export type MenziesTableAddMenuOption = {
		label: string;
		onSelect: () => void;
		disabled?: boolean;
	};

	let {
		options,
		disabled = false,
		addLabel = 'Add'
	}: {
		options: MenziesTableAddMenuOption[];
		disabled?: boolean;
		addLabel?: string;
	} = $props();

	let rootEl = $state<HTMLDivElement | null>(null);
	let panelEl = $state<HTMLUListElement | null>(null);
	let open = $state(false);
	/** Fixed coords — always above the Plus, end-aligned. */
	let panelStyle = $state('');
	let closeTimer: ReturnType<typeof setTimeout> | null = null;

	function clearCloseTimer() {
		if (closeTimer) {
			clearTimeout(closeTimer);
			closeTimer = null;
		}
	}

	function updatePanelStyle() {
		const el = rootEl;
		if (!el || typeof window === 'undefined') return;
		const rect = el.getBoundingClientRect();
		const gap = 4;
		panelStyle = [
			`bottom:${window.innerHeight - rect.top + gap}px`,
			`right:${window.innerWidth - rect.right}px`
		].join(';');
	}

	function openMenu() {
		if (disabled) return;
		clearCloseTimer();
		updatePanelStyle();
		open = true;
	}

	function scheduleClose() {
		clearCloseTimer();
		closeTimer = setTimeout(() => {
			open = false;
			closeTimer = null;
		}, 150);
	}

	function keepOpen() {
		clearCloseTimer();
		open = true;
	}

	function handleFocusOut(e: FocusEvent) {
		const next = e.relatedTarget as Node | null;
		if (rootEl?.contains(next) || panelEl?.contains(next)) return;
		scheduleClose();
	}

	/** Mount under `body` so shell overflow-hidden cannot clip the menu. */
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	}

	onMount(() => {
		const onReposition = () => {
			if (open) updatePanelStyle();
		};
		window.addEventListener('resize', onReposition);
		window.addEventListener('scroll', onReposition, true);
		return () => {
			window.removeEventListener('resize', onReposition);
			window.removeEventListener('scroll', onReposition, true);
			clearCloseTimer();
		};
	});

	$effect(() => {
		if (!open) return;
		const onPointerDown = (e: PointerEvent) => {
			const t = e.target as Node;
			if (rootEl?.contains(t) || panelEl?.contains(t)) return;
			open = false;
		};
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') open = false;
		};
		document.addEventListener('pointerdown', onPointerDown, true);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown, true);
			document.removeEventListener('keydown', onKeyDown);
		};
	});
</script>

<div
	bind:this={rootEl}
	class="relative inline-flex"
	role="group"
	onmouseenter={openMenu}
	onmouseleave={scheduleClose}
	onfocusin={openMenu}
	onfocusout={handleFocusOut}
>
	<WashTooltip tooltipText={addLabel} className="tooltip-primary">
		<button
			type="button"
			tabindex={disabled ? -1 : 0}
			aria-disabled={disabled || undefined}
			aria-haspopup="menu"
			aria-expanded={open}
			aria-label={addLabel}
			class="btn btn-ghost btn-sm btn-square btn-primary cursor-pointer {disabled
				? 'btn-disabled pointer-events-none opacity-40'
				: ''}"
			disabled={disabled}
		>
			<LucidePlus className="size-4" />
		</button>
	</WashTooltip>
</div>

{#if open && !disabled}
	<ul
		bind:this={panelEl}
		use:portal
		role="menu"
		class="menu bg-base-100 rounded-box border-ink-border fixed z-[200] mb-0 w-max min-w-52 border p-2 shadow-[var(--shadow-paper-md)]"
		style={panelStyle}
		onmouseenter={keepOpen}
		onmouseleave={scheduleClose}
	>
		{#each options as opt, i (`${opt.label}-${i}`)}
			<li role="none">
				<button
					type="button"
					role="menuitem"
					class="whitespace-nowrap"
					disabled={opt.disabled}
					onclick={() => {
						if (opt.disabled) return;
						open = false;
						opt.onSelect();
					}}
				>
					{opt.label}
				</button>
			</li>
		{/each}
	</ul>
{/if}
