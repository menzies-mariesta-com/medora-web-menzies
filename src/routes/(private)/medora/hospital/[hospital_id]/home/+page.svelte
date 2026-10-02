<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { D3Util, type BarChartOptions } from '$lib/util/d3.util';
	import { formatIntegerDisplay } from '$lib/util/number-display.util';
	import {
		formatRangeValue,
		parseRangeValue,
		toISODate
	} from '$lib/util/wash-calendar-date.util';
	import WashCalendar from '$lib/component/wash/calendar/WashCalendar.svelte';
	import {
		dropdownPlacementClassName,
		measureDropdownPlacement,
		type DropdownPlacement
	} from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { m } from '$lib/paraglide/messages';
	import type {
		HospitalHomeCheckInRatio,
		HospitalHomeDashboardPayload
	} from '$lib/model/type/medora/hospital-home-dashboard.type';
	import LucideUsers from '$lib/component/own/library/lucide/LucideUsers.svelte';
	import LucideClock from '$lib/component/own/library/lucide/LucideClock.svelte';
	import LucideActivity from '$lib/component/own/library/lucide/LucideActivity.svelte';
	import LucideHeartPulse from '$lib/component/own/library/lucide/LucideHeartPulse.svelte';
	import LucideUser from '$lib/component/own/library/lucide/LucideUser.svelte';
	import LucideReceiptText from '$lib/component/own/library/lucide/LucideReceiptText.svelte';
	import LucideTriangleAlert from '$lib/component/own/library/lucide/LucideTriangleAlert.svelte';
	import LucidePackage from '$lib/component/own/library/lucide/LucidePackage.svelte';
	import LucideClipboardList from '$lib/component/own/library/lucide/LucideClipboardList.svelte';
	import LucideClipboardClock from '$lib/component/own/library/lucide/LucideClipboardClock.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';

	const msg = m as unknown as Record<
		string,
		(inputs?: Record<string, string | number>) => string
	>;

	let { data }: { data: HospitalHomeDashboardPayload } = $props();

	const stats = $derived(data.stats);
	const visitsByDay = $derived(data.visitsByDay ?? []);
	const filters = $derived(data.filters);

	let loading = $state(false);
	let dateDraft = $state('');
	let dateMenuOpen = $state(false);
	let dateDetailsEl = $state<HTMLDetailsElement | null>(null);
	let datePlacement = $state<DropdownPlacement>({
		top: false,
		end: false,
		maxHeight: 360
	});
	let visitsChartContainer: HTMLDivElement | null = $state(null);

	type BarPoint = { label: string; value: number };

	const displayDates = $derived(
		dateMenuOpen && dateDraft ? dateDraft : (filters?.dates ?? dateDraft)
	);

	function displayOrNA(value: number | null | undefined): string {
		if (value == null) return 'N/A';
		return formatIntegerDisplay(value, 'N/A');
	}

	function checkInRatioText(
		ratio: HospitalHomeCheckInRatio | undefined
	): string {
		if (!ratio) return 'N/A';
		const { checkedIn, confirmed } = ratio;
		if (confirmed === 0) return '0%';
		const pct = Math.round((checkedIn / confirmed) * 100);
		return `${checkedIn} / ${confirmed} (${pct}%)`;
	}

	/** Default API range when Clear is pressed (dates query is required). */
	function defaultDateRange(): string {
		const to = toISODate(new Date());
		const from = new Date(`${to}T00:00:00.000Z`);
		from.setUTCDate(from.getUTCDate() - 6);
		return formatRangeValue(from.toISOString().slice(0, 10), to);
	}

	function isCompleteRange(value: string): boolean {
		const { start, end } = parseRangeValue(value);
		return Boolean(
			start &&
				end &&
				/^\d{4}-\d{2}-\d{2}$/.test(start) &&
				/^\d{4}-\d{2}-\d{2}$/.test(end)
		);
	}

	function closeDateMenu() {
		dateMenuOpen = false;
		if (dateDetailsEl) dateDetailsEl.open = false;
	}

	async function applyDates(nextDates: string) {
		if (!isCompleteRange(nextDates)) return;
		if (filters?.dates === nextDates) {
			dateDraft = nextDates;
			closeDateMenu();
			return;
		}
		loading = true;
		dateDraft = nextDates;
		try {
			const nextUrl = new URL(page.url);
			nextUrl.searchParams.set('dates', nextDates);
			await goto(`${nextUrl.pathname}${nextUrl.search}`, {
				keepFocus: true,
				noScroll: true,
				invalidateAll: true
			});
		} finally {
			loading = false;
			closeDateMenu();
		}
	}

	function clearFilters() {
		void applyDates(defaultDateRange());
	}

	function updateDatePlacement() {
		if (!dateDetailsEl) return;
		datePlacement = measureDropdownPlacement(dateDetailsEl, {
			panelWidth: 320,
			panelHeight: 360
		});
	}

	function onDateDetailsToggle(e: Event) {
		const el = e.currentTarget as HTMLDetailsElement;
		dateMenuOpen = el.open;
		if (el.open) {
			dateDraft = filters?.dates ?? dateDraft;
			updateDatePlacement();
		}
	}

	function onCalendarChange(value: string) {
		dateDraft = value;
		if (isCompleteRange(value)) {
			void applyDates(value);
		}
	}

	$effect(() => {
		if (!dateMenuOpen) return;
		const onPointer = (ev: PointerEvent) => {
			const t = ev.target as Node | null;
			if (dateDetailsEl && t && !dateDetailsEl.contains(t)) {
				closeDateMenu();
			}
		};
		const onKey = (ev: KeyboardEvent) => {
			if (ev.key === 'Escape') closeDateMenu();
		};
		document.addEventListener('pointerdown', onPointer, true);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onPointer, true);
			document.removeEventListener('keydown', onKey);
		};
	});

	$effect(() => {
		const series = visitsByDay;
		const container = visitsChartContainer;
		if (!container) return;

		let cancelled = false;
		let retries = 0;
		const draw = () => {
			if (cancelled || !visitsChartContainer) return;
			const w = visitsChartContainer.clientWidth;
			const h = visitsChartContainer.clientHeight || 256;
			if (w <= 0 && retries++ < 20) {
				setTimeout(draw, 50);
				return;
			}
			visitsChartContainer.replaceChildren();
			if (!series.length) return;
			const chartData: BarPoint[] = series.map((d) => ({
				label: d.date.slice(5),
				value: d.count
			}));
			const options: BarChartOptions<BarPoint> = {
				container: visitsChartContainer,
				data: chartData,
				width: w,
				height: h,
				xAccessor: (d) => d.label,
				yAccessor: (d) => d.value,
				showGrid: true,
				tooltipFormatter: (d) =>
					msg.hospital_home_chart_visits_tooltip({
						label: d.label,
						count: d.value
					})
			};
			D3Util.createBarChart(options);
		};
		requestAnimationFrame(draw);
		return () => {
			cancelled = true;
		};
	});
