<script lang="ts">
	/**
	 * Renders a module `image_url` as a Lucide icon name (Menzies Design / Wash
	 * `DynamicIcon` naming: kebab-case, e.g. `user-cog`). Allowlisted local
	 * Svelte Lucide wrappers — not React `DynamicIcon`, not `{@html}` SVG.
	 */
	import type { Component } from 'svelte';
	import LucideUserCog from '$lib/component/own/library/lucide/LucideUserCog.svelte';
	import LucideUsersRound from '$lib/component/own/library/lucide/LucideUsersRound.svelte';
	import LucideClipboardClock from '$lib/component/own/library/lucide/LucideClipboardClock.svelte';
	import LucideHeartPulse from '$lib/component/own/library/lucide/LucideHeartPulse.svelte';
	import LucideClipboardList from '$lib/component/own/library/lucide/LucideClipboardList.svelte';
	import LucideStethoscope from '$lib/component/own/library/lucide/LucideStethoscope.svelte';
	import LucideReceiptText from '$lib/component/own/library/lucide/LucideReceiptText.svelte';
	import LucideWarehouse from '$lib/component/own/library/lucide/LucideWarehouse.svelte';
	import LucidePackage from '$lib/component/own/library/lucide/LucidePackage.svelte';
	import LucidePill from '$lib/component/own/library/lucide/LucidePill.svelte';

	let {
		name = null,
		className = 'size-4 shrink-0',
		strokeWidth
	}: {
		/** Lucide kebab-case name from `module.image_url`. */
		name?: string | null;
		className?: string;
		strokeWidth?: number;
	} = $props();

	const ICONS: Record<string, Component<{ className?: string; strokeWidth?: number }>> = {
		'user-cog': LucideUserCog,
		'user-star': LucideUserCog,
		'users-round': LucideUsersRound,
		'clipboard-clock': LucideClipboardClock,
		'heart-pulse': LucideHeartPulse,
		'clipboard-list': LucideClipboardList,
		stethoscope: LucideStethoscope,
		'receipt-text': LucideReceiptText,
		warehouse: LucideWarehouse,
		package: LucidePackage,
		pill: LucidePill
	};

	function normalizeIconName(raw: string | null | undefined): string | null {
		if (raw == null) return null;
		const trimmed = raw.trim();
		if (!trimmed) return null;
		// Legacy: full SVG markup — pull Lucide slug from class if present.
		if (trimmed.startsWith('<')) {
			const fromClass =
				trimmed.match(/\blucide-([a-z0-9-]+?)(?:-icon)?(?:\s|["']|$)/i)?.[1] ??
				null;
			return fromClass;
		}
		return trimmed.replace(/^lucide-/i, '');
	}

	const iconName = $derived(normalizeIconName(name));
	const Icon = $derived(iconName ? (ICONS[iconName] ?? null) : null);
</script>

{#if Icon}
	<Icon {className} {strokeWidth} />
{/if}
