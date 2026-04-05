<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import LucideChevronLeft from '$lib/component/own/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';

	let {
		from = $bindable(''),
		to = $bindable(''),
		min,
		max,
		locale,
		months = 2,
		firstDayOfWeek = 0,
		showOutsideDays = false,
		showWeekNumbers = false,
		className,
		onChange
	} = $props<{
		/** Start date (YYYY-MM-DD) */
		from?: string;
		/** End date (YYYY-MM-DD) */
		to?: string;
		/** Minimum selectable date (ISO YYYY-MM-DD) */
		min?: string;
		/** Maximum selectable date (ISO YYYY-MM-DD) */
		max?: string;
		/** Locale, e.g. "en-GB" – defaults to browser if omitted */
		locale?: string;
		/** Number of months to display */
		months?: number;
		/** First day of week (0 = Sunday, 1 = Monday, ...) */
		firstDayOfWeek?: number;
		/** Show days outside the current month */
		showOutsideDays?: boolean;
		/** Show ISO week numbers */
		showWeekNumbers?: boolean;
		/** Extra classes applied in addition to `d-cally` */
		className?: string;
		/** Optional callback fired when range changes */
		onChange?: (payload: {
			from: string;
			to: string;
			raw: string;
		}) => void;
	}>();

	// Internal Cally value: "from/to"
	let internalValue = $state('');
	const monthsCount = $derived.by(() => Math.max(1, Math.floor(months ?? 1)));

	let callyLoaded = $state(false);
	let calendarEl: HTMLElement | null = $state(null);

	onMount(async () => {
		if (browser) {
			await import('cally');
			callyLoaded = true;
		}
	});

	// Keep internal range string in sync when parent updates from/to
	$effect(() => {
		const next =
			(from && to) || from || to ? `${from ?? ''}/${to ?? ''}` : '';
		if (internalValue !== next) internalValue = next;
	});

	function isIsoDate(raw: string): boolean {
		return /^\d{4}-\d{2}-\d{2}$/.test(raw);
	}

	function normalizeRangeRaw(raw: string): { from: string; to: string; raw: string } | null {
		if (!raw) return { from: '', to: '', raw: '' };
		const [startRaw = '', endRaw = ''] = raw.split('/');
		const start = startRaw.trim();
		const end = endRaw.trim();
		if (start && !isIsoDate(start)) return null;
		if (end && !isIsoDate(end)) return null;
		const normalizedRaw = start || end ? `${start}/${end}` : '';
		return { from: start, to: end, raw: normalizedRaw };
	}

	/**
	 * Cally dispatches `change` on the `<calendar-range>` host after updating its internal value.
	 * Svelte delegates `change`; reading `event.target.value` can be wrong for custom elements.
	 * Use a native listener on the host + microtask to reliably read the committed host value.
	 */
	$effect(() => {
		if (!calendarEl) return;
		const el = calendarEl;

		function readRawFromHost(host: HTMLElement): string {
			const h = host as HTMLElement & { value?: unknown };
			const v = h.value;
			if (typeof v === 'string') return v;
			const attr = host.getAttribute('value');
			return typeof attr === 'string' ? attr : '';
		}

		function onHostChange(this: HTMLElement, ev: Event) {
			const host = this;
			const apply = () => {
				const candidate = readRawFromHost(host);
				const normalized = normalizeRangeRaw(candidate);
				if (!normalized) return;

				internalValue = normalized.raw;
				from = normalized.from;
				to = normalized.to;
				onChange?.({ from: normalized.from, to: normalized.to, raw: normalized.raw });
			};

			apply();
			queueMicrotask(apply);
		}

		el.addEventListener('change', onHostChange);
		return () => el.removeEventListener('change', onHostChange);
	});
</script>

<!-- example usage -->
<!-- 
<CallyRangeCalendar
	bind:from={fromDate}
	bind:to={toDate}
	months={1}
	showOutsideDays={true}
	className="w-full rounded-box border border-base-300 bg-base-100 shadow-lg"
	onChange={({ from, to }) => {
		console.log('range changed', from, to);
	}}
/> -->

{#if callyLoaded}
	<calendar-range
		bind:this={calendarEl}
		class="d-cally {className}"
		value={internalValue}
		{min}
		{max}
		{locale}
		{months}
		first-day-of-week={firstDayOfWeek}
		show-outside-days={showOutsideDays}
		show-week-numbers={showWeekNumbers}
	>
		<span slot="previous" aria-label="Previous">
			<LucideChevronLeft className="size-4" />
		</span>
		<span slot="next" aria-label="Next">
			<LucideChevronRight className="size-4" />
		</span>

		{#each Array.from({ length: monthsCount }) as _, i (i)}
			<calendar-month offset={i}></calendar-month>
		{/each}
	</calendar-range>

	<!-- legend -->
	<div class="flex justify-center gap-7">
		<div class="flex items-center gap-2">
			<span class="h-5 w-5 rounded-md bg-primary"></span>
			current
		</div>
		<div class="flex items-center gap-2">
			<span class="h-5 w-5 rounded-md bg-current"></span>
			selected
		</div>
	</div>
{:else}
	<!-- Placeholder while Cally loads (client-side only) -->
	<div
		class="d-cally {className} flex items-center justify-center p-8"
	>
		<span class="loading loading-spinner loading-lg"></span>
	</div>
{/if}

<style>
	:global(calendar-range::part(heading)),
	:global(calendar-month::part(heading)) {
		font-size: 1rem;
		margin-bottom: 1rem;
	}

	/* Fixed overall height for each month */
	:global(calendar-range calendar-month) {
		block-size: 18rem;
	}

	/* Make the month table fill that height */
	:global(calendar-range calendar-month::part(table)) {
		height: 100%;
	}
</style>
