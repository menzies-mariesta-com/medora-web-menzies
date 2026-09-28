<script lang="ts">
	/**
	 * Svelte adapter for Design WashTimePicker (web 1.3.0).
	 * Analog clock: hour → minute → second. Use `dropdown-no-hover`.
	 * @see https://design-menzies.netlify.app/ — Time picker
	 */
	import LucideClock from '$lib/component/own/library/lucide/LucideClock.svelte';
	import {
		formatTimeDisplay,
		fromHour12,
		joinTimeParts,
		normalizeTime,
		splitTimeParts,
		toHour12,
		uses12HourClock
	} from '$lib/util/wash-calendar-date.util';
	import {
		DROPDOWN_PANEL_Z,
		createWashId,
		dropdownPanelStyle,
		dropdownPlacementClassName,
		measureDropdownPlacement,
		type DropdownPlacement
	} from '@menzies-mariesta-com/menzies-design-wash-ui/core';

	type DialView = 'hour' | 'minute' | 'second';

	let {
		value = $bindable(),
		onChange,
		locale,
		size = 'md',
		disabled = false,
		id,
		className = '',
		triggerClassName = '',
		'aria-label': ariaLabel
	}: {
		value?: string;
		onChange?: (value: string) => void;
		locale?: string;
		size?: 'md' | 'sm';
		disabled?: boolean;
		id?: string;
		className?: string;
		triggerClassName?: string;
		'aria-label'?: string;
	} = $props();

	const generatedId = createWashId('wash-time');
	const rootId = $derived(id ?? generatedId);
	const resolvedLocale = $derived(
		locale ??
			(typeof navigator !== 'undefined' ? navigator.language : 'en-US')
	);
	const compact = $derived(size === 'sm');
	const twelveHour = $derived(uses12HourClock(resolvedLocale));

	let detailsEl = $state<HTMLDetailsElement | null>(null);
	let dialEl = $state<HTMLDivElement | null>(null);
	let view = $state<DialView>('hour');
	let dragging = $state(false);
	let placement = $state<DropdownPlacement>({
		end: false,
		top: false,
		maxHeight: 360
	});
	let internal = $state('09:00:00');

	const resolved = $derived(
		normalizeTime(value ?? internal) ?? '09:00:00'
	);
	const { hour24, minute, second } = $derived(splitTimeParts(resolved));
	const { hour12, period } = $derived(toHour12(hour24));
	const display = $derived(formatTimeDisplay(resolved, resolvedLocale));

	function setValue(next: string) {
		const normalized = normalizeTime(next) ?? '09:00:00';
		if (value === undefined) internal = normalized;
		else value = normalized;
		onChange?.(normalized);
	}

	function commit(h: number, m: number, s: number) {
		setValue(joinTimeParts(h, m, s));
	}

	function angleFromPointer(
		clientX: number,
		clientY: number,
		rect: DOMRect
	): number {
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		const dx = clientX - cx;
		const dy = clientY - cy;
		let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
		if (deg < 0) deg += 360;
		return deg;
	}

	function valueFromAngle(deg: number, steps: number): number {
		const step = 360 / steps;
		return Math.round(deg / step) % steps;
	}

	function clockPoint(
		val: number,
		steps: number,
		radius: number
	): { x: number; y: number } {
		const rad = ((val / steps) * 360 - 90) * (Math.PI / 180);
		return {
			x: 100 + Math.cos(rad) * radius,
			y: 100 + Math.sin(rad) * radius
		};
	}

	function applyDial(clientX: number, clientY: number) {
		const el = dialEl;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const deg = angleFromPointer(clientX, clientY, rect);
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		const dist = Math.hypot(clientX - cx, clientY - cy);
		const radius = Math.min(rect.width, rect.height) / 2;
		if (view === 'hour') {
			const outer = dist > radius * 0.62;
			const slot = valueFromAngle(deg, 12);
			const hour = outer ? slot : slot === 0 ? 12 : slot + 12;
			commit(hour % 24, minute, second);
			return;
		}
		if (view === 'minute') {
			commit(hour24, valueFromAngle(deg, 60), second);
			return;
		}
		commit(hour24, minute, valueFromAngle(deg, 60));
	}

	function onDialPointerDown(e: PointerEvent) {
		if (disabled) return;
		e.preventDefault();
		dragging = true;
		try {
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
		applyDial(e.clientX, e.clientY);
	}

	$effect(() => {
		if (!dragging) return;
		function onMove(e: PointerEvent) {
			e.preventDefault();
			applyDial(e.clientX, e.clientY);
		}
		function onUp() {
			dragging = false;
			if (view === 'hour') view = 'minute';
			else if (view === 'minute') view = 'second';
		}
		window.addEventListener('pointermove', onMove, { passive: false });
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);
		return () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('pointercancel', onUp);
		};
	});

	const hourHandAngle = $derived(
		(hour24 % 12 + minute / 60 + second / 3600) * 30
	);
	const minuteHandAngle = $derived((minute + second / 60) * 6);
	const secondHandAngle = $derived(second * 6);

	const dialLabels = $derived.by(() => {
		if (view === 'hour') {
			const outer = Array.from({ length: 12 }, (_, i) => ({
				value: i,
				label: String(i).padStart(2, '0'),
				ring: 'outer' as const
			}));
			const inner = Array.from({ length: 12 }, (_, i) => {
				const v = i === 0 ? 12 : i + 12;
				return {
					value: v,
					label: String(v).padStart(2, '0'),
					ring: 'inner' as const
				};
			});
			return [...outer, ...inner];
		}
		return Array.from({ length: 12 }, (_, i) => {
			const n = i * 5;
			return {
				value: n,
				label: String(n).padStart(2, '0'),
				ring: 'outer' as const
			};
		});
	});

	const activeValue = $derived(
		view === 'hour' ? hour24 : view === 'minute' ? minute : second
	);
	const pointerPos = $derived(
		view === 'hour'
			? hour24 >= 12
				? clockPoint(hour24 - 12, 12, 52)
				: clockPoint(hour24, 12, 72)
			: clockPoint(activeValue, 60, 72)
	);

	function pad2(n: number): string {
		return String(n).padStart(2, '0');
	}

	function onToggle(event: Event) {
		const details = event.currentTarget as HTMLDetailsElement;
		if (disabled) {
			details.open = false;
			return;
		}
		if (details.open) {
			view = 'hour';
			placement = measureDropdownPlacement(details, {
				panelWidth: compact ? 220 : 248,
				panelHeight: compact ? 320 : 360
			});
		}
	}

	const rootClass = $derived(
		[
			dropdownPlacementClassName(placement),
			'wash-time w-full dropdown-no-hover',
			disabled ? 'wash-time--disabled pointer-events-none opacity-60' : '',
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
		class="wash-time__trigger input input-bordered flex w-full items-center justify-between gap-2 [&::-webkit-details-marker]:hidden {disabled
			? 'cursor-not-allowed'
			: 'cursor-pointer'} {compact ? 'input-sm' : ''} {triggerClassName}"
		aria-label={ariaLabel ?? `Time: ${display}`}
		aria-haspopup="dialog"
		aria-disabled={disabled || undefined}
	>
		<span class="min-w-0 truncate font-mono text-sm tabular-nums"
			>{display}</span
		>
		<LucideClock className="size-4 shrink-0 opacity-55" />
	</summary>
	<div
		class="dropdown-content wash-time__panel {DROPDOWN_PANEL_Z} rounded-box border border-ink-border bg-base-100 shadow-[var(--shadow-paper-md)] {placement.top
			? 'mb-1'
			: 'mt-1'}"
		style:max-height="{panelStyle.maxHeight}px"
		style:--wash-dropdown-max-h={panelStyle['--wash-dropdown-max-h']}
		role="dialog"
		aria-label="Choose time"
	>
		<div class="wash-time__readout" role="group" aria-label="Time parts">
			<button
				type="button"
				class="wash-time__part cursor-pointer font-mono {view === 'hour'
					? 'wash-time__part--active'
					: ''}"
				aria-pressed={view === 'hour'}
				onclick={() => {
					view = 'hour';
				}}
			>
				{twelveHour ? pad2(hour12) : pad2(hour24)}
			</button>
			<span class="wash-time__sep" aria-hidden="true">:</span>
			<button
				type="button"
				class="wash-time__part cursor-pointer font-mono {view === 'minute'
					? 'wash-time__part--active'
					: ''}"
				aria-pressed={view === 'minute'}
				onclick={() => {
					view = 'minute';
				}}
			>
				{pad2(minute)}
			</button>
			<span class="wash-time__sep" aria-hidden="true">:</span>
			<button
				type="button"
				class="wash-time__part cursor-pointer font-mono {view === 'second'
					? 'wash-time__part--active'
					: ''}"
				aria-pressed={view === 'second'}
				onclick={() => {
					view = 'second';
				}}
			>
				{pad2(second)}
			</button>
			{#if twelveHour}
				<div class="wash-time__ampm join" role="group" aria-label="AM or PM">
					<button
						type="button"
						class="btn btn-xs join-item cursor-pointer {period === 'AM'
							? 'btn-primary'
							: 'btn-ghost'}"
						aria-pressed={period === 'AM'}
						onclick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							commit(fromHour12(hour12, 'AM'), minute, second);
						}}
					>
						AM
					</button>
					<button
						type="button"
						class="btn btn-xs join-item cursor-pointer {period === 'PM'
							? 'btn-primary'
							: 'btn-ghost'}"
						aria-pressed={period === 'PM'}
						onclick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							commit(fromHour12(hour12, 'PM'), minute, second);
						}}
					>
						PM
					</button>
				</div>
			{/if}
		</div>

		<div
			bind:this={dialEl}
			class="wash-time__dial {compact
				? 'wash-time__dial--sm'
				: ''} {dragging ? 'wash-time__dial--dragging' : ''}"
			role="slider"
			aria-valuemin={0}
			aria-valuemax={view === 'hour' ? 23 : 59}
			aria-valuenow={activeValue}
			aria-label={view === 'hour'
				? 'Hour (outer 0-11, inner 12-23)'
				: view === 'minute'
					? 'Minute'
					: 'Second'}
			tabindex={disabled ? -1 : 0}
			onpointerdown={onDialPointerDown}
		>
			<svg class="wash-time__svg" viewBox="0 0 200 200" aria-hidden="true">
				<circle class="wash-time__face" cx="100" cy="100" r="96" />
				<line
					class="wash-time__hand wash-time__hand--hour {view === 'hour'
						? 'wash-time__hand--active'
						: ''}"
					x1="100"
					y1="100"
					x2={100 + Math.cos(((hourHandAngle - 90) * Math.PI) / 180) * 48}
					y2={100 + Math.sin(((hourHandAngle - 90) * Math.PI) / 180) * 48}
				/>
				<line
					class="wash-time__hand wash-time__hand--minute {view === 'minute'
						? 'wash-time__hand--active'
						: ''}"
					x1="100"
					y1="100"
					x2={100 +
						Math.cos(((minuteHandAngle - 90) * Math.PI) / 180) * 68}
					y2={100 +
						Math.sin(((minuteHandAngle - 90) * Math.PI) / 180) * 68}
				/>
				<line
					class="wash-time__hand wash-time__hand--second {view === 'second'
						? 'wash-time__hand--active'
						: ''}"
					x1="100"
					y1="100"
					x2={100 +
						Math.cos(((secondHandAngle - 90) * Math.PI) / 180) * 78}
					y2={100 +
						Math.sin(((secondHandAngle - 90) * Math.PI) / 180) * 78}
				/>
				<line
					class="wash-time__pointer"
					x1="100"
					y1="100"
					x2={pointerPos.x}
					y2={pointerPos.y}
				/>
				<circle
					class="wash-time__pointer-knob"
					cx={pointerPos.x}
					cy={pointerPos.y}
					r="11"
				/>
				<circle class="wash-time__hub" cx="100" cy="100" r="4" />
			</svg>
			{#each dialLabels as item (`${item.ring}-${item.value}`)}
				{@const radius = item.ring === 'inner' ? 52 : 78}
				{@const pos = clockPoint(
					view === 'hour'
						? item.ring === 'outer'
							? item.value % 12
							: item.value === 12
								? 0
								: item.value - 12
						: item.value / 5,
					12,
					radius
				)}
				{@const selected =
					view === 'hour'
						? item.value === hour24
						: activeValue === item.value}
				<span
					class="wash-time__label font-mono {selected
						? 'wash-time__label--selected'
						: ''}"
					style:left={`${(pos.x / 200) * 100}%`}
					style:top={`${(pos.y / 200) * 100}%`}
				>
					{item.label}
				</span>
			{/each}
		</div>
		<p class="wash-time__hint">
			{view === 'hour'
				? 'Outer ring 0-11, inner 12-23, then minutes'
				: view === 'minute'
					? 'Select minute (0-59), then seconds'
					: 'Select second (0-59)'}
		</p>
	</div>
</details>
