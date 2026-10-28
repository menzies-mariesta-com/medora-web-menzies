<script lang="ts">
	import { page } from '$app/state';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideStethoscope from '$lib/component/own/library/lucide/LucideStethoscope.svelte';
	import LEdCreateEncounterDialogContent from '$lib/component/own/local/private/medora/emergency/LEdCreateEncounterDialogContent.svelte';
	import LEdRegistrationRowMenu from '$lib/component/own/local/private/medora/emergency/LEdRegistrationRowMenu.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import MenziesTableRowActionGroup from '$lib/component/own/library/menzies/table/MenziesTableRowActionGroup.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import {
		medoraHospitalPageUrl,
		WebRoutesEnum
	} from '$lib/model/enum/routes.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { EdRegistrationListRow } from '$lib/model/type/medora/ed-admission.type';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';
	import { EdBoardColumnEnum } from '$lib/model/enum/perioperative.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycleUtil = new LifeCycleUtil();
	const routerUtil = new RouterUtil();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/emergency/admission`
			: ''
	);

	let rows = $state<EdRegistrationListRow[]>([]);
	let total = $state(0);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	function boardColumnLabel(code: string): string {
		switch (code) {
			case EdBoardColumnEnum.WAITING_TRIAGE:
				return msg.ed_col_waiting_triage();
			case EdBoardColumnEnum.TRIAGE:
				return msg.ed_col_triage();
			case EdBoardColumnEnum.FAST_TRACK:
				return msg.ed_col_fast_track();
			case EdBoardColumnEnum.MAJORS:
				return msg.ed_col_majors();
			case EdBoardColumnEnum.RESUS:
				return msg.ed_col_resus();
			case EdBoardColumnEnum.AWAITING_ADMIT:
				return msg.ed_col_awaiting_admit();
			default:
				return code;
		}
	}

	function formatArrived(iso: string): string {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return iso;
		return d.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const columns: MenziesTableColumn<EdRegistrationListRow>[] = [
		{
			id: 'visitNo',
			header: msg.ed_admission_col_visit?.() ?? 'Visit No',
			widthClass: 'w-36 min-w-[8rem]',
			field: 'visitNo',
			filterable: true
		},
		{
			id: 'patientName',
			header: msg.ed_admission_col_patient?.() ?? 'Patient',
			widthClass: 'w-48 min-w-[12rem]',
			field: 'patientName',
			filterable: true
		},
		{
			id: 'boardColumn',
			header: msg.ed_admission_col_board?.() ?? 'Board',
			widthClass: 'w-40 min-w-[9rem]',
			filterable: false,
			format: (_v, row) => boardColumnLabel(row.boardColumn)
		},
		{
			id: 'edTriageLevel',
			header: msg.ed_admission_col_triage?.() ?? 'Triage',
			widthClass: 'w-28 min-w-[6rem]',
			filterable: false,
			format: (_v, row) =>
				row.edTriageLevel != null
					? `${row.edTriageLevel}${row.edTriageLevelName ? ` ${row.edTriageLevelName}` : ''}`
					: row.acuityLevel
						? String(row.acuityLevel)
						: '—'
		},
		{
			id: 'erBedLabel',
			header: msg.ed_admission_col_bed?.() ?? 'ED bed',
			widthClass: 'w-32 min-w-[7rem]',
			filterable: false,
			format: (_v, row) => row.erBedLabel ?? '—'
		},
		{
			id: 'isMlc',
			header: msg.ed_admission_col_mlc?.() ?? 'MLC',
			widthClass: 'w-16 min-w-[4rem]',
			filterable: false,
			format: (_v, row) => (row.isMlc ? 'Yes' : '—')
		},
		{
			id: 'chiefComplaint',
			header: msg.ed_admission_col_complaint?.() ?? 'Complaint',
			widthClass: 'w-48 min-w-[10rem]',
			field: 'chiefComplaint',
			filterable: true,
			format: (v) => (v ? String(v) : '—')
		},
		{
			id: 'arrivedAt',
			header: msg.ed_admission_col_arrived?.() ?? 'Arrived',
			widthClass: 'w-36 min-w-[8rem]',
			filterable: false,
			format: (_v, row) => formatArrived(row.arrivedAt)
		}
	];

	async function fetchRows() {
		if (!api) return;
		isLoading = true;
		try {
			const qs = new URLSearchParams({
				page: String(currentPage),
				pageSize: pageSizeStr
			});
			const search =
				tableFilters.visitNo?.trim() ||
				tableFilters.patientName?.trim() ||
				tableFilters.chiefComplaint?.trim();
			if (search) qs.set('search', search);
			const res = await fetch(`${api}?${qs}`, {
				credentials: 'include'
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			const result = (await res.json()) as PaginatedResult<
				EdRegistrationListRow
			>;
			rows = result.data ?? [];
			total = result.total ?? 0;
		} finally {
			isLoading = false;
		}
	}

	function openEmr(visitId: string) {
		if (!hospitalId) return;
		routerUtil.goToRoute(
			`${medoraHospitalPageUrl(
				hospitalId,
				WebRoutesEnum.MEDORA_HOME_CONSULTATION_EMR
			)}?visitId=${encodeURIComponent(visitId)}`
		);
	}

	async function openCreateEncounter(patientId?: string) {
		const result = await dialogService.open({
			title: msg.ed_reg_create_encounter_title?.() ?? 'Create encounter',
			component: LEdCreateEncounterDialogContent,
			props: {
				onCreated: () => fetchRows(),
				initialPatientId: patientId?.trim() ?? ''
			}
		});
		if (result.confirmed) await fetchRows();
	}

	lifeCycleUtil.onMount(() => {
		fetchRows();
	});

	lifeCycleUtil.onDestroy(() => {
		if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
	});
</script>

<div class={TableEnum.HEIGHT}>
	<MenziesTable
		title={msg.ed_admission_list_title?.() ?? 'ED registrations'}
		{rows}
		{columns}
		{isLoading}
		bind:pageSize={pageSizeStr}
		bind:currentPage
		totalRowCount={total}
		showRefreshButton={true}
		emptyMessage={msg.ed_admission_list_empty?.() ??
			'No active ED registrations'}
		showRowActions={true}
		actionsHeader={msg.ed_admission_actions?.() ?? 'Actions'}
		actionsVariant="none"
		enableColumnFilters={true}
		on:refresh={() => fetchRows()}
		on:pageSizeChange={() => {
			currentPage = 1;
			fetchRows();
		}}
		on:pageChange={() => fetchRows()}
		on:filtersChange={(event) => {
			if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
			tableFilters = event.detail.filters;
			currentPage = 1;
			filterDebounceTimeout = setTimeout(() => {
				fetchRows();
			}, 350);
		}}
	>
		{#snippet headerActions()}
			<WashButton
				type="button"
				className="btn btn-primary btn-sm cursor-pointer"
				onClick={() => void openCreateEncounter()}
			>
				<LucidePlus className="mr-1 size-4" aria-hidden="true" />
				{msg.ed_reg_create_encounter_btn?.() ?? 'Create encounter'}
			</WashButton>
		{/snippet}
		{#snippet rowActions(row)}
			<MenziesTableRowActionGroup>
				<LEdRegistrationRowMenu {row} onRefresh={() => fetchRows()} />
				<MenziesTableIconAction
					tooltipText={msg.ed_admission_action_emr?.() ?? 'Open EMR'}
					color="secondary"
					onClick={() => openEmr(row.visitId)}
				>
					{#snippet icon()}
						<LucideStethoscope className="size-3.5" />
					{/snippet}
				</MenziesTableIconAction>
				<MenziesTableIconAction
					tooltipText={msg.ed_reg_create_encounter_btn?.() ??
						'Create encounter'}
					color="primary"
					onClick={() => void openCreateEncounter(row.patientId)}
				>
					{#snippet icon()}
						<LucidePlus className="size-3.5" />
					{/snippet}
				</MenziesTableIconAction>
			</MenziesTableRowActionGroup>
		{/snippet}
	</MenziesTable>
</div>
