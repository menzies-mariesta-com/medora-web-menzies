<script lang="ts">
	import { onMount } from 'svelte';
	import { D3Util, type BarChartOptions } from '$lib/util/d3.util';
	import { formatIntegerDisplay } from '$lib/util/number-display.util';

	type DailyVisitCount = {
		date: string;
		count: number;
	};

	type CheckInRatio = { checkedIn: number; confirmed: number };

	type DashboardStats = {
		doctors: number;
		patients: number;
		appointmentsToday: number;
		prescriptions: number | null;
		caseHistory: number;
		documents: number;
		invoices: number | null;
		unbill: number | null;
		checkInRatio: CheckInRatio;
		visitsLast7DaysTotal: number;
	};

	type PageData = {
		currentHospitalName?: string | null;
		/** Label for the nav-selected branch (or “All branches”); from `+page.server`. */
		branchScopeName?: string | null;
		stats?: DashboardStats | null;
		visitsLast7Days?: DailyVisitCount[];
	};

	export let data: PageData;

	let visitsChartContainer: HTMLDivElement | null = null;

	type BarPoint = {
		label: string;
		value: number;
	};

	function displayOrNA(value: number | null | undefined): string {
		if (value == null) return 'N/A';
		return formatIntegerDisplay(value, 'N/A');
	}

	function checkInRatioText(ratio: CheckInRatio | undefined): string {
		if (!ratio) return 'N/A';
		const { checkedIn, confirmed } = ratio;
		if (confirmed === 0) return '0%';
		const pct = Math.round((checkedIn / confirmed) * 100);
		return `${checkedIn} / ${confirmed} (${pct}%)`;
	}

	onMount(() => {
		if (!visitsChartContainer || !data?.visitsLast7Days?.length)
			return;

		const chartData: BarPoint[] = data.visitsLast7Days.map((d) => ({
			label: d.date.slice(5),
			value: d.count
		}));

		let retries = 0;
		const drawChart = () => {
			const w = visitsChartContainer?.clientWidth ?? 0;
			const h = visitsChartContainer?.clientHeight ?? 256;
			if (w <= 0 && retries++ < 20) {
				setTimeout(drawChart, 50);
				return;
			}

			const options: BarChartOptions<BarPoint> = {
				container: visitsChartContainer!,
				data: chartData,
				width: w,
				height: h,
				xAccessor: (d) => d.label,
				yAccessor: (d) => d.value,
				showGrid: true,
				tooltipFormatter: (d) => `${d.label}: ${d.value} visits`
			};

			D3Util.createBarChart(options);
		};

		requestAnimationFrame(drawChart);
	});
</script>

<div
	class="min-h-[calc(100vh-4rem)] w-full space-y-6 bg-gradient-to-b from-base-200 via-base-100 to-base-200 px-4 py-6 lg:px-8 lg:py-8"
