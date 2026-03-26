<script lang="ts">
	import { page } from '$app/state';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLoading from '$lib/component/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiAlert from '$lib/component/daisyui/alert/DaisyUiAlert.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { PatientAllergyDialogState } from '$lib/state/patient-allergy-dialog.state.svelte';
	import LPatientAllergyDialogContent from '$lib/component/own/local/private/heka/emr/LPatientAllergyDialogContent.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import { getPatientVisitById } from '$lib/tool/remote/table/information-table/patient-visit.http.tool.svelte';
	import {
		getPatientAllergiesByPatientIdWithRelations,
		getPatientAllergiesByPatientIdWithRelationsPaginated,
		deletePatientAllergies,
		type PatientAllergyWithRelations
	} from '$lib/tool/remote/table/information-table/patient-allergies.http.tool.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

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
	let patientAllergies = $state<PatientAllergyWithRelations[]>([]);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoadingVisit = $state(false);
	let isLoadingAllergies = $state(false);
	let totalAllergies = $state(0);
	let tableFilters = $state<Record<string, string>>({
		status: String(StatusEnum.ACTIVE)
	});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;
	let lastLoadedVisitKey = $state('');
	let lastHandledPageSize = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);
	let lastAllergiesFetchKey = $state('');
	let mounted = $state(false);
	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

	lifeCycleUtil.onMount(() => {
		mounted = true;
	});

	lifeCycleUtil.onDestroy(() => {
		mounted = false;
		if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
	});

	async function openAddDialog() {
		if (!visit?.patientId || !visitId) return;
		const patientId = visit.patientId;
		const hospitalIdParam = visit.hospitalId;
		PatientAllergyDialogState.patientId = patientId;
		PatientAllergyDialogState.visitId = visitId;
		PatientAllergyDialogState.patientAllergyId = null;
		PatientAllergyDialogState.onSaved = () =>
			fetchAllergies(patientId, hospitalIdParam, { force: true });
		try {
			await dialogService.open<{ saved?: boolean }>({
				title: 'Add allergy to patient',
				component: LPatientAllergyDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					PatientAllergyDialogState.patientId = null;
					PatientAllergyDialogState.visitId = null;
					PatientAllergyDialogState.patientAllergyId = null;
					PatientAllergyDialogState.onSaved = null;
				},
				onConfirm: (data) => {
					if (data?.saved) {
						fetchAllergies(patientId, hospitalIdParam, {
							force: true
						});
					}
				}
			});
		} finally {
			PatientAllergyDialogState.patientId = null;
			PatientAllergyDialogState.visitId = null;
			PatientAllergyDialogState.patientAllergyId = null;
			PatientAllergyDialogState.onSaved = null;
		}
	}

	async function openEditDialog(row: PatientAllergyWithRelations) {
		if (!visit?.patientId) return;
		const patientId = visit.patientId;
		const hospitalIdParam = visit.hospitalId;
		PatientAllergyDialogState.patientId = patientId;
		PatientAllergyDialogState.visitId = row.visitId;
		PatientAllergyDialogState.patientAllergyId = row.id;
		PatientAllergyDialogState.onSaved = () =>
			fetchAllergies(patientId, hospitalIdParam, { force: true });
		try {
			await dialogService.open<{ saved?: boolean }>({
				title: 'Edit patient allergy',
				component: LPatientAllergyDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					PatientAllergyDialogState.patientAllergyId = null;
					PatientAllergyDialogState.onSaved = null;
				},
				onConfirm: (data) => {
					if (data?.saved) {
						fetchAllergies(patientId, hospitalIdParam, {
							force: true
						});
					}
				}
			});
		} finally {
			PatientAllergyDialogState.patientAllergyId = null;
			PatientAllergyDialogState.onSaved = null;
		}
	}

	async function handleDelete(row: PatientAllergyWithRelations) {
		const result = await dialogService.open({
			title: 'Remove allergy',
			message: `Remove "${row.allergy?.name ?? 'this allergy'}" from patient? This cannot be undone.`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deletePatientAllergies({ id: row.id });
			toastService.addToast(
				'Allergy removed.',
				StatusColorEnum.SUCCESS
			);
			if (visit?.patientId && visit?.hospitalId) {
				await fetchAllergies(visit.patientId, visit.hospitalId, {
					force: true
				});
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

	async function fetchVisit(): Promise<{
		patientId: string;
		hospitalId: string;
	} | null> {
		if (!visitId || !hospitalId) return null;
		isLoadingVisit = true;
		try {
			const v = await getPatientVisitById({ id: visitId });
			if (v) {
				const nextVisit = {
					patientId: v.patientId,
					hospitalId: v.hospitalId
				};
				visit = nextVisit;
				return nextVisit;
			} else {
				visit = null;
				return null;
			}
		} catch {
			visit = null;
			return null;
		} finally {
			isLoadingVisit = false;
		}
	}

	async function fetchAllergies(
		patientId: string,
		hospitalIdParam: string | undefined,
		options?: { force?: boolean }
	) {
		console.log('FETCHING ALLERGY');
		const pageSize = Number(pageSizeStr) || 10;
		const requestKey = JSON.stringify({
			patientId,
			hospitalIdParam,
			page: currentPage,
			pageSize,
			visitNo: tableFilters.visitNo?.trim() || '',
			severity: tableFilters.severity?.trim() || '',
			status: tableFilters.status ?? ''
		});
		if (!options?.force && requestKey === lastAllergiesFetchKey) {
			return;
		}
		lastAllergiesFetchKey = requestKey;
		isLoadingAllergies = true;
		console.log('Refreshing');
		try {
			const statusId = tableFilters.status
				? Number(tableFilters.status)
				: undefined;
			const result =
				await getPatientAllergiesByPatientIdWithRelationsPaginated({
					patientId,
					hospitalId: hospitalIdParam,
					page: currentPage,
					pageSize,
					visitNo: tableFilters.visitNo?.trim() || undefined,
					severityName: tableFilters.severity?.trim() || undefined,
					statusId:
						statusId != null && Number.isFinite(statusId)
							? statusId
							: undefined
				});
			patientAllergies = result.data;
			totalAllergies = result.total;
		} catch {
			const data = await getPatientAllergiesByPatientIdWithRelations({
				patientId
			});
			patientAllergies = hospitalIdParam
				? data.filter(
						(row) => row.visit?.hospitalId === hospitalIdParam
					)
				: data;
			totalAllergies = patientAllergies.length;
		} finally {
			isLoadingAllergies = false;
		}
	}

	$effect(() => {
		if (!mounted) return;

		if (visitId && hospitalId) {
			const visitKey = `${visitId}:${hospitalId}`;
			if (lastLoadedVisitKey === visitKey) {
				return;
			}
			lastLoadedVisitKey = visitKey;
			(async () => {
				const resolvedVisit = await fetchVisit();
				if (resolvedVisit) {
					await fetchAllergies(
						resolvedVisit.patientId,
						resolvedVisit.hospitalId
					);
				}
			})();
		} else {
			lastLoadedVisitKey = '';
			visit = null;
			patientAllergies = [];
		}
	});

	function formatText(value: string | null | undefined): string {
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

	const statusFilterOptions = [
		{ label: 'Active', value: String(StatusEnum.ACTIVE) },
		{ label: 'Inactive', value: String(StatusEnum.INACTIVE) }
	];

	function getSeverityFilterOptions() {
		const names = Array.from(
			new Set(
				patientAllergies
					.map((row) => row.severity?.name)
					.filter((name): name is string => !!name)
			)
		);
		return names.map((name) => ({ label: name, value: name }));
	}

	const allergyColumns: MariTableColumn<PatientAllergyWithRelations>[] =
		[
			{
				id: 'visitNo',
				header: 'Visit No',
				widthClass: 'w-40',
				filterable: true,
				format: (_value, row) => row.visit?.visitNo?.trim() ?? '–'
			},
			{
				id: 'allergyName',
				header: 'Allergy',
				widthClass: 'min-w-[8rem]',
				filterable: false,
				format: (_value, row) => formatText(row.allergy?.name ?? null)
			},
			{
				id: 'status',
				header: 'Status',
				widthClass: 'w-28',
				filterable: true,
				filterType: 'select',
				filterOptions: statusFilterOptions,
				defaultFilterValue: String(StatusEnum.ACTIVE),
				format: (_value, row) =>
					row.statusId === StatusEnum.ACTIVE
						? 'Active'
						: row.statusId === StatusEnum.INACTIVE
							? 'Inactive'
							: `Status ${row.statusId ?? 'Unknown'}`
			},
			{
				id: 'severity',
				header: 'Severity',
				widthClass: 'w-30',
				filterable: true,
				filterType: 'select',
				filterOptionsGetter: getSeverityFilterOptions,
				format: (_value, row) =>
					formatText(row.severity?.name ?? null)
			},
			{
				id: 'reaction',
				header: 'Reaction',
				widthClass: 'min-w-32',
				filterable: false,
				format: (_value, row) => formatText(row.reaction),
				cellClass: 'max-w-48 truncate'
			},
			{
				id: 'remark',
				header: 'Remark',
				widthClass: 'min-w-32',
				filterable: false,
				format: (_value, row) => formatText(row.remark),
				cellClass: 'max-w-48 truncate'
			},
			{
				id: 'deactivationRemark',
				header: 'Deactivation remark',
				widthClass: 'min-w-32',
				filterable: false,
				format: (_value, row) => formatText(row.deactivationRemark),
				cellClass: 'max-w-48 truncate'
			},
			{
				id: 'createdAt',
				header: 'Created At',
				widthClass: 'w-36 min-w-[9rem]',
				filterable: false,
				format: (_value, row) => formatDateTime(row.createdAt ?? null)
			},
			{
				id: 'updatedAt',
				header: 'Updated At',
				widthClass: 'w-36 min-w-[9rem]',
				filterable: false,
				format: (_value, row) => formatDateTime(row.updatedAt ?? null)
			}
		];
</script>

<svelte:head>
	<title>Allergy</title>
</svelte:head>

<div class="flex flex-col gap-4">
	{#if !visitId}
		<DaisyUiAlert
			type={StatusColorEnum.INFO}
			message={'Choose a visit using the "Choose Visit" button above to add or view allergies.'}
			className="z-0"
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
			<DaisyUiCardBody className="p-3 m-0 ">
				<div
					class="mb-2 flex flex-wrap items-center justify-between gap-3"
				>
					<DaisyUiCardBodyTitle className="mb-0">
						Patient allergies (all visits)
					</DaisyUiCardBodyTitle>
					<DaisyUiButton
						className="d-btn-primary d-btn-sm gap-1.5"
						onClick={openAddDialog}
					>
						<LucidePlus className="size-4 shrink-0" />
						Add allergy
					</DaisyUiButton>
				</div>
				{#if isLoadingAllergies && patientAllergies.length === 0}
					<div class="flex min-h-32 items-center justify-center">
						<DaisyUiLoading className="d-loading-lg" />
					</div>
				{:else if patientAllergies.length === 0}
					<p class="text-sm text-base-content/70">
						No allergies recorded for this patient yet.
					</p>
				{:else}
					<div class="flex flex-col gap-3 {TableEnum.HEIGHT}">
						<MariTable
							rows={patientAllergies}
							columns={allergyColumns}
							isLoading={isLoadingAllergies}
							bind:pageSize={pageSizeStr}
							bind:currentPage
							totalRowCount={totalAllergies}
							showRefreshButton={true}
							emptyMessage="No allergies."
							showRowActions={true}
							actionsHeader="Actions"
							actionsVariant="none"
							enableColumnFilters={true}
							columnFilters={tableFilters}
							useRemoteFilters={true}
							on:refresh={() => {
								if (visit?.patientId && visit?.hospitalId) {
									fetchAllergies(visit.patientId, visit.hospitalId, {
										force: true
									});
								}
							}}
							on:pageSizeChange={() => {
								if (pageSizeStr === lastHandledPageSize) {
									return;
								}
								lastHandledPageSize = pageSizeStr;
								currentPage = 1;
								if (visit?.patientId && visit?.hospitalId) {
									fetchAllergies(visit.patientId, visit.hospitalId);
								}
							}}
							on:pageChange={() => {
								if (visit?.patientId && visit?.hospitalId) {
									fetchAllergies(visit.patientId, visit.hospitalId);
								}
							}}
							on:filtersChange={(event) => {
								if (filterDebounceTimeout) {
									clearTimeout(filterDebounceTimeout);
								}
								tableFilters = event.detail.filters;
								currentPage = 1;
								filterDebounceTimeout = setTimeout(() => {
									if (visit?.patientId && visit?.hospitalId) {
										fetchAllergies(visit.patientId, visit.hospitalId);
									}
								}, 350);
							}}
						>
							<svelte:fragment slot="rowActions" let:row>
								<td class="w-24 shrink-0 text-right">
									<div class="flex justify-end gap-1">
										<DaisyUiButton
											className="d-btn-ghost d-btn-sm"
											onClick={() =>
												openEditDialog(
													row as PatientAllergyWithRelations
												)}
										>
											<LucidePencil className="size-4" />
										</DaisyUiButton>
										<DaisyUiButton
											className="d-btn-ghost d-btn-error d-btn-sm"
											onClick={() =>
												handleDelete(
													row as PatientAllergyWithRelations
												)}
										>
											<LucideTrash2 className="size-4" />
										</DaisyUiButton>
									</div>
								</td>
							</svelte:fragment>
						</MariTable>
					</div>
				{/if}
			</DaisyUiCardBody>
		</DaisyUiCard>
	{/if}
</div>