</script>

<div
	class="min-h-[calc(100vh-4rem)] w-full space-y-6 bg-gradient-to-b from-base-200 via-base-100 to-base-200 px-4 py-6 lg:px-8 lg:py-8"
	class:cursor-wait={loading}
	class:opacity-90={loading}
	aria-busy={loading}
>
	<div
		class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3"
	>
		<div class="flex min-w-0 flex-wrap items-center gap-2">
			<span class="text-sm font-semibold text-base-content/80">
				{msg.hospital_home_filters_label()}
			</span>

			<details
				bind:this={dateDetailsEl}
				class={dropdownPlacementClassName(datePlacement, 'dropdown')}
				ontoggle={onDateDetailsToggle}
			>
				<summary
					class="btn btn-sm cursor-pointer gap-2 border-base-300"
					class:cursor-not-allowed={loading}
					aria-label={msg.hospital_home_date_range_aria()}
				>
					<span class="opacity-70">{msg.hospital_home_date_range()}</span>
					<span class="font-mono text-xs sm:text-sm">{displayDates}</span>
				</summary>
				<div
					class="dropdown-content z-40 mt-1 w-[min(100vw-2rem,20rem)] overflow-hidden rounded-box bg-base-100 p-0 shadow-md"
				>
					<WashCalendar
						mode="range"
						bind:value={dateDraft}
						size="sm"
						bordered={false}
						aria-label={msg.hospital_home_date_range_aria()}
						onChange={onCalendarChange}
						className="w-full !max-w-none"
					/>
				</div>
			</details>
		</div>

		<div class="flex items-center gap-2">
			{#if loading}
				<span
					class="loading loading-spinner loading-sm text-primary"
					aria-hidden="true"
				></span>
				<span class="sr-only">{msg.hospital_home_loading()}</span>
			{/if}
			<button
				type="button"
				class="btn btn-ghost btn-sm cursor-pointer gap-1"
				class:cursor-not-allowed={loading}
				class:btn-disabled={loading}
				disabled={loading}
				onclick={clearFilters}
			>
				<LucideX className="size-4" />
				{msg.hospital_home_clear_filters()}
			</button>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div
			class="stats w-full rounded-2xl border border-base-300/70 bg-base-100/95 shadow-lg"
		>
			<div class="stat">
				<div class="stat-figure text-primary">
					<LucideUsers className="size-8" />
				</div>
				<div class="stat-title">{msg.hospital_home_stat_doctors()}</div>
				<div class="stat-value text-primary">
					{displayOrNA(stats?.doctors)}
				</div>
			</div>
		</div>

		<div
			class="stats w-full rounded-2xl border border-base-300/70 bg-base-100/95 shadow-lg"
		>
			<div class="stat">
				<div class="stat-figure text-accent">
					<LucideClock className="size-8" />
				</div>
				<div class="stat-title">{msg.hospital_home_stat_appointments()}</div>
				<div class="stat-value text-accent">
					{displayOrNA(stats?.appointmentsInRange)}
				</div>
			</div>
		</div>

		<div
			class="stats w-full rounded-2xl border border-base-300/70 bg-base-100/95 shadow-lg"
		>
			<div class="stat">
				<div class="stat-figure text-warning">
					<LucideActivity className="size-8" />
				</div>
				<div class="stat-title">{msg.hospital_home_stat_visits()}</div>
				<div class="stat-value text-warning">
					{displayOrNA(stats?.visitsInRange)}
				</div>
			</div>
		</div>

		<div
			class="stats w-full rounded-2xl border border-base-300/70 bg-base-100/95 shadow-lg"
		>
			<div class="stat">
				<div class="stat-figure text-secondary">
					<LucideClipboardClock className="size-8" />
				</div>
				<div class="stat-title">{msg.hospital_home_stat_op_visits()}</div>
				<div class="stat-value text-secondary">
					{displayOrNA(stats?.opVisitsInRange)}
				</div>
			</div>
		</div>

		<div
			class="stats w-full rounded-2xl border border-base-300/70 bg-base-100/95 shadow-lg"
		>
			<div class="stat">
				<div class="stat-figure text-secondary">
					<LucideUser className="size-8" />
				</div>
				<div class="stat-title">{msg.hospital_home_stat_new_patients()}</div>
				<div class="stat-value text-secondary">
					{displayOrNA(stats?.newPatientsInRange)}
				</div>
			</div>
		</div>

		<div
			class="stats w-full rounded-2xl border border-base-300/70 bg-base-100/95 shadow-lg"
		>
			<div class="stat">
				<div class="stat-figure text-info">
					<LucideHeartPulse className="size-8" />
				</div>
				<div class="stat-title">{msg.hospital_home_stat_admissions()}</div>
				<div class="stat-value text-info">
					{displayOrNA(stats?.admissionsInRange)}
				</div>
			</div>
		</div>

		<div
			class="stats w-full rounded-2xl border border-base-300/70 bg-base-100/95 shadow-lg"
		>
			<div class="stat">
				<div class="stat-figure text-info">
					<LucideHeartPulse className="size-8" />
				</div>
				<div class="stat-title">{msg.hospital_home_stat_ip_census()}</div>
				<div class="stat-value text-info">
					{displayOrNA(stats?.ipCensus)}
				</div>
			</div>
		</div>

		<div
			class="stats w-full rounded-2xl border border-base-300/70 bg-base-100/95 shadow-lg"
		>
			<div class="stat">
				<div class="stat-figure text-warning">
					<LucideReceiptText className="size-8" />
				</div>
				<div class="stat-title">{msg.hospital_home_stat_open_bills()}</div>
				<div class="stat-value">
					{displayOrNA(stats?.openBills)}
				</div>
			</div>
		</div>

		<div
			class="stats w-full rounded-2xl border border-base-300/70 bg-base-100/95 shadow-lg"
		>
			<div class="stat">
				<div class="stat-figure text-success">
					<LucideReceiptText className="size-8" />
				</div>
				<div class="stat-title">{msg.hospital_home_stat_closed_bills()}</div>
				<div class="stat-value text-success">
					{displayOrNA(stats?.closedBillsInRange)}
				</div>
			</div>
		</div>

		<div
			class="stats w-full rounded-2xl border border-base-300/70 bg-base-100/95 shadow-lg"
		>
			<div class="stat">
				<div class="stat-figure text-error">
					<LucideTriangleAlert className="size-8" />
				</div>
				<div class="stat-title">{msg.hospital_home_stat_low_stock()}</div>
				<div class="stat-value text-error">
					{displayOrNA(stats?.lowStock)}
				</div>
			</div>
		</div>

		<div
			class="stats w-full rounded-2xl border border-base-300/70 bg-base-100/95 shadow-lg"
		>
			<div class="stat">
				<div class="stat-figure text-primary">
					<LucideClipboardList className="size-8" />
				</div>
				<div class="stat-title">{msg.hospital_home_stat_open_prs()}</div>
				<div class="stat-value text-primary">
					{displayOrNA(stats?.openPrs)}
				</div>
			</div>
		</div>

		<div
			class="stats w-full rounded-2xl border border-base-300/70 bg-base-100/95 shadow-lg"
		>
			<div class="stat">
				<div class="stat-figure text-primary">
					<LucidePackage className="size-8" />
				</div>
				<div class="stat-title">{msg.hospital_home_stat_open_pos()}</div>
				<div class="stat-value text-primary">
					{displayOrNA(stats?.openPos)}
				</div>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
		<div
			class="stats w-full rounded-2xl border border-base-300/70 bg-base-100/95 shadow-lg lg:col-span-1"
		>
			<div class="stat">
				<div class="stat-figure text-info">
					<LucideCircleCheck className="size-8" />
				</div>
				<div class="stat-title">{msg.hospital_home_stat_check_in_ratio()}</div>
				<div class="stat-value text-2xl text-info sm:text-3xl">
					{checkInRatioText(stats?.checkInRatio)}
				</div>
			</div>
		</div>

		<div
			class="card rounded-2xl border border-base-300/70 bg-gradient-to-br from-primary/10 via-base-100 to-base-100 shadow-lg lg:col-span-2"
		>
			<div class="card-body">
				<h3 class="card-title text-base font-bold text-primary">
					{msg.hospital_home_chart_visits_title()}
				</h3>
				<div
					class="mt-2 h-64 w-full min-w-0 overflow-hidden"
					bind:this={visitsChartContainer}
				></div>
			</div>
		</div>
	</div>
</div>