>
	<div
		class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between"
	>
		<div>
			<h2 class="text-2xl font-semibold tracking-tight">
				{data.currentHospitalName ?? 'Hospital'} dashboard
			</h2>
			<p class="text-sm text-base-content/70">
				Key activity for the branch in your nav bar. Only active records
				(visits, appointments, schedules) are included.
			</p>
			{#if data.branchScopeName}
				<p class="text-sm font-medium text-base-content/80">
					Current scope: {data.branchScopeName}
				</p>
			{/if}
		</div>
	</div>

	<!-- Primary stats (DaisyUI stats, responsive) -->
	<div class="w-full space-y-4">
		<div
			class="d-stats w-full d-stats-vertical rounded-2xl border border-base-300/70 bg-base-100/95 shadow-lg lg:d-stats-horizontal"
		>
			<div class="d-stat">
				<div class="d-stat-figure text-primary">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="inline-block h-8 w-8 stroke-current"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7a4 4 0 118 0 4 4 0 01-8 0zM6 21a6 6 0 0112 0"
						/>
					</svg>
				</div>
				<div class="d-stat-title">Doctors</div>
				<div class="d-stat-value text-primary">
					{displayOrNA(data.stats?.doctors)}
				</div>
				<div class="d-stat-desc">
					Doctors with an active schedule in this branch (or in your
					selected scope)
				</div>
			</div>

			<div class="d-stat">
				<div class="d-stat-figure text-secondary">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="inline-block h-8 w-8 stroke-current"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 20a4 4 0 00-8 0m4-8a4 4 0 100-8 4 4 0 000 8zM7 8a4 4 0 11-4 4"
						/>
					</svg>
				</div>
				<div class="d-stat-title">Patients</div>
				<div class="d-stat-value text-secondary">
					{displayOrNA(data.stats?.patients)}
				</div>
				<div class="d-stat-desc">
					Active patients with an active visit in this branch
				</div>
			</div>

			<div class="d-stat">
				<div class="d-stat-figure text-accent">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="inline-block h-8 w-8 stroke-current"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<div class="d-stat-title">Appointments today</div>
				<div class="d-stat-value text-accent">
					{displayOrNA(data.stats?.appointmentsToday)}
				</div>
				<div class="d-stat-desc">
					Active appointments booked for today in this branch
				</div>
			</div>

			<div class="d-stat">
				<div class="d-stat-figure text-error">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="inline-block h-8 w-8 stroke-current"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M4.93 4.93l14.14 14.14"
						/>
					</svg>
				</div>
				<div class="d-stat-title">Prescriptions</div>
				<div class="d-stat-value">
					{displayOrNA(data.stats?.prescriptions)}
				</div>
				<div class="d-stat-desc">
					Module not implemented yet (showing N/A)
				</div>
			</div>
		</div>

		<div
			class="d-stats w-full d-stats-vertical rounded-2xl border border-base-300/70 bg-base-100/95 shadow-lg lg:d-stats-horizontal"
		>
			<div class="d-stat">
				<div class="d-stat-figure text-info">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="inline-block h-8 w-8 stroke-current"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-3-9a9 9 0 100 18 9 9 0 000-18z"
						/>
					</svg>
				</div>
				<div class="d-stat-title">Case history</div>
				<div class="d-stat-value text-info">
					{displayOrNA(data.stats?.caseHistory)}
				</div>
				<div class="d-stat-desc">
					Active case history (vitals / diagnosis rows) in this branch
				</div>
			</div>

			<div class="d-stat">
				<div class="d-stat-figure text-success">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="inline-block h-8 w-8 stroke-current"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4h16v16H4z"
						/>
					</svg>
				</div>
				<div class="d-stat-title">Documents</div>
				<div class="d-stat-value text-success">
					{displayOrNA(data.stats?.documents)}
				</div>
				<div class="d-stat-desc">
					Active clinical documents for visits in this branch
				</div>
			</div>

			<div class="d-stat">
				<div class="d-stat-figure text-warning">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="inline-block h-8 w-8 stroke-current"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 5h18M5 9h14M7 13h10M9 17h6"
						/>
					</svg>
				</div>
				<div class="d-stat-title">Invoices</div>
				<div class="d-stat-value">
					{displayOrNA(data.stats?.invoices)}
				</div>
				<div class="d-stat-desc">
					Billing not implemented yet (showing N/A)
				</div>
			</div>

			<div class="d-stat">
				<div class="d-stat-figure text-warning">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="inline-block h-8 w-8 stroke-current"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 19l8-14 8 14H4z"
						/>
					</svg>
				</div>
				<div class="d-stat-title">Visits (7 days)</div>
				<div class="d-stat-value text-warning">
					{displayOrNA(data.stats?.visitsLast7DaysTotal)}
				</div>
				<div class="d-stat-desc">
					Active visits in the last 7 days in this branch
				</div>
			</div>
		</div>

		<!-- Unbill & Check-in ratio -->
		<div
			class="d-stats w-full d-stats-vertical rounded-2xl border border-base-300/70 bg-base-100/95 shadow-lg lg:d-stats-horizontal"
		>
			<div class="d-stat">
				<div class="d-stat-figure text-base-content/70">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="inline-block h-8 w-8 stroke-current"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
						/>
					</svg>
				</div>
				<div class="d-stat-title">Unbill</div>
				<div class="d-stat-value">
					{displayOrNA(data.stats?.unbill)}
				</div>
				<div class="d-stat-desc">
					Unbilled items (N/A until billing is implemented)
				</div>
			</div>

			<div class="d-stat">
				<div class="d-stat-figure text-info">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="inline-block h-8 w-8 stroke-current"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
						/>
					</svg>
				</div>
				<div class="d-stat-title">Check-in ratio to confirm</div>
				<div class="d-stat-value text-info">
					{checkInRatioText(data.stats?.checkInRatio)}
				</div>
				<div class="d-stat-desc">
					Today, active appointments: checked in vs confirmed (this branch)
				</div>
			</div>
		</div>
	</div>

	<!-- Charts & secondary cards -->
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
		<div
			class="d-card rounded-2xl border border-base-300/70 bg-gradient-to-br from-primary/10 via-base-100 to-base-100 shadow-lg"
		>
			<div class="d-card-body">
				<h3 class="d-card-title text-base">
					Visits in the last 7 days
				</h3>
				<p class="text-xs text-base-content/70">
					Active patient visits in the selected branch (same scope as
					above); counts use visit created date.
				</p>
				<div
					class="mt-4 h-64 w-full min-w-0 overflow-hidden"
					bind:this={visitsChartContainer}
				></div>
			</div>
		</div>

		<div
			class="d-card rounded-2xl border border-base-300/70 bg-base-100/95 shadow-lg"
		>
			<div class="d-card-body grid gap-3">
				<h3 class="d-card-title text-base">Today at a glance</h3>
				<div class="grid grid-cols-2 gap-3 text-sm">
					<div>
						<div class="text-xs text-base-content/70">
							Appointments today
						</div>
						<div class="mt-1 font-semibold">
							{displayOrNA(data.stats?.appointmentsToday)}
						</div>
					</div>
					<div>
						<div class="text-xs text-base-content/70">Doctors</div>
						<div class="mt-1 font-semibold">
							{displayOrNA(data.stats?.doctors)}
						</div>
					</div>
					<div>
						<div class="text-xs text-base-content/70">Patients</div>
						<div class="mt-1 font-semibold">
							{displayOrNA(data.stats?.patients)}
						</div>
					</div>
					<div>
						<div class="text-xs text-base-content/70">
							New case history entries
						</div>
						<div class="mt-1 font-semibold">
							{displayOrNA(data.stats?.caseHistory)}
						</div>
					</div>
				</div>
				<p class="mt-2 text-xs text-base-content/60">
					Prescriptions and invoices will show as N/A until those
					modules are implemented.
				</p>
			</div>
		</div>
	</div>
</div>
