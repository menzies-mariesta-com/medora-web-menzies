<script lang="ts">
	import { page } from '$app/state';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTable from '$lib/component/library/daisyui/table/DaisyUiTable.svelte';
	import DaisyUiTableHeader from '$lib/component/library/daisyui/table/head/DaisyUiTableHeader.svelte';
	import DaisyUiTableBody from '$lib/component/library/daisyui/table/body/DaisyUiTableBody.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiAlert from '$lib/component/library/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiDivider from '$lib/component/library/daisyui/divider/DaisyUiDivider.svelte';
	import DaisyUiCollapse from '$lib/component/library/daisyui/collapse/DaisyUiCollapse.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { VitalRecordDialogState } from '$lib/state/vital-record-dialog.state.svelte';
	import LVitalRecordDialogContent from '$lib/component/local/private/heka/emr/LVitalRecordDialogContent.svelte';
	import DaisyUiCollapseTitle from '$lib/component/library/daisyui/collapse/title/DaisyUiCollapseTitle.svelte';
	import DaisyUiCollapseContent from '$lib/component/library/daisyui/collapse/content/DaisyUiCollapseContent.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiPagination from '$lib/component/library/daisyui/pagination/DaisyUiPagination.svelte';
	import DaisyUiPaginationItem from '$lib/component/library/daisyui/pagination/item/DaisyUiPaginationItem.svelte';
	import LucideChevronLeft from '$lib/component/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/library/lucide/LucideChevronRight.svelte';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import { getPatientVisitById } from '$lib/remote/table/information-table/patient-visit.remote';
	import {
		getPatientVitalsByPatientId,
		deletePatientVital,
		type PatientVitalWithVisit
	} from '$lib/remote/table/information-table/patient-vital.remote';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import { vitalTextClass } from '$lib/config/vital.config';

	const visitIdStr = $derived(
		page.url.searchParams.get('visitId') ?? ''
	);
	const visitId = $derived(visitIdStr ? Number(visitIdStr) : 0);
	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: undefined
	);

	let visit = $state<{
		patientId: string;
		hospitalId: string;
	} | null>(null);
	let vitals = $state<PatientVitalWithVisit[]>([]);
	let isLoadingVisit = $state(false);
	let isLoadingVitals = $state(false);
	let vitalDisplayLimit = $state<'10' | '25' | 'all'>('25');
	let vitalPage = $state(1);
	const toastService = new ToastService();

	async function openRecordDialog() {
		if (!visit?.patientId || !visit?.hospitalId || !visitId) return;
		VitalRecordDialogState.patientId = visit.patientId;
		VitalRecordDialogState.hospitalId = visit.hospitalId;
		VitalRecordDialogState.visitId = visitId;
		VitalRecordDialogState.vitalId = null;
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title: 'Record new vitals',
				component: LVitalRecordDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					VitalRecordDialogState.patientId = null;
					VitalRecordDialogState.hospitalId = null;
					VitalRecordDialogState.visitId = null;
					VitalRecordDialogState.vitalId = null;
				}
			});
			if (
				result?.confirmed &&
				result.data?.saved &&
				visit?.patientId &&
				visit?.hospitalId
			) {
				await fetchVitals(visit.patientId, visit.hospitalId);
			}
		} finally {
			VitalRecordDialogState.patientId = null;
			VitalRecordDialogState.hospitalId = null;
			VitalRecordDialogState.visitId = null;
			VitalRecordDialogState.vitalId = null;
		}
	}

	async function openEditDialog(v: PatientVitalWithVisit) {
		if (!v.patientId || !v.hospitalId || !v.visitId) return;
		VitalRecordDialogState.patientId = v.patientId;
		VitalRecordDialogState.hospitalId = v.hospitalId;
		VitalRecordDialogState.visitId = v.visitId;
		VitalRecordDialogState.vitalId = v.id;
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title: 'Edit vitals',
				component: LVitalRecordDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					VitalRecordDialogState.vitalId = null;
				}
			});
			if (
				result?.confirmed &&
				result.data?.saved &&
				visit?.patientId &&
				visit?.hospitalId
			) {
				await fetchVitals(visit.patientId, visit.hospitalId);
			}
		} finally {
			VitalRecordDialogState.vitalId = null;
		}
	}

	async function handleDeleteVital(v: PatientVitalWithVisit) {
		const result = await dialogService.open({
			title: 'Delete vital',
			message: `Delete vital record from ${formatDateTime(getVitalDisplayDate(v) ?? null)}? This cannot be undone.`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deletePatientVital({ id: v.id });
			toastService.addToast(
				'Vital deleted.',
				StatusColorEnum.SUCCESS
			);
			if (visit?.patientId && visit?.hospitalId) {
				await fetchVitals(visit.patientId, visit.hospitalId);
			}
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: 'Delete failed') as string,
				StatusColorEnum.ERROR
			);
		}
	}

	async function fetchVisit() {
		if (!visitId || !hospitalId) return;
		isLoadingVisit = true;
		try {
			const v = await getPatientVisitById({ id: visitId });
			if (v) {
				visit = {
					patientId: v.patientId,
					hospitalId: v.hospitalId
				};
			} else {
				visit = null;
			}
		} finally {
			isLoadingVisit = false;
		}
	}

	async function fetchVitals(
		patientId: string,
		hospitalIdParam: string
	) {
		isLoadingVitals = true;
		try {
			vitals = await getPatientVitalsByPatientId({
				patientId,
				hospitalId: hospitalIdParam
			});
		} finally {
			isLoadingVitals = false;
		}
	}

	$effect(() => {
		const vid = visitId;
		if (vid) {
			fetchVisit().then(() => {
				if (visit?.patientId && visit?.hospitalId) {
					fetchVitals(visit.patientId, visit.hospitalId);
				}
			});
		} else {
			visit = null;
			vitals = [];
		}
	});

	function formatVital(value: string | null | undefined): string {
		if (value == null || value === '') return '–';
		return String(value);
	}

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return '–';
		try {
			return new Date(value).toLocaleString('en-US', {
				dateStyle: 'short',
				timeStyle: 'short'
			});
		} catch {
			return '–';
		}
	}

	/** Prefer vitalDateTime (when vital was taken) over createdAt (when record was saved). */
	function getVitalDisplayDate(
		v: PatientVitalWithVisit
	): string | null | undefined {
		return v.vitalDateTime ?? v.createdAt;
	}

	/** Group vitals by visit, sorted by most recent first. */
	type VitalGroup = {
		visitNo: string;
		vitals: PatientVitalWithVisit[];
	};
	const vitalGroups = $derived.by(() => {
		const limitN =
			vitalDisplayLimit === 'all'
				? Infinity
				: Number(vitalDisplayLimit);
		const groups = new Map<number, PatientVitalWithVisit[]>();
		for (const v of vitals) {
			const key = v.visitId;
			const arr = groups.get(key) ?? [];
			arr.push(v);
			groups.set(key, arr);
		}
		const result: VitalGroup[] = [];
		for (const [, arr] of groups) {
			arr.sort(
				(a, b) =>
					new Date(getVitalDisplayDate(b) ?? 0).getTime() -
					new Date(getVitalDisplayDate(a) ?? 0).getTime()
			);
			const visitNo = arr[0]?.visit?.visitNo?.trim() || '–';
			result.push({ visitNo, vitals: arr });
		}
		result.sort(
			(a, b) =>
				new Date(getVitalDisplayDate(b.vitals[0]!) ?? 0).getTime() -
				new Date(getVitalDisplayDate(a.vitals[0]!) ?? 0).getTime()
		);
		return result.slice(0, limitN);
	});

	const pageSize = 8;
	const totalGroupPages = $derived(
		Math.max(1, Math.ceil(vitalGroups.length / pageSize))
	);
	const effectivePage = $derived(
		Math.min(vitalPage, totalGroupPages) || 1
	);
	const paginatedGroups = $derived(
		vitalGroups.slice(
			(effectivePage - 1) * pageSize,
			effectivePage * pageSize
		)
	);
