<script lang="ts">
	/**
	 * Svelte adapter for Design WashCalendar (web 1.2.0).
	 * Same props as Design studio: mode, value, min, max, showOutsideDays,
	 * markedDates, size, bordered, aria-label, onChange.
	 * Boot: app already calls `initWash` via WashThemeTool (see Design Svelte snippet).
	 * Styles: Design `wash-calendar*` (mirrored in wash-app.style.css).
	 * @see https://design-menzies.netlify.app/ — Calendar
	 */
	import LucideChevronLeft from '$lib/component/own/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';
	import {
		addMonths,
		buildMonthCells,
		clampISODate,
		compareISODate,
		daysInMonth,
		formatMultiValue,
		formatRangeValue,
		isISOInRange,
		monthOptions,
		parseISODate,
		parseMultiValue,
		parseRangeValue,
		shiftISODate,
		startOfMonth,
		toISODate,
		weekdayLabels
	} from '$lib/util/wash-calendar-date.util';
	import {
		DROPDOWN_PANEL_OVERFLOW,
		DROPDOWN_PANEL_Z,
		createWashId,
		dropdownPanelStyle,
		dropdownPlacementClassName,
		measureDropdownPlacement,
		type DropdownPlacement
	} from '@menzies-mariesta-com/menzies-design-wash-ui/core';

	export type WashCalendarMode = 'single' | 'range' | 'multi';
	export type WashCalendarDayMeta = {
		marked?: boolean;
		className?: string;
	};

	let {
		mode = 'single',
		value = $bindable(''),
		onChange,
		viewDate,
		onViewDateChange,
		min,
		max,
		isDateDisallowed,
		markedDates,
		getDayMeta,
		showOutsideDays = true,
		firstDayOfWeek = 0,
		locale,
		maxYears = 50,
		size = 'md',
		bordered = true,
		className = '',
		id,
		'aria-label': ariaLabel = 'Calendar'
	}: {
		mode?: WashCalendarMode;
		value?: string;
		onChange?: (value: string) => void;
		viewDate?: string;
		onViewDateChange?: (iso: string) => void;
		min?: string;
		max?: string;
		isDateDisallowed?: (date: Date) => boolean;
		markedDates?: Iterable<string>;
		getDayMeta?: (iso: string, date: Date) => WashCalendarDayMeta | undefined;
		showOutsideDays?: boolean;
		firstDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
		locale?: string;
		maxYears?: number;
		size?: 'md' | 'sm';
		bordered?: boolean;
		className?: string;
		id?: string;
		'aria-label'?: string;
	} = $props();

	const generatedId = createWashId('wash-cal');
	const rootId = $derived(id ?? generatedId);
	const resolvedLocale = $derived(
		locale ??
			(typeof navigator !== 'undefined' ? navigator.language : 'en-US')
	);
	const todayISO = toISODate(new Date());
	const compact = $derived(size === 'sm');

	function defaultViewISOFrom(
		modeValue: WashCalendarMode,
		valueStr: string
	): string {
		if (modeValue === 'range') {
			return parseRangeValue(valueStr).start || todayISO;
		}
		if (modeValue === 'multi') {
			return parseMultiValue(valueStr)[0] || todayISO;
		}
		return valueStr || todayISO;
	}

	let internalViewISO = $state(todayISO);
	let focusISO = $state(todayISO);
	let rangeAnchor = $state<string | null>(null);
	let monthDetailsEl = $state<HTMLDetailsElement | null>(null);
	let yearDetailsEl = $state<HTMLDetailsElement | null>(null);
	let monthPlacement = $state<DropdownPlacement>({
		end: false,
		top: false,
		maxHeight: 320
	});
	let yearPlacement = $state<DropdownPlacement>({
		end: false,
		top: false,
		maxHeight: 240
	});
	let didInitView = $state(false);

	$effect(() => {
		if (viewDate) {
			internalViewISO = viewDate;
			return;
		}
		if (!didInitView) {
			internalViewISO = defaultViewISOFrom(mode, value);
			focusISO = clampISODate(internalViewISO, min, max);
			didInitView = true;
		}
	});

	const viewISO = $derived(viewDate ?? internalViewISO);
	const viewMonth = $derived(startOfMonth(viewISO));
	const months = $derived(monthOptions(resolvedLocale));
	const weekdays = $derived(weekdayLabels(resolvedLocale, firstDayOfWeek));
	const yearCenter = new Date().getFullYear();
	const years = $derived(
		Array.from({ length: maxYears + 1 }, (_, i) => ({
			value: yearCenter - Math.floor(maxYears / 2) + i,
			label: String(yearCenter - Math.floor(maxYears / 2) + i)
		}))
	);
	const cells = $derived(
		buildMonthCells(viewMonth, firstDayOfWeek, showOutsideDays)
	);
	const rangeParsed = $derived(
		mode === 'range' ? parseRangeValue(value) : null
	);
	const multiSet = $derived(
		mode === 'multi' ? new Set(parseMultiValue(value)) : null
	);
	const markedSet = $derived.by(() => {
		const set = new Set<string>();
		if (markedDates) for (const d of markedDates) set.add(d);
		return set;
	});

	const shellClass = $derived(
		[
			'wash-calendar',
			'no-overflow-marquee',
			compact ? 'wash-calendar--sm' : '',
			'rounded-box border bg-base-100',
			bordered
				? 'border-base-300 shadow-[var(--shadow-paper-sm)]'
				: 'border-transparent shadow-none',
			compact ? 'p-2' : 'p-3',
			className
		]
			.filter(Boolean)
			.join(' ')
	);

	function setValue(next: string) {
		value = next;
		onChange?.(next);
	}

	function setViewISO(iso: string) {
		internalViewISO = iso;
		onViewDateChange?.(iso);
	}

	function isDisabled(iso: string, date: Date): boolean {
		if (!iso) return true;
		if (min && compareISODate(iso, min) < 0) return true;
		if (max && compareISODate(iso, max) > 0) return true;
		if (isDateDisallowed?.(date)) return true;
		return false;
	}

	function moveViewTo(iso: string) {
		const clamped = clampISODate(iso, min, max);
		setViewISO(clamped);
		focusISO = clamped;
	}

	function selectDay(iso: string, date: Date) {
		if (isDisabled(iso, date)) return;
		if (mode === 'single') {
			setValue(iso);
			focusISO = iso;
			return;
		}
		if (mode === 'multi') {
			const next = new Set(parseMultiValue(value));
			if (next.has(iso)) next.delete(iso);
			else next.add(iso);
			setValue(formatMultiValue([...next]));
			focusISO = iso;
			return;
		}
		if (!rangeAnchor || (rangeParsed?.start && rangeParsed.end)) {
			rangeAnchor = iso;
			setValue(iso);
			focusISO = iso;
			return;
		}
		setValue(formatRangeValue(rangeAnchor, iso));
		rangeAnchor = null;
		focusISO = iso;
	}

	function goToday() {
		const t = clampISODate(todayISO, min, max);
		moveViewTo(t);
		if (mode === 'single') setValue(t);
	}

	function updateNavPlacement(
		details: HTMLDetailsElement | null,
		kind: 'month' | 'year'
	) {
		if (!details) return;
		const next = measureDropdownPlacement(details, {
			panelWidth: kind === 'year' ? 96 : 160,
			panelHeight: kind === 'year' ? 240 : 320
		});
		if (kind === 'month') monthPlacement = next;
		else yearPlacement = next;
	}

	function onKeyDown(e: KeyboardEvent) {
		const focus = focusISO || todayISO;
		let next: string | null = null;
		switch (e.key) {
			case 'ArrowLeft':
				next = shiftISODate(focus, -1);
				break;
			case 'ArrowRight':
				next = shiftISODate(focus, 1);
				break;
			case 'ArrowUp':
				next = shiftISODate(focus, -7);
				break;
			case 'ArrowDown':
				next = shiftISODate(focus, 7);
				break;
			case 'Home': {
				const d = parseISODate(focus);
				if (d) next = toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
				break;
			}
			case 'End': {
				const d = parseISODate(focus);
				if (d) {
					next = toISODate(
						new Date(
							d.getFullYear(),
							d.getMonth(),
							daysInMonth(d.getFullYear(), d.getMonth())
						)
					);
				}
				break;
			}
			case 'PageUp': {
				const d = parseISODate(focus);
				if (d)
					next = toISODate(
						new Date(d.getFullYear(), d.getMonth() - 1, d.getDate())
					);
				break;
			}
			case 'PageDown': {
				const d = parseISODate(focus);
				if (d)
					next = toISODate(
						new Date(d.getFullYear(), d.getMonth() + 1, d.getDate())
					);
				break;
			}
			case 'Enter':
			case ' ': {
				e.preventDefault();
				const d = parseISODate(focus);
				if (d) selectDay(focus, d);
				return;
			}
			case 'Escape':
				if (
					e.currentTarget instanceof Element &&
					e.currentTarget.querySelector(
						'details.wash-calendar__nav-dropdown[open]'
					)
				) {
					return;
				}
				if (mode === 'range' && rangeAnchor) {
					e.preventDefault();
					rangeAnchor = null;
					setValue('');
				}
				return;
			default:
				return;
		}
		if (!next) return;
		e.preventDefault();
		const clamped = clampISODate(next, min, max);
		focusISO = clamped;
		const focusDate = parseISODate(clamped);
		const view = startOfMonth(viewISO);
		if (
			focusDate &&
			(focusDate.getFullYear() !== view.getFullYear() ||
				focusDate.getMonth() !== view.getMonth())
		) {
			setViewISO(clamped);
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_no_noninteractive_tabindex -->
<div
	id={rootId}
	class={shellClass}
	role="application"
	tabindex="0"
	aria-label={ariaLabel}
	onkeydown={onKeyDown}
>
	<div class="wash-calendar__header">
		<button
			type="button"
			class="btn btn-ghost btn-square btn-sm btn-primary cursor-pointer"
			aria-label="Previous month"
			title="Previous month"
			onclick={() => moveViewTo(toISODate(addMonths(viewMonth, -1)))}
		>
			<LucideChevronLeft className="size-4" />
		</button>

		<label class="wash-calendar__caption" for="{rootId}-month">Month</label>
		<details
			bind:this={monthDetailsEl}
			class={dropdownPlacementClassName(
				monthPlacement,
				'wash-calendar__nav-dropdown'
			)}
			ontoggle={(e) => {
				const el = e.currentTarget;
				if (el.open) {
					updateNavPlacement(el, 'month');
					requestAnimationFrame(() => {
						el
							.querySelector('[aria-selected="true"]')
							?.scrollIntoView({ block: 'nearest' });
					});
				}
			}}
		>
			<summary
				id="{rootId}-month"
				class="btn btn-ghost btn-sm border border-base-300 wash-calendar__nav-trigger cursor-pointer [&::-webkit-details-marker]:hidden {compact
					? 'btn-xs'
					: ''}"
				aria-label="Month: {months[viewMonth.getMonth()]?.label ?? ''}"
			>
				<span class="min-w-0 truncate"
					>{months[viewMonth.getMonth()]?.label ?? ''}</span
				>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="size-3.5 shrink-0 opacity-60"
					aria-hidden="true"
				>
					<path d="m6 9 6 6 6-6" />
				</svg>
			</summary>
			<ul
				class="menu menu-sm dropdown-content wash-calendar__nav-menu {DROPDOWN_PANEL_Z} {DROPDOWN_PANEL_OVERFLOW} rounded-box border border-ink-border bg-base-100 shadow-[var(--shadow-paper-md)] {monthPlacement.top
					? 'mb-1'
					: 'mt-1'}"
				style={dropdownPanelStyle(monthPlacement)}
				role="listbox"
				aria-label="Month"
				tabindex="-1"
			>
				{#each months as opt (opt.value)}
					<li>
						<button
							type="button"
							role="option"
							aria-selected={opt.value === viewMonth.getMonth()}
							class="cursor-pointer {opt.value === viewMonth.getMonth()
								? 'menu-wash-active font-semibold'
								: ''}"
							onclick={() => {
								moveViewTo(
									toISODate(new Date(viewMonth.getFullYear(), opt.value, 1))
								);
								if (monthDetailsEl) monthDetailsEl.open = false;
							}}
						>
							{opt.label}
						</button>
					</li>
				{/each}
			</ul>
		</details>

		<label class="wash-calendar__caption" for="{rootId}-year">Year</label>
		<details
			bind:this={yearDetailsEl}
			class={dropdownPlacementClassName(
				yearPlacement,
				'wash-calendar__nav-dropdown wash-calendar__nav-dropdown--year'
			)}
			ontoggle={(e) => {
				const el = e.currentTarget;
				if (el.open) {
					updateNavPlacement(el, 'year');
					requestAnimationFrame(() => {
						el
							.querySelector('[aria-selected="true"]')
							?.scrollIntoView({ block: 'nearest' });
					});
				}
			}}
		>
			<summary
				id="{rootId}-year"
				class="btn btn-ghost btn-sm border border-base-300 wash-calendar__nav-trigger cursor-pointer [&::-webkit-details-marker]:hidden {compact
					? 'btn-xs'
					: ''}"
				aria-label="Year: {viewMonth.getFullYear()}"
			>
				<span class="min-w-0 truncate">{viewMonth.getFullYear()}</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="size-3.5 shrink-0 opacity-60"
					aria-hidden="true"
				>
					<path d="m6 9 6 6 6-6" />
				</svg>
			</summary>
			<ul
				class="menu menu-sm dropdown-content wash-calendar__nav-menu {DROPDOWN_PANEL_Z} {DROPDOWN_PANEL_OVERFLOW} rounded-box border border-ink-border bg-base-100 shadow-[var(--shadow-paper-md)] {yearPlacement.top
					? 'mb-1'
					: 'mt-1'}"
				style={dropdownPanelStyle(yearPlacement)}
				role="listbox"
				aria-label="Year"
				tabindex="-1"
			>
				{#each years as opt (opt.value)}
					<li>
						<button
							type="button"
							role="option"
							aria-selected={opt.value === viewMonth.getFullYear()}
							class="cursor-pointer {opt.value === viewMonth.getFullYear()
								? 'menu-wash-active font-semibold'
								: ''}"
							onclick={() => {
								moveViewTo(
									toISODate(new Date(opt.value, viewMonth.getMonth(), 1))
								);
								if (yearDetailsEl) yearDetailsEl.open = false;
							}}
						>
							{opt.label}
						</button>
					</li>
				{/each}
			</ul>
		</details>

		<button
			type="button"
			class="btn btn-ghost btn-square btn-sm btn-primary cursor-pointer"
			aria-label="Next month"
			title="Next month"
			onclick={() => moveViewTo(toISODate(addMonths(viewMonth, 1)))}
		>
			<LucideChevronRight className="size-4" />
		</button>

		<button type="button" class="btn btn-ghost btn-sm cursor-pointer" onclick={goToday}>
			Today
		</button>
	</div>

	<div id="{rootId}-caption" class="wash-calendar__caption">
		{months[viewMonth.getMonth()]?.label}
		{viewMonth.getFullYear()}
	</div>

	<div
		class="wash-calendar__grid"
		role="grid"
		aria-labelledby="{rootId}-caption"
	>
		{#each weekdays as label (label)}
			<div class="wash-calendar__weekday" role="columnheader" aria-label={label}>
				{label}
			</div>
		{/each}

		{#each cells as cell, index (cell.iso || `empty-${index}`)}
			{#if !cell.iso}
				<div class="wash-calendar__day-empty" aria-hidden="true"></div>
			{:else}
				{@const disabled = isDisabled(cell.iso, cell.date)}
				{@const isToday = cell.iso === todayISO}
				{@const isFocus = cell.iso === focusISO}
				{@const meta = getDayMeta?.(cell.iso, cell.date)}
				{@const marked = Boolean(meta?.marked || markedSet.has(cell.iso))}
				{@const selection = (() => {
					let selected = false;
					let inRange = false;
					let rangeEdge = false;
					if (mode === 'single') selected = value === cell.iso;
					else if (mode === 'multi' && multiSet)
						selected = multiSet.has(cell.iso);
					else if (mode === 'range' && rangeParsed) {
						const start = rangeParsed.start;
						const end = rangeParsed.end || rangeAnchor || '';
						if (start && end) {
							inRange = isISOInRange(cell.iso, start, end);
							rangeEdge = cell.iso === start || cell.iso === end;
							selected = rangeEdge;
						} else if (start) selected = cell.iso === start;
					}
					return { selected, inRange, rangeEdge };
				})()}
				<button
					type="button"
					role="gridcell"
					tabindex={isFocus ? 0 : -1}
					aria-selected={selection.selected || selection.inRange}
					aria-current={isToday ? 'date' : undefined}
					aria-disabled={disabled || undefined}
					{disabled}
					class={[
						'wash-calendar__day',
						!cell.inMonth && 'wash-calendar__day--outside',
						isToday && !selection.selected && 'wash-calendar__day--today',
						selection.inRange &&
							!selection.rangeEdge &&
							'wash-calendar__day--in-range',
						selection.selected && 'wash-calendar__day--selected',
						disabled && 'wash-calendar__day--disabled',
						meta?.className
					]
						.filter(Boolean)
						.join(' ')}
					onclick={() => selectDay(cell.iso, cell.date)}
					onfocus={() => {
						focusISO = cell.iso;
					}}
				>
					<span>{cell.day}</span>
					{#if marked}
						<span class="wash-calendar__mark" aria-hidden="true"></span>
					{/if}
				</button>
			{/if}
		{/each}
	</div>
</div>
