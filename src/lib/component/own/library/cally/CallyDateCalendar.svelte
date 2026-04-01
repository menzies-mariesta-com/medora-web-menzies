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
		onChange: onValueChange
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
	const currentYear = new Date().getFullYear();
	const monthsCount = $derived.by(() => Math.max(1, Math.floor(months ?? 1)));
	let focusedDate = $state('');
	let lastValue = $state('');
	let calendarEl: HTMLElement | null = $state(null);
	const minYear = $derived.by(() => {
		if (!min) return undefined;
		const parsedYear = Number.parseInt(min.slice(0, 4), 10);
		return Number.isFinite(parsedYear) ? parsedYear : undefined;
	});
	const maxYear = $derived.by(() => {
		if (!max) return undefined;
		const parsedYear = Number.parseInt(max.slice(0, 4), 10);
		return Number.isFinite(parsedYear) ? parsedYear : undefined;
	});
	const maxYears = $derived.by(() => {
		if (minYear !== undefined && maxYear !== undefined && maxYear >= minYear) {
			return maxYear - minYear + 1;
		}
		if (minYear !== undefined) {
			return Math.max(1, currentYear - minYear + 1);
		}
		if (maxYear !== undefined) {
			return Math.max(1, maxYear - currentYear + 1);
		}
		return undefined;
	});
	const yearStart = $derived.by(() => minYear ?? currentYear - 100);
	const yearEnd = $derived.by(() => {
		if (maxYear !== undefined) return maxYear;
		if (maxYears !== undefined) return yearStart + maxYears - 1;
		return currentYear + 50;
	});
	const yearOptions = $derived.by(() => {
		const start = Math.min(yearStart, yearEnd);
		const end = Math.max(yearStart, yearEnd);
		return Array.from({ length: end - start + 1 }, (_, i) => start + i);
	});
	const monthOptions = $derived.by(() => {
		const monthFormatter = new Intl.DateTimeFormat(locale, {
			month: 'short',
			timeZone: 'UTC'
		});
		return Array.from({ length: 12 }, (_, i) => {
			const month = i + 1;
			const monthDate = new Date(Date.UTC(2024, i, 1));
			return {
				value: String(month),
				label: monthFormatter.format(monthDate)
			};
		});
	});
	const focusedParts = $derived.by(() => {
		const source = parseIsoDate(focusedDate) ?? parseIsoDate(value) ?? new Date();
		return {
			year: source.getUTCFullYear(),
			month: source.getUTCMonth() + 1,
			day: source.getUTCDate()
		};
	});
	let yearSelectValue = $state('');
	let monthSelectValue = $state('');

	// 1) Initialize `focusedDate` from current selection (or bounds) once.
	// 2) Keep `focusedDate` in sync with `value` only when the selected date changes.
	//    This way `focusday` (chevrons / keyboard navigation) can update the dropdown without being overwritten.
	$effect(() => {
		if (!focusedDate) {
			const preferred = value || min || max;
			const parsedPreferred = parseIsoDate(preferred);
			focusedDate = formatIsoDate(parsedPreferred ?? new Date());
			lastValue = value ?? '';
			return;
		}

		if (value && value !== lastValue) {
			focusedDate = value;
			lastValue = value;
		}
	});
	$effect(() => {
		yearSelectValue = String(focusedParts.year);
		monthSelectValue = String(focusedParts.month);
	});
	$effect(() => {
		if (!calendarEl) return;
		const handler = (event: Event) => handleFocusDay(event);
		calendarEl.addEventListener('focusday', handler as EventListener);
		return () => {
			calendarEl?.removeEventListener('focusday', handler as EventListener);
		};
	});

	/**
	 * Cally dispatches `change` on the `<calendar-date>` host after updating its internal value.
	 * Svelte delegates `change` and patches `currentTarget`; reading `.value` in that path can be wrong.
	 * Use a native listener on the host + optional microtask so Atomico's prop commit is visible.
	 */
	$effect(() => {
		if (!calendarEl) return;
		const el = calendarEl;

		function readIsoFromHost(host: HTMLElement): string {
			const h = host as HTMLElement & { value?: unknown };
			const v = h.value;
			if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
			const attr = host.getAttribute('value');
			if (typeof attr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(attr)) return attr;
			return '';
		}

		function commitFromDetail(ev: Event) {
			const d = (ev as CustomEvent<unknown>).detail;
			if (d == null) return '';
			if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
			if (
				typeof d === 'object' &&
				d !== null &&
				'toString' in d &&
				typeof (d as { toString: () => string }).toString === 'function'
			) {
				const s = (d as { toString: () => string }).toString();
				if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
			}
			return '';
		}

		function onHostChange(this: HTMLElement, ev: Event) {
			const host = this;
			const apply = () => {
				let next = readIsoFromHost(host);
				if (!next) next = commitFromDetail(ev);
				if (!next) return;
				value = next;
				onValueChange?.(next);
			};
			apply();
			queueMicrotask(apply);
		}

		el.addEventListener('change', onHostChange);
		return () => el.removeEventListener('change', onHostChange);
	});

	onMount(async () => {
		if (browser) {
			await import('cally');
			callyLoaded = true;
		}
	});

	function handleFocusDay(event: Event) {
		const customEvent = event as CustomEvent<Date | string>;
		const detail = customEvent.detail;
		if (detail instanceof Date) {
			focusedDate = formatIsoDate(detail);
			return;
		}
		const parsed = parseIsoDate(detail);
		if (parsed) focusedDate = formatIsoDate(parsed);
	}

	function handleYearSelect(event: Event) {
		const nextYear = Number.parseInt(yearSelectValue, 10);
		if (!Number.isFinite(nextYear)) return;
		setFocusedDate(nextYear, Number.parseInt(monthSelectValue, 10));
	}

	function handleMonthSelect(event: Event) {
		const nextMonth = Number.parseInt(monthSelectValue, 10);
		if (!Number.isFinite(nextMonth)) return;
		setFocusedDate(Number.parseInt(yearSelectValue, 10), nextMonth);
	}

	function setFocusedDate(year: number, month: number) {
		const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
		const day = Math.min(focusedParts.day, maxDay);
		focusedDate = formatIsoDate(new Date(Date.UTC(year, month - 1, day)));
	}

	function parseIsoDate(raw: string | undefined): Date | null {
		if (!raw) return null;
		// Treat `YYYY-MM-DD` as a UTC date (prevents timezone/day shifting).
		const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
		if (!match) return null;
		const year = Number.parseInt(match[1], 10);
		const month = Number.parseInt(match[2], 10);
		const day = Number.parseInt(match[3], 10);
		const dt = new Date(Date.UTC(year, month - 1, day));
		return Number.isNaN(dt.getTime()) ? null : dt;
	}

	function formatIsoDate(date: Date): string {
		const year = date.getUTCFullYear();
		const month = String(date.getUTCMonth() + 1).padStart(2, '0');
		const day = String(date.getUTCDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
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
		bind:this={calendarEl}
		class="d-cally {className}"
		{value}
		{min}
		{max}
		{locale}
		{months}
		focused-date={focusedDate}
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

		{#if monthsCount === 1}
			<div slot="heading" class="d-cally-heading-controls">
				<select
					class="d-select d-select-sm d-select-bordered min-w-28"
					bind:value={yearSelectValue}
					onchange={(e) => {
						e.stopPropagation();
						handleYearSelect(e);
					}}
				>
					{#each yearOptions as year (year)}
						<option value={String(year)}>{year}</option>
					{/each}
				</select>

				<select
					class="d-select d-select-sm d-select-bordered min-w-28"
					bind:value={monthSelectValue}
					onchange={(e) => {
						e.stopPropagation();
						handleMonthSelect(e);
					}}
				>
					{#each monthOptions as month (month.value)}
						<option value={month.value}>{month.label}</option>
					{/each}
				</select>
			</div>
		{/if}

		{#each Array.from({ length: monthsCount }) as _, i (i)}
			<calendar-month offset={i}></calendar-month>
		{/each}
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
	:global(calendar-date::part(heading)) {
		font-size: 1rem;
		margin-bottom: 0.75rem;
		min-block-size: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Hide the built-in per-month title so only our dropdown controls show. */
	:global(calendar-month::part(heading)) {
		display: none;
	}

	:global(.d-cally-heading-controls) {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		inline-size: 100%;
	}

	:global(.d-cally-heading-controls .d-select) {
		inline-size: 100%;
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
