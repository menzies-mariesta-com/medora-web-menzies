<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import LucideChevronLeft from '$lib/component/own/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';

	let {
		value = $bindable(''),
		min,
		max,
		locale,
		months = 1,
		firstDayOfWeek = 0,
		showOutsideDays = false,
		showWeekNumbers = false,
		className,
		onChange
	} = $props<{
		/** Selected date in ISO format YYYY-MM-DD */
		value?: string;
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
		/** Optional callback fired when value changes */
		onChange?: (value: string) => void;
	}>();

	let callyLoaded = $state(false);

	onMount(async () => {
		if (browser) {
			await import('cally');
			callyLoaded = true;
		}
	});

	function handleChange(event: Event) {
		const target = event.target as HTMLElement & { value?: string };
		const next = target?.value ?? '';
		value = next;
		if (typeof onChange === 'function') {
			onChange(next);
		}
	}
</script>

<!-- example usage  -->
<!-- <CallyDateCalendar
	bind:value={selectedDate}
	onChange={handleCalendarChange}
	showOutsideDays={true}
	className="w-full rounded-box border border-base-300 bg-base-100 shadow-lg"
/> -->

{#if callyLoaded}
	<calendar-date
		class="d-cally {className}"
		{value}
		{min}
		{max}
		{locale}
		{months}
		first-day-of-week={firstDayOfWeek}
		show-outside-days={showOutsideDays}
		show-week-numbers={showWeekNumbers}
		on:change={handleChange}
	>
		<span slot="previous" aria-label="Previous">
			<LucideChevronLeft className="size-4" />
		</span>
		<span slot="next" aria-label="Next">
			<LucideChevronRight className="size-4" />
		</span>

		<calendar-month></calendar-month>
	</calendar-date>

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
	:global(calendar-date::part(heading)),
	:global(calendar-month::part(heading)) {
		font-size: 1rem;
		margin-bottom: 1rem;
	}

	/* Fixed overall height for each month */
	:global(calendar-month) {
		block-size: 18rem; /* tweak to taste */
	}

	/* Make the month table fill that height */
	:global(calendar-month::part(table)) {
		height: 100%;
	}
</style>
