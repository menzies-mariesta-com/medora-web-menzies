<script lang="ts">
	import { page } from '$app/state';
	import { parseUuid } from '$lib/util/id.util';
	import { m } from '$lib/paraglide/messages';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { TableRowEnum } from '$lib/model/enum/table-row.enum';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import LVitalTrendChart from '$lib/component/own/local/private/medora/visit/LVitalTrendChart.svelte';
	import {
		VITAL_REFERENCE_RANGES,
		vitalTextClass,
		type VitalKey
	} from '$lib/config/vital.config';
	import { VitalEnum } from '$lib/model/enum/vital.enum';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import {
		throwUserFacingHttpError,
		toUserFacingErrorDetail
	} from '$lib/util/user-facing-error.util';
	import {
		buildVitalSeries,
		latestVitalReading
	} from '$lib/tool/vital/vital-trend.tool';
	import type {
		VisitVisualPayload,
		VisitVisualVitalRow
	} from '$lib/model/type/visit-dashboard.type';

	const datetimeUtil = new DateTimeUtil();
	const lifeCycleUtil = new LifeCycleUtil();

	const visitIdStr = $derived(page.url.searchParams.get('visitId') ?? '');
	const visitId = $derived(parseUuid(visitIdStr) ?? '');
	const hospitalId = $derived(page.params.hospital_id ?? '');

	let payload = $state<VisitVisualPayload | null>(null);
	let isLoading = $state(false);
	let loadError = $state('');
	let mounted = $state(false);

	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let currentPage = $state(1);
	/** Bumped by the refresh button so the effect refetches the same page. */
	let refreshToken = $state(0);
	let tableRows = $state<VisitVisualVitalRow[]>([]);
	let tableTotal = $state(0);

	const series = $derived(payload?.series ?? []);

	const pulseSeries = $derived(buildVitalSeries(series, 'pulse'));
	const temperatureSeries = $derived(
		buildVitalSeries(series, 'temperature')
	);
	const weightSeries = $derived(buildVitalSeries(series, 'weight'));
	const spo2Series = $derived(buildVitalSeries(series, 'spO2'));
	const glucoseSeries = $derived(buildVitalSeries(series, 'rbs'));
	const systolicSeries = $derived(buildVitalSeries(series, 'bpSystolic'));
	const diastolicSeries = $derived(buildVitalSeries(series, 'bpDiastolic'));

	type CardKey =
		| 'bp'
		| 'heartRate'
		| 'temperature'
		| 'respiration'
		| 'spo2'
		| 'weight';

	type StatusCard = {
		id: CardKey;
		label: string;
		value: string;
		unit: string;
		/** Number colour; out-of-range still overrides with `text-error`. */
		accentClass: string;
		tintClass: string;
		reference: string;
		latestLabel: string;
	};

	function formatValue(value: number | null | undefined): string {
		if (value == null || !Number.isFinite(value)) return '–';
		return Number.isInteger(value)
			? String(value)
			: String(Math.round(value * 10) / 10);
	}

	function referenceLabel(key: VitalKey): string {
		const { min, max } = VITAL_REFERENCE_RANGES[key];
		return m.visit_visual_ref_range({ min: `${min}`, max: `${max}` });
	}

	function latestLabel(reading: { at: number } | null): string {
		if (!reading) return m.nursing_case_sheet_no_entries();
		return m.visit_visual_latest_on({
			date: new Date(reading.at).toLocaleString()
		});
	}

	const statusCards = $derived.by((): StatusCard[] => {
		const systolic = latestVitalReading(series, 'bpSystolic');
		const diastolic = latestVitalReading(series, 'bpDiastolic');
		const pulse = latestVitalReading(series, 'pulse');
		const temperature = latestVitalReading(series, 'temperature');
		const respiration = latestVitalReading(series, 'respiration');
		const spo2 = latestVitalReading(series, 'spO2');
		const weight = latestVitalReading(series, 'weight');

		const tint = (value: number | null | undefined, key: VitalKey) =>
			value != null ? vitalTextClass(`${value}`, key) : '';

		return [
			{
				id: 'bp',
				label: m.visit_visual_card_bp(),
				value: `${formatValue(systolic?.value)}/${formatValue(diastolic?.value)}`,
				unit: 'mmHg',
				accentClass: 'text-primary',
				// Either number out of range tints the card.
				tintClass:
					tint(systolic?.value, VitalEnum.BP_SYSTOLIC as VitalKey) ||
					tint(diastolic?.value, VitalEnum.BP_DIASTOLIC as VitalKey),
				reference: referenceLabel(VitalEnum.BP_SYSTOLIC as VitalKey),
				latestLabel: latestLabel(systolic ?? diastolic)
			},
			{
				id: 'heartRate',
				label: m.visit_visual_card_heart_rate(),
				value: formatValue(pulse?.value),
				unit: 'bpm',
				accentClass: 'text-secondary',
				tintClass: tint(pulse?.value, VitalEnum.PULSE as VitalKey),
				reference: referenceLabel(VitalEnum.PULSE as VitalKey),
				latestLabel: latestLabel(pulse)
			},
			{
				id: 'temperature',
				label: m.visit_visual_card_temperature(),
				value: formatValue(temperature?.value),
				unit: '°C',
				accentClass: 'text-warning',
				tintClass: tint(
					temperature?.value,
					VitalEnum.TEMPERATURE as VitalKey
				),
				reference: referenceLabel(VitalEnum.TEMPERATURE as VitalKey),
				latestLabel: latestLabel(temperature)
			},
			{
				id: 'respiration',
				label: m.visit_visual_card_respiration(),
				value: formatValue(respiration?.value),
				unit: '/min',
				accentClass: 'text-info',
				tintClass: tint(
					respiration?.value,
					VitalEnum.RESPIRATION as VitalKey
				),
				reference: referenceLabel(VitalEnum.RESPIRATION as VitalKey),
				latestLabel: latestLabel(respiration)
			},
			{
				id: 'spo2',
				label: m.visit_visual_card_spo2(),
				value: formatValue(spo2?.value),
				unit: '%',
				accentClass: 'text-success',
				tintClass: tint(spo2?.value, VitalEnum.SP_O2 as VitalKey),
				reference: referenceLabel(VitalEnum.SP_O2 as VitalKey),
				latestLabel: latestLabel(spo2)
			},
			{
				id: 'weight',
				label: m.visit_visual_card_weight(),
				value: formatValue(weight?.value),
				unit: 'kg',
				accentClass: 'text-primary',
				tintClass: '',
				reference: '',
				latestLabel: latestLabel(weight)
			}
		];
	});

	function visualApiUrl(pageNo: number, pageSize: number): string {
		const search = new URLSearchParams({
			visitId,
			page: String(pageNo),
			pageSize: String(pageSize)
		});
		return `/api/medora/hospital/${hospitalId}/home/nursing-workbench/emr/patient-visit-history-dashboard/visual?${search}`;
	}

	async function load(
		page: number,
		size: number,
		opts?: { signal?: AbortSignal; isCancelled?: () => boolean }
	) {
		if (!hospitalId || !visitId) return;
		isLoading = true;
		loadError = '';
		try {
			const res = await fetch(visualApiUrl(page, size), {
				signal: opts?.signal
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			const data = (await res.json()) as VisitVisualPayload;
			if (opts?.isCancelled?.()) return;
			payload = data;
			tableRows = data.table.rows;
			tableTotal = data.table.total;
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') return;
			if (opts?.isCancelled?.()) return;
			console.error(err);
			loadError = toUserFacingErrorDetail(err) ?? m.error_load_failed();
		} finally {
			if (!opts?.isCancelled?.()) isLoading = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		mounted = true;
	});

	lifeCycleUtil.onDestroy(() => {
		mounted = false;
	});

	// The effect owns every fetch: page, page size and refresh all rerun it.
	$effect(() => {
		if (!mounted) return;
		// `token` is only read so the refresh button re-runs this effect.
		const request = {
			page: currentPage,
			size: Number(pageSizeStr) || 10,
			token: refreshToken
		};

		if (!visitId) {
			payload = null;
			tableRows = [];
			tableTotal = 0;
			return;
		}

		let cancelled = false;
		const ac = new AbortController();
		void load(request.page, request.size, {
			signal: ac.signal,
			isCancelled: () => cancelled
		});
		return () => {
			cancelled = true;
			ac.abort();
		};
	});

	const vitalTableColumns: MenziesTableColumn<VisitVisualVitalRow>[] = [
		{
			id: 'recordedAt',
			header: m.nursing_case_sheet_col_date(),
			widthClass: 'w-40 min-w-[10rem] whitespace-nowrap',
			filterable: false,
			format: (_value, row) => datetimeUtil.formatDateTime(row.recordedAt)
		},
		{
			id: 'visitNo',
			header: m.visit_visual_col_visit_no(),
			widthClass: TableRowEnum.VISIT_NO_WIDTH,
			filterable: false,
			format: (_value, row) => row.visitNo?.trim() || '–'
		},
		{
			id: 'bp',
			header: m.nursing_case_sheet_col_bp(),
			widthClass: 'w-28 min-w-[7rem]',
			filterable: false,
			format: (_value, row) =>
				`${row.bpSystolic ?? '–'}/${row.bpDiastolic ?? '–'}`,
			cellClassGetter: (row) =>
				vitalTextClass(row.bpSystolic, 'bpSystolic') ||
				vitalTextClass(row.bpDiastolic, 'bpDiastolic')
		},
		{
			id: 'pulse',
			header: m.nursing_case_sheet_col_pulse(),
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			format: (_value, row) => row.pulse ?? '–',
			cellClassGetter: (row) => vitalTextClass(row.pulse, 'pulse')
		},
		{
			id: 'temperature',
			header: m.nursing_case_sheet_col_temp(),
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			format: (_value, row) => row.temperature ?? '–',
			cellClassGetter: (row) =>
				vitalTextClass(row.temperature, 'temperature')
		},
		{
			id: 'respiration',
			header: m.nursing_case_sheet_col_respiration(),
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			format: (_value, row) => row.respiration ?? '–',
			cellClassGetter: (row) =>
				vitalTextClass(row.respiration, 'respiration')
		},
		{
			id: 'spO2',
			header: m.nursing_case_sheet_col_spo2(),
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			format: (_value, row) => row.spO2 ?? '–',
			cellClassGetter: (row) => vitalTextClass(row.spO2, 'spO2')
		},
		{
			id: 'weight',
			header: m.nursing_case_sheet_col_weight_kg(),
			widthClass: 'w-24 min-w-[6rem]',
			filterable: false,
			format: (_value, row) => row.weight ?? '–'
		},
		{
			id: 'rbs',
			header: m.nursing_case_sheet_col_rbs(),
			widthClass: 'w-28 min-w-[7rem]',
			filterable: false,
			format: (_value, row) => row.rbs ?? '–',
			cellClassGetter: (row) => vitalTextClass(row.rbs, 'rbs')
		}
	];
</script>

<div class="flex min-w-0 flex-col gap-6">
	{#if !visitId}
		<WashAlert
			type={StatusColorEnum.INFO}
			message={m.visit_visual_choose_visit()}
			className="z-0 border-l-4 border-info shadow-sm"
		/>
	{:else if loadError}
		<WashAlert
			type={StatusColorEnum.ERROR}
			message={loadError}
			className="z-0 border-l-4 border-error shadow-sm"
		/>
	{:else}

		<section aria-labelledby="visit-visual-status-heading" class="space-y-3">
			<h2
				id="visit-visual-status-heading"
				class="text-sm font-semibold tracking-wide text-base-content/60 uppercase"
			>
				{m.visit_visual_status_section()}
			</h2>
			<div
				class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6"
			>
				{#each statusCards as card (card.id)}
					<article
						class="rounded-box border border-base-300 bg-base-100 px-3 py-2 shadow-sm"
					>
						<p
							class="truncate text-[0.7rem] font-medium tracking-wide text-base-content/60 uppercase"
							title={card.label}
						>
							{card.label}
						</p>
						<p class="flex items-baseline gap-1">
							<span
								class="text-xl font-bold {card.tintClass ||
									card.accentClass}"
							>
								{card.value}
							</span>
							<span class="text-[0.7rem] text-base-content/60">
								{card.unit}
							</span>
						</p>
						{#if card.reference}
							<p class="text-[0.7rem] text-base-content/50">
								{card.reference}
							</p>
						{/if}
						<p
							class="truncate text-[0.7rem] text-base-content/60"
							title={card.latestLabel}
						>
							{card.latestLabel}
						</p>
					</article>
				{/each}
			</div>
		</section>

		<section aria-labelledby="visit-visual-trends-heading" class="space-y-3">
			<h2
				id="visit-visual-trends-heading"
				class="text-sm font-semibold tracking-wide text-base-content/60 uppercase"
			>
				{m.visit_visual_trends_section()}
			</h2>
			<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<div class="card border border-base-300 bg-base-100 p-4 shadow-sm">
					<LVitalTrendChart
						title={m.visit_visual_chart_bp()}
						seriesA={systolicSeries}
						seriesB={diastolicSeries}
						seriesALabel={m.visit_visual_legend_systolic()}
						seriesBLabel={m.visit_visual_legend_diastolic()}
						yUnit="mmHg"
						emptyMessage={m.visit_visual_no_trend()}
					/>
				</div>
				<div class="card border border-base-300 bg-base-100 p-4 shadow-sm">
					<LVitalTrendChart
						title={m.visit_visual_chart_heart_rate()}
						seriesA={pulseSeries}
						yUnit="bpm"
						emptyMessage={m.visit_visual_no_trend()}
					/>
				</div>
				<div class="card border border-base-300 bg-base-100 p-4 shadow-sm">
					<LVitalTrendChart
						title={m.visit_visual_chart_temperature()}
						seriesA={temperatureSeries}
						yUnit="°C"
						includeZero={false}
						emptyMessage={m.visit_visual_no_trend()}
					/>
				</div>
				<div class="card border border-base-300 bg-base-100 p-4 shadow-sm">
					<LVitalTrendChart
						title={m.visit_visual_chart_weight()}
						seriesA={weightSeries}
						yUnit="kg"
						includeZero={false}
						emptyMessage={m.visit_visual_no_trend()}
					/>
				</div>
				<div class="card border border-base-300 bg-base-100 p-4 shadow-sm">
					<LVitalTrendChart
						title={m.visit_visual_chart_spo2()}
						seriesA={spo2Series}
						yUnit="%"
						includeZero={false}
						emptyMessage={m.visit_visual_no_trend()}
					/>
				</div>
				<div class="card border border-base-300 bg-base-100 p-4 shadow-sm">
					<LVitalTrendChart
						title={m.visit_visual_chart_glucose()}
						seriesA={glucoseSeries}
						yUnit="mg/dL"
						emptyMessage={m.visit_visual_no_trend()}
					/>
				</div>
			</div>
		</section>

		<section aria-labelledby="visit-visual-history-heading" class="space-y-3">
			<h2
				id="visit-visual-history-heading"
				class="text-sm font-semibold tracking-wide text-base-content/60 uppercase"
			>
				{m.visit_visual_history_section()}
			</h2>
			<MenziesTable
				title={m.visit_visual_table_title()}
				rows={tableRows}
				columns={vitalTableColumns}
				{isLoading}
				bind:pageSize={pageSizeStr}
				bind:currentPage
				totalRowCount={tableTotal}
				showRefreshButton={true}
				emptyMessage={m.visit_visual_no_readings()}
				showRowActions={false}
				actionsVariant="none"
				enableColumnFilters={false}
				on:refresh={() => {
					refreshToken += 1;
				}}
			/>
		</section>
	{/if}
</div>
