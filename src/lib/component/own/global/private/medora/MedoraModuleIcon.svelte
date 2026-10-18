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
	import LucideSiren from '$lib/component/own/library/lucide/LucideSiren.svelte';
	import LucideSlice from '$lib/component/own/library/lucide/LucideSlice.svelte';
	import LucideBaby from '$lib/component/own/library/lucide/LucideBaby.svelte';
	import LucideActivity from '$lib/component/own/library/lucide/LucideActivity.svelte';
	import LucideBedDouble from '$lib/component/own/library/lucide/LucideBedDouble.svelte';
	import LucideAppWindow from '$lib/component/own/library/lucide/LucideAppWindow.svelte';

	let {
		name = null,
		moduleUrl = null,
		className = 'size-4 shrink-0',
		strokeWidth
	}: {
		/** Lucide kebab-case name from `module.image_url`. */
		name?: string | null;
		/** Fallback when `image_url` is missing (matches `module.module_url`). */
		moduleUrl?: string | null;
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
		pill: LucidePill,
		'bed-double': LucideBedDouble,
		siren: LucideSiren,
		scalpel: LucideSlice,
		slice: LucideSlice,
		baby: LucideBaby,
		activity: LucideActivity
	};

	/** When DB `image_url` is null, infer icon from seeded `module_url`. */
	const ICON_BY_MODULE_URL: Record<string, string> = {
		'/medora/home/administration': 'user-cog',
		'/medora/home/registration': 'users-round',
		'/medora/home/appointment': 'clipboard-clock',
		'/medora/home/nursing-workbench': 'heart-pulse',
		'/medora/home/service-item': 'clipboard-list',
		'/medora/home/consultation': 'stethoscope',
		'/medora/home/adt': 'bed-double',
		'/medora/home/billing': 'receipt-text',
		'/medora/home/inventory-setup': 'warehouse',
		'/medora/home/inventory': 'package',
		'/medora/home/medication-order': 'pill',
		'/medora/home/emergency': 'siren',
		'/medora/home/perioperative': 'scalpel',
		'/medora/home/obstetrics': 'baby',
		'/medora/home/diagnostics': 'activity'
	};

	function normalizeModuleUrl(raw: string | null | undefined): string | null {
		if (raw == null) return null;
		const trimmed = raw
			.trim()
			.replace(/\/$/, '')
			.replace(/^\/heka\//, '/medora/');
		return trimmed || null;
	}

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

	const iconNameFromDb = $derived(normalizeIconName(name));
	const iconNameFromUrl = $derived.by(() => {
		const url = normalizeModuleUrl(moduleUrl);
		return url ? (ICON_BY_MODULE_URL[url] ?? null) : null;
	});
	const resolvedIconName = $derived(iconNameFromDb ?? iconNameFromUrl);
	const Icon = $derived(
		resolvedIconName ? (ICONS[resolvedIconName] ?? LucideAppWindow) : LucideAppWindow
	);
</script>

<Icon {className} {strokeWidth} />
