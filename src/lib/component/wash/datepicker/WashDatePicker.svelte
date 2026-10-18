<script lang="ts">
	/**
	 * Form-field Wash date / datetime / range picker.
	 * Trigger looks like an `input`; panel hosts `WashCalendar` (Design Wash).
	 * Values: single `YYYY-MM-DD`, datetime `YYYY-MM-DDTHH:mm:ss`, range `YYYY-MM-DD/YYYY-MM-DD`.
	 */
	import LucideCalendar from '$lib/component/own/library/lucide/LucideCalendar.svelte';
	import WashCalendar from '$lib/component/wash/calendar/WashCalendar.svelte';
	import {
		formatTimeDisplay,
		parseDateTimeLocal,
		parseRangeValue,
		toISODateFromDateTime
	} from '$lib/util/wash-calendar-date.util';
	import {
		DROPDOWN_PANEL_Z,
		createWashId,
		dropdownPanelStyle,
		dropdownPlacementClassName,
		measureDropdownPlacement,
		type DropdownPlacement
	} from '@menzies-mariesta-com/menzies-design-wash-ui/core';

	type WashDatePickerMode = 'single' | 'range' | 'multi';

	let {
		value = $bindable(''),
		onChange,
		mode = 'single',
		includeTime = false,
		min,
		max,
		isDateDisallowed,
		locale,
		size = 'md',
		disabled = false,
		required = false,
		name,
		id,
		className = '',
		triggerClassName = '',
		placeholder,
		'aria-label': ariaLabel
	}: {
		value?: string;
		onChange?: (value: string) => void;
		mode?: WashDatePickerMode;
		includeTime?: boolean;
		min?: string;
		max?: string;
		isDateDisallowed?: (date: Date) => boolean;
		locale?: string;
		size?: 'md' | 'sm';
		disabled?: boolean;
		required?: boolean;
		name?: string;
		id?: string;
		className?: string;
		triggerClassName?: string;
		placeholder?: string;
		'aria-label'?: string;
	} = $props();

	const generatedId = createWashId('wash-date');
	const rootId = $derived(id ?? generatedId);
	const compact = $derived(size === 'sm');
	const withTime = $derived(includeTime && mode === 'single');
	const resolvedLocale = $derived(
		locale ??
			(typeof navigator !== 'undefined' ? navigator.language : 'en-US')
	);
	/** Calendar day bounds are date-only; strip time from datetime-local mins/maxes. */
	const calendarMin = $derived(
		min ? toISODateFromDateTime(min) || min.slice(0, 10) : undefined
	);
	const calendarMax = $derived(
		max ? toISODateFromDateTime(max) || max.slice(0, 10) : undefined
	);

	let detailsEl = $state<HTMLDetailsElement | null>(null);
	let placement = $state<DropdownPlacement>({
		end: false,
		top: false,
		maxHeight: 420
	});

	const display = $derived.by(() => {
		const raw = (value ?? '').trim();
		if (!raw) return '';
		if (mode === 'range') {
			const { start, end } = parseRangeValue(raw);
			if (start && end) return `${start} / ${end}`;
			return start || raw;
		}
		if (withTime) {
			const { date, time } = parseDateTimeLocal(raw);
			if (!date) return raw;
			return `${date} ${formatTimeDisplay(time, resolvedLocale)}`;
		}
		return toISODateFromDateTime(raw) || raw;
	});

	const emptyHint = $derived(
		placeholder ??
			(mode === 'range'
				? 'Select date range'
				: withTime
					? 'Select date and time'
					: 'Select date')
	);

	function setValue(next: string) {
		value = next;
		onChange?.(next);
	}

	function close() {
		if (detailsEl) detailsEl.open = false;
	}

	function isCompleteRange(v: string): boolean {
		const { start, end } = parseRangeValue(v);
		return Boolean(start && end);
	}

	function onCalendarChange(next: string) {
		setValue(next);
		if (mode === 'single' && !withTime && next) close();
		else if (mode === 'range' && isCompleteRange(next)) close();
	}

	function onToggle(event: Event) {
		const details = event.currentTarget as HTMLDetailsElement;
		if (disabled) {
			details.open = false;
			return;
		}
		if (details.open) {
			placement = measureDropdownPlacement(details, {
				panelWidth: compact ? 280 : 320,
				panelHeight: withTime ? 480 : mode === 'range' ? 400 : 380
			});
		}
	}

	$effect(() => {
		const el = detailsEl;
		if (!el?.open) return;
		const onPointer = (ev: PointerEvent) => {
			const t = ev.target as Node | null;
			if (t && !el.contains(t)) close();
		};
		const onKey = (ev: KeyboardEvent) => {
			if (ev.key === 'Escape') close();
		};
		document.addEventListener('pointerdown', onPointer, true);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onPointer, true);
			document.removeEventListener('keydown', onKey);
		};
	});

	const rootClass = $derived(
		[
			dropdownPlacementClassName(placement),
			'wash-date w-full dropdown-no-hover',
			disabled ? 'wash-date--disabled pointer-events-none opacity-60' : '',
			className
		]
			.filter(Boolean)
			.join(' ')
	);
	const panelStyle = $derived(dropdownPanelStyle(placement));
</script>

<details bind:this={detailsEl} class={rootClass} ontoggle={onToggle}>
	<summary
		id={rootId}
		class="wash-date__trigger input input-bordered flex w-full items-center justify-between gap-2 [&::-webkit-details-marker]:hidden {disabled
			? 'cursor-not-allowed'
			: 'cursor-pointer'} {compact ? 'input-sm' : ''} {triggerClassName}"
		aria-label={ariaLabel ??
			(display ? `Date: ${display}` : emptyHint)}
		aria-haspopup="dialog"
		aria-disabled={disabled || undefined}
	>
		<span
			class="min-w-0 truncate font-mono text-sm tabular-nums {display
				? ''
				: 'opacity-50'}"
		>
			{display || emptyHint}
		</span>
		<LucideCalendar className="size-4 shrink-0 opacity-55" />
	</summary>
	<div
		class="dropdown-content wash-date__panel {DROPDOWN_PANEL_Z} rounded-box border border-ink-border bg-base-100 p-0 shadow-[var(--shadow-paper-md)] {placement.top
			? 'mb-1'
			: 'mt-1'}"
		style:max-height="{panelStyle.maxHeight}px"
		style:--wash-dropdown-max-h={panelStyle['--wash-dropdown-max-h']}
		role="dialog"
		aria-label={emptyHint}
	>
		<WashCalendar
			{mode}
			value={value ?? ''}
			onChange={onCalendarChange}
			min={calendarMin}
			max={calendarMax}
			{isDateDisallowed}
			locale={resolvedLocale}
			size={compact ? 'sm' : 'md'}
			bordered={false}
			includeTime={withTime}
			aria-label={ariaLabel ?? emptyHint}
			className="w-full !max-w-none"
		/>
	</div>
</details>
{#if name}
	<input type="hidden" {name} value={value ?? ''} {required} {disabled} />
{/if}
