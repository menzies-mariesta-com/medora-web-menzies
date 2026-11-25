<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { parseUuid } from '$lib/util/id.util';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashTable from '$lib/component/wash/table/WashTable.svelte';
	import LucideChevronLeft from '$lib/component/own/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import LEmarDoseDialogContent, {
		type EmarDoseOutcome
	} from '$lib/component/own/local/private/medora/nursing-workbench/emar/LEmarDoseDialogContent.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { PageActionEnum } from '$lib/model/enum/page-action.enum';
	import type {
		EmarBedLocation,
		EmarMarPayload
	} from '$lib/model/type/medora/clinical-platform.type';
	import {
		buildMarGrid,
		infusionMarLines,
		isOnDemandLine,
		prnMarLines,
		scheduledMarLines,
		type MarCellState,
		type MarGrid,
		type MarLine
	} from '$lib/tool/nursing/emar-mar.util';
	import { buildMarPrintBody } from '$lib/tool/nursing/emar-mar-print.util';
	import { can } from '$lib/state/page-permission.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';
	import { formatMenziesTableDateTime } from '$lib/util/menzies-table-datetime.util';
	import { buildPrintDocumentHtml } from '$lib/util/print-document-html.util';
	import { printHtmlInIframe } from '$lib/util/document-master-print.util.svelte';

	const msg = m as Record<string, (inputs?: object) => string>;
	const toastService = new ToastService();

	const MS_PER_HOUR = 3_600_000;
	/** Half a shift either side of "now": the window a nurse actually works from. */
	const WINDOW_HOURS = 6;

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' && page.params.hospital_id
			? page.params.hospital_id
			: ''
	);
	const visitId = $derived(
		parseUuid(page.url.searchParams.get('visitId') ?? '') ?? ''
	);
	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/nursing-workbench/emar`
			: ''
	);

	/** Window anchor in ms; shifting it moves the whole grid without a reload. */
	let anchorMs = $state(roundToHour(Date.now()));
	let payload = $state<EmarMarPayload | null>(null);
	let isLoading = $state(false);
	let loadError = $state<string | null>(null);
	let isSubmitting = $state(false);
	/** Cell that opened the dialog, so focus returns there on close. */
	let lastCellKey = $state<string | null>(null);

	function roundToHour(ms: number): number {
		return Math.floor(ms / MS_PER_HOUR) * MS_PER_HOUR;
	}

	const windowFrom = $derived(new Date(anchorMs - WINDOW_HOURS * MS_PER_HOUR).toISOString());
	const windowTo = $derived(new Date(anchorMs + WINDOW_HOURS * MS_PER_HOUR).toISOString());

	const grid = $derived<MarGrid>(
		buildMarGrid({
			schedules: payload?.schedules ?? [],
			administrations: payload?.administrations ?? [],
			// Only on-demand lines: a scheduled line registered here would lose its
			// time cells and vanish from the grid.
			prnLines: (payload?.lines ?? []).filter(isOnDemandLine)
		})
	);
	const scheduled = $derived(scheduledMarLines(grid));
	const prn = $derived(prnMarLines(grid));
	const infusions = $derived(infusionMarLines(grid));
	const lateCount = $derived(
		scheduled.reduce(
			(total, line) =>
				total + line.cells.filter((cell) => cell?.state === 'late').length,
			0
		)
	);

	const bedLocation = $derived<EmarBedLocation | null>(payload?.bedLocation ?? null);
	const bedLabel = $derived(
		bedLocation
			? [bedLocation.wardName, bedLocation.roomName, bedLocation.bedName]
					.filter(Boolean)
					.join(' · ')
			: msg.emar_no_bed()
	);

	/** Dialog target: one due dose cell, a PRN line, or nothing. */
	type DoseTarget = {
		line: MarLine;
		scheduleId: number | null;
		scheduledAt: string | null;
		cellKey: string;
	};
	let target = $state<DoseTarget | null>(null);
	let scanPatient = $state('');
	let scanProduct = $state('');
	let scanNurse = $state('');

	let lastLoadedKey = '';

	function cellKey(cell: { scheduleId: number | null }, lineId: number): string {
		return `${lineId}:${cell.scheduleId ?? 'prn'}`;
	}

	function stateLabel(state: MarCellState): string {
		switch (state) {
			case 'given':
				return msg.emar_cell_given();
			case 'held':
				return msg.emar_cell_held();
			case 'refused':
				return msg.emar_cell_refused();
			case 'not_given':
				return msg.emar_cell_not_given();
			case 'late':
				return msg.emar_cell_late();
			default:
				return msg.emar_cell_pending();
		}
	}

	function stateClass(state: MarCellState): string {
		switch (state) {
			case 'given':
				return 'badge-success';
			case 'held':
			case 'refused':
			case 'not_given':
				return 'badge-warning';
			case 'late':
				return 'badge-error';
			default:
				return 'badge-ghost';
		}
	}

	async function loadMar(opts?: {
		signal?: AbortSignal;
		isCancelled?: () => boolean;
	}): Promise<void> {
		if (!apiBase || !visitId) return;
		isLoading = true;
		loadError = null;
		try {
			const qs = new URLSearchParams({
				mode: 'mar',
				visitId,
				from: windowFrom,
				to: windowTo
			});
			const res = await fetch(`${apiBase}?${qs}`, { signal: opts?.signal });
			if (opts?.isCancelled?.()) return;
			if (!res.ok) {
				loadError = await res.text().catch(() => '') || msg.emar_failed();
				return;
			}
			payload = (await res.json()) as EmarMarPayload;
			// Assign after success so an aborted read can retry the same window.
			lastLoadedKey = `${visitId}:${windowFrom}:${windowTo}`;
		} catch (err) {
			if (opts?.isCancelled?.()) return;
			loadError = err instanceof Error ? err.message : msg.emar_failed();
		} finally {
			if (!opts?.isCancelled?.()) isLoading = false;
		}
	}

	$effect(() => {
		const key = `${visitId}:${windowFrom}:${windowTo}`;
		if (!visitId || key === untrack(() => lastLoadedKey)) return;
		let cancelled = false;
		const ac = new AbortController();
		void loadMar({ signal: ac.signal, isCancelled: () => cancelled });
		return () => {
			cancelled = true;
			ac.abort();
		};
	});

	/** A visit switch must not leave the previous patient's rows on screen. */
	$effect(() => {
		void visitId;
		untrack(() => {
			payload = null;
			loadError = null;
			target = null;
			// Drop the de-dupe key too: returning to a visit must reload it.
			lastLoadedKey = '';
		});
	});

	function shiftWindow(hours: number) {
		anchorMs = anchorMs + hours * MS_PER_HOUR;
	}

	function openTarget(line: MarLine, scheduleId: number | null, scheduledAt: string | null) {
		target = {
			line,
			scheduleId,
			scheduledAt,
			cellKey: cellKey({ scheduleId }, line.lineId)
		};
		lastCellKey = target.cellKey;
		scanPatient = '';
		scanProduct = '';
		scanNurse = '';
	}

	function closeTarget() {
		target = null;
		const key = lastCellKey;
		lastCellKey = null;
		if (!key) return;
		// Return focus to the cell that opened the dialog.
		requestAnimationFrame(() => {
			document
				.querySelector<HTMLButtonElement>(`[data-emar-cell="${CSS.escape(key)}"]`)
				?.focus();
		});
	}

	async function submitDose(outcome: EmarDoseOutcome) {
		if (!target || !visitId || !apiBase) return;
		isSubmitting = true;
		try {
			const res = await fetch(apiBase, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode: 'administration.record',
					visitId,
					scheduleId: target.scheduleId,
					lineId: target.line.lineId,
					status: outcome.status,
					scannedPatientToken: scanPatient.trim(),
					scannedProductBarcode: scanProduct.trim(),
					scannedNurseCode: scanNurse.trim(),
					lateReason:
						outcome.status === 'given' ? undefined : outcome.reasonCode
				})
			});
			if (!res.ok) throw new Error(await res.text().catch(() => ''));
			toastSuccess(toastService, msg.emar_saved());
			closeTarget();
			await loadMar();
		} catch (err) {
			toastService.addErrorToast(
				msg.emar_failed(),
				err instanceof Error ? err : undefined
			);
		} finally {
			isSubmitting = false;
		}
	}

	async function submitInfusion(line: MarLine, kind: 'start' | 'stop') {
		if (!visitId || !apiBase) return;
		isSubmitting = true;
		try {
			const res = await fetch(apiBase, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode: 'infusion.event',
					visitId,
					lineId: line.lineId,
					kind
				})
			});
			if (!res.ok) throw new Error(await res.text().catch(() => ''));
			toastSuccess(toastService, msg.emar_saved());
			await loadMar();
		} catch (err) {
			toastService.addErrorToast(
				msg.emar_failed(),
				err instanceof Error ? err : undefined
			);
		} finally {
			isSubmitting = false;
		}
	}

	let isPrinting = $state(false);

	async function printMar() {
		if (isPrinting || !payload) return;
		isPrinting = true;
		try {
			const html = buildPrintDocumentHtml({
				documentHtml: buildMarPrintBody({
					grid,
					patient: payload.patient,
					bedLocation
				}),
				documentTitle: msg.emar_print_title(),
				headerHtml: '',
				footerHtml: '',
				setting: {
					pageSize: 'A4',
					pageOrientation: 'landscape',
					marginTop: 12,
					marginBottom: 12,
					marginLeft: 10,
					marginRight: 10,
					paddingTop: 4,
					paddingBottom: 4,
					paddingLeft: 4,
					paddingRight: 4,
					showHeader: false,
					showFooter: false
				},
				variant: 'browser'
			});
			await printHtmlInIframe(html, { iframeId: 'emar-mar-print-iframe' });
		} catch (err) {
			toastService.addErrorToast(msg.emar_failed(), err instanceof Error ? err : undefined);
		} finally {
			isPrinting = false;
		}
	}

	const canChart = $derived(can(PageActionEnum.CREATE));
	const canPrint = $derived(can(PageActionEnum.PRINT));
</script>

<svelte:head>
	<title>{msg.emar_title()}</title>
</svelte:head>

<div class="flex flex-col gap-4 p-2">
	{#if !visitId}
		<WashAlert type={StatusColorEnum.INFO} message={msg.emar_choose_visit()} />
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-primary text-xl font-bold">{msg.emar_title()}</h1>
				{#if payload}
					<p class="text-sm">
						<strong>{payload.patient.name}</strong>
						<span class="opacity-60"> · {payload.patient.code ?? '—'} · {payload.patient.visitNo ?? '—'}</span>
					</p>
					<p class="text-sm opacity-70">{msg.emar_bed_location()}: {bedLabel}</p>
				{/if}
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<WashButton
					variant="ghost"
					size="sm"
					aria-label={msg.emar_shift_previous()}
					title={msg.emar_shift_previous()}
					onClick={() => shiftWindow(-WINDOW_HOURS)}
				>
					<LucideChevronLeft />
				</WashButton>
				<span class="text-sm tabular-nums">
					{formatMenziesTableDateTime(windowFrom, '—')} – {formatMenziesTableDateTime(windowTo, '—')}
				</span>
				<WashButton
					variant="ghost"
					size="sm"
					aria-label={msg.emar_shift_next()}
					title={msg.emar_shift_next()}
					onClick={() => shiftWindow(WINDOW_HOURS)}
				>
					<LucideChevronRight />
				</WashButton>
				<span class="badge {lateCount > 0 ? 'badge-error' : 'badge-ghost'} badge-sm">
					{lateCount > 0 ? msg.emar_late_count({ count: String(lateCount) }) : msg.emar_late_none()}
				</span>
				{#if canPrint}
					<WashButton
						variant="secondary"
						size="sm"
						loading={isPrinting}
						onClick={() => void printMar()}
					>
						<LucidePrinter />
						{msg.emar_print()}
					</WashButton>
				{/if}
			</div>
		</div>

		{#if loadError}
			<WashAlert type={StatusColorEnum.ERROR} message={msg.emar_failed()} detail={loadError} />
		{:else if !payload && isLoading}
			<WashAlert type={StatusColorEnum.INFO} message={msg.emar_loading()} />
		{:else if payload}
			<WashCard>
				<WashCardBody className="gap-3">
					<h2 class="text-base font-semibold">{msg.emar_col_medication()}</h2>
					{#if scheduled.length === 0}
						<p class="text-sm opacity-70">{msg.emar_no_orders()}</p>
					{:else}
						<div class="overflow-auto">
							<WashTable className="table-sm">
								<thead>
									<tr>
										<th scope="col">{msg.emar_col_medication()}</th>
										{#each grid.columns as column (column.at)}
											<th scope="col" class="text-center tabular-nums">{column.label}</th>
										{/each}
									</tr>
								</thead>
								<tbody>
									{#each scheduled as line (line.lineId)}
										<tr>
											<th scope="row" class="text-left">
												<div class="font-medium">
													{line.itemName}
													{#if line.isStat}
														<span class="badge badge-error badge-xs ml-1">{msg.emar_dose_stat()}</span>
													{/if}
												</div>
												<div class="text-xs opacity-70">
													{line.doseText}
													{#if line.routeName} · {line.routeName}{/if}
												</div>
												{#if line.instructions}
													<div class="text-xs opacity-60">{line.instructions}</div>
												{/if}
											</th>
											{#each line.cells as cell, index (index)}
												<td class="text-center">
													{#if cell}
														{@const key = cellKey(cell, line.lineId)}
														{@const state = cell.state}
														<button
															type="button"
															class="badge {stateClass(state)} badge-lg cursor-pointer"
															data-emar-cell={key}
															disabled={!canChart || isSubmitting}
															aria-label={msg.emar_cell_action({
																drug: line.itemName,
																time: grid.columns[index]?.label ?? '',
																state: stateLabel(state)
															})}
															onclick={() => openTarget(line, cell.scheduleId, cell.scheduledAt)}
														>
															{stateLabel(state)}
														</button>
													{:else}
														<span aria-hidden="true">—</span>
													{/if}
												</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</WashTable>
						</div>
					{/if}
				</WashCardBody>
			</WashCard>

			<WashCard>
				<WashCardBody className="gap-3">
					<h2 class="text-base font-semibold">{msg.emar_prn_title()}</h2>
					{#if prn.length === 0}
						<p class="text-sm opacity-70">{msg.emar_no_prn()}</p>
					{:else}
						<ul class="flex flex-col gap-2">
							{#each prn as line (line.lineId)}
								<li class="flex flex-wrap items-center justify-between gap-2 rounded-box border border-base-300 p-2">
									<div>
										<div class="font-medium">{line.itemName} · {line.doseText}</div>
										<div class="text-xs opacity-70">
											{msg.emar_prn_last_given()}: {line.lastGivenAt ? formatMenziesTableDateTime(line.lastGivenAt, '—') : msg.emar_prn_not_given()}
											· {msg.emar_prn_next_allowed()}:
											{line.prnNextAllowedAt ? formatMenziesTableDateTime(line.prnNextAllowedAt, '—') : msg.emar_prn_available()}
										</div>
									</div>
									<WashButton
										size="sm"
										variant="primary"
										disabled={!canChart || isSubmitting || line.prnNextAllowedAt != null}
										onClick={() => openTarget(line, null, null)}
									>
										{msg.clinical_administer_med()}
									</WashButton>
								</li>
							{/each}
						</ul>
					{/if}
				</WashCardBody>
			</WashCard>

			<WashCard>
				<WashCardBody className="gap-3">
					<h2 class="text-base font-semibold">{msg.emar_infusion_title()}</h2>
					{#if infusions.length === 0}
						<p class="text-sm opacity-70">{msg.emar_no_infusion()}</p>
					{:else}
						<ul class="flex flex-col gap-2">
							{#each infusions as line (line.lineId)}
								<li class="flex flex-wrap items-center justify-between gap-2 rounded-box border border-base-300 p-2">
									<div>
										<div class="font-medium">{line.itemName}</div>
										<div class="text-xs opacity-70">
											{msg.emar_infusion_rate()}: {line.rateMlHr ?? '—'}
											· {line.infusionRunning ? msg.emar_infusion_running() : msg.emar_infusion_stopped()}
										</div>
									</div>
									<WashButton
										size="sm"
										variant={line.infusionRunning ? 'warning' : 'success'}
										disabled={!canChart || isSubmitting}
										onClick={() => void submitInfusion(line, line.infusionRunning ? 'stop' : 'start')}
									>
										{line.infusionRunning ? msg.emar_infusion_stop() : msg.emar_infusion_start()}
									</WashButton>
								</li>
							{/each}
						</ul>
					{/if}
				</WashCardBody>
			</WashCard>
		{/if}
	{/if}
</div>

<LEmarDoseDialogContent
	open={target != null}
	line={target?.line ?? {
		itemName: '',
		doseText: '',
		routeName: null,
		isStat: false
	}}
	bedLocation={bedLocation}
	patientLabel={payload?.patient.name ?? ''}
	visitNo={payload?.patient.visitNo ?? null}
	scheduledAt={target?.scheduledAt ?? null}
	bind:patientToken={scanPatient}
	bind:productBarcode={scanProduct}
	bind:nurseCode={scanNurse}
	isSubmitting={isSubmitting}
	onClose={closeTarget}
	onSubmit={(outcome) => void submitDose(outcome)}
/>