</script>

<svelte:head>
	<title>Vital</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-1">
		<p class="text-sm text-base-content/70">
			Record vital signs and view previous measurements.
		</p>
	</div>

	{#if !visitId}
		<DaisyUiAlert
			type={StatusColorEnum.INFO}
			message="Choose a visit using the "Choose Visit" button above to record vitals."
		/>
	{:else if isLoadingVisit}
		<div class="flex min-h-32 items-center justify-center">
			<DaisyUiLoading className="d-loading-lg" />
		</div>
	{:else if !visit}
		<DaisyUiAlert
			type={StatusColorEnum.WARNING}
			message="Visit not found."
		/>
	{:else}
		<DaisyUiCard>
			<DaisyUiCardBody>
				<div
					class="mb-5 flex flex-wrap items-center justify-between gap-3"
				>
					<DaisyUiCardBodyTitle className="mb-0">
						Patient vitals (all visits)
					</DaisyUiCardBodyTitle>
					<DaisyUiButton
						className="d-btn-primary d-btn-sm gap-1.5"
						onClick={openRecordDialog}
					>
						<LucidePlus className="size-4 shrink-0" />
						Record new vitals
					</DaisyUiButton>
				</div>
				{#if isLoadingVitals}
					<div class="flex min-h-32 items-center justify-center">
						<DaisyUiLoading className="d-loading-lg" />
					</div>
				{:else if vitals.length === 0}
					<p class="text-sm text-base-content/70">
						No vitals recorded for this patient yet.
					</p>
				{:else}
					<div class="flex flex-col gap-3">
						<div
							class="flex flex-wrap items-center justify-between gap-2"
						>
							<p class="text-sm text-base-content/70">
								{vitals.length} record(s) across {vitalGroups.length} visit(s)
							</p>
							<div class="flex flex-wrap items-center gap-2">
								<span class="text-sm">Show</span>
								<DaisyUiSelect
									className="d-select d-select-sm w-28"
									bind:value={vitalDisplayLimit}
									onChange={() => (vitalPage = 1)}
								>
									<option value="10">10 visits</option>
									<option value="25">25 visits</option>
									<option value="all">All</option>
								</DaisyUiSelect>
								{#if totalGroupPages > 1}
									<DaisyUiPagination>
										<DaisyUiPaginationItem
											className="d-btn-sm"
											onClick={() =>
												(vitalPage = Math.max(1, effectivePage - 1))}
											disabled={effectivePage <= 1}
										>
											<LucideChevronLeft className="size-5" />
										</DaisyUiPaginationItem>
										<span class="px-2 text-sm">
											{effectivePage} / {totalGroupPages}
										</span>
										<DaisyUiPaginationItem
											className="d-btn-sm"
											onClick={() =>
												(vitalPage = Math.min(
													totalGroupPages,
													effectivePage + 1
												))}
											disabled={effectivePage >= totalGroupPages}
										>
											<LucideChevronRight className="size-5" />
										</DaisyUiPaginationItem>
									</DaisyUiPagination>
								{/if}
							</div>
						</div>
						<div class="flex flex-col gap-2">
							{#each paginatedGroups as group, i (group.vitals[0]?.visitId ?? `group-${i}`)}
								<DaisyUiCollapse
									checked={i === 0 ? 'true' : 'false'}
									groupName="vitals-by-visit"
								>
									<DaisyUiCollapseTitle>
										Visit {group.visitNo}
										<span class="ml-2 font-normal opacity-70">
											· {group.vitals.length} record(s) · {formatDateTime(
												group.vitals[0]
													? (getVitalDisplayDate(group.vitals[0]) ??
															null)
													: null
											)}
										</span>
									</DaisyUiCollapseTitle>
									<DaisyUiCollapseContent>
										<div class="max-h-80 overflow-auto pt-2">
											<DaisyUiTable
												className="d-table d-table-zebra d-table-sm"
											>
												<DaisyUiTableHeader>
													<tr class="sticky top-0 z-3 bg-base-200">
														<th class="w-36 min-w-[9rem]">Date</th>
														<th class="w-20 min-w-[5rem]">Ht (cm)</th>
														<th class="w-20 min-w-[5rem]">Wt (kg)</th>
														<th class="w-24 min-w-[6rem]"
															>BP (mmHg)</th
														>
														<th class="w-20 min-w-[5rem]">P (bpm)</th>
														<th class="w-20 min-w-[5rem]">T (°C)</th>
														<th class="w-20 min-w-[5rem]">SpO₂ (%)</th
														>
														<th class="w-20 min-w-[5rem]">R (/min)</th
														>
														<th class="w-24 min-w-[6rem]"
															>RBS (mg/dL)</th
														>
														<th class="min-w-32">Symptom</th>
														<th class="w-24 shrink-0 text-right"
															>Actions</th
														>
													</tr>
												</DaisyUiTableHeader>
												<DaisyUiTableBody>
													{#each group.vitals as v (v.id)}
														<tr class="hover:bg-info/20">
															<td class="whitespace-nowrap">
																{formatDateTime(
																	getVitalDisplayDate(v) ?? null
																)}
															</td>
															<td>{formatVital(v.height)}</td>
															<td>{formatVital(v.weight)}</td>
															<td>
																<span
																	class={vitalTextClass(
																		v.bpSystolic,
																		'bpSystolic'
																	)}>{formatVital(v.bpSystolic)}</span
																>/<span
																	class={vitalTextClass(
																		v.bpDiastolic,
																		'bpDiastolic'
																	)}
																	>{formatVital(v.bpDiastolic)}</span
																>
															</td>
															<td
																><span
																	class={vitalTextClass(
																		v.pulse,
																		'pulse'
																	)}>{formatVital(v.pulse)}</span
																></td
															>
															<td
																><span
																	class={vitalTextClass(
																		v.temperature,
																		'temperature'
																	)}
																	>{formatVital(v.temperature)}</span
																></td
															>
															<td
																><span
																	class={vitalTextClass(
																		v.spO2,
																		'spO2'
																	)}>{formatVital(v.spO2)}</span
																></td
															>
															<td
																><span
																	class={vitalTextClass(
																		v.respiration,
																		'respiration'
																	)}
																	>{formatVital(v.respiration)}</span
																></td
															>
															<td
																><span
																	class={vitalTextClass(v.rbs, 'rbs')}
																	>{formatVital(v.rbs)}</span
																></td
															>
															<td
																class="max-w-48 truncate"
																title={v.symptom ?? undefined}
															>
																{formatVital(v.symptom)}
															</td>
															<td class="text-right">
																<div class="flex justify-end gap-1">
																	<DaisyUiButton
																		className="d-btn-ghost d-btn-sm"
																		onClick={() => openEditDialog(v)}
																	>
																		<LucidePencil
																			className="size-4"
																		/>
																	</DaisyUiButton>
																	<DaisyUiButton
																		className="d-btn-ghost d-btn-error d-btn-sm"
																		onClick={() =>
																			handleDeleteVital(v)}
																	>
																		<LucideTrash2
																			className="size-4"
																		/>
																	</DaisyUiButton>
																</div>
															</td>
														</tr>
													{/each}
												</DaisyUiTableBody>
											</DaisyUiTable>
										</div>
									</DaisyUiCollapseContent>
								</DaisyUiCollapse>
							{/each}
						</div>
					</div>
				{/if}
			</DaisyUiCardBody>
		</DaisyUiCard>
	{/if}
</div>
