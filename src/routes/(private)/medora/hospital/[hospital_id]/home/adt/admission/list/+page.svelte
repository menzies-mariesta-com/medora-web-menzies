<script lang="ts">
	import { page } from '$app/state';
	import LucideLogOut from '$lib/component/own/library/lucide/LucideLogOut.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import MenziesTableRowActionGroup from '$lib/component/own/library/menzies/table/MenziesTableRowActionGroup.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { DOCUMENT_PRINT_CODE } from '$lib/model/constant/document-print.constant';
	import {
		medoraHospitalPageUrl,
		WebRoutesEnum
	} from '$lib/model/enum/routes.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { IpdCensusRow } from '$lib/model/type/medora/ipd/ipd.type';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { printFromDocumentMaster } from '$lib/util/document-master-print.util.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const routerUtil = new RouterUtil();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/adt/admission`
			: ''
	);

	let rows = $state<IpdCensusRow[]>([]);
	let total = $state(0);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const columns: MenziesTableColumn<IpdCensusRow>[] = [
		{
			id: 'admissionNo',
			header: 'Admission No',
			widthClass: 'w-40 min-w-[9rem]',
			field: 'admissionNo',
			filterable: true
		},
		{
			id: 'visitNo',
			header: 'Visit No',
			widthClass: 'w-36 min-w-[8rem]',
			field: 'visitNo',
			filterable: true
		},
		{
			id: 'sourceOpdVisitNo',
			header: 'From OPD',
			widthClass: 'w-36 min-w-[8rem]',
			filterable: false,
			format: (_v, row) => row.sourceOpdVisitNo ?? '—'
		},
		{
			id: 'patientName',
			header: 'Patient',
			widthClass: 'w-48 min-w-[12rem]',
			field: 'patientName',
			filterable: true
		},
		{
			id: 'wardName',
			header: 'Ward',
			widthClass: 'w-36 min-w-[8rem]',
			field: 'wardName',
			filterable: true
		},
		{
			id: 'bedName',
			header: 'Bed',
			widthClass: 'w-28 min-w-[6rem]',
			field: 'bedName',
			filterable: false
		}
	];

	async function fetchRows() {
		if (!api) return;
		isLoading = true;
		try {
			const qs = new URLSearchParams({
				page: String(currentPage),
				pageSize: String(Number(pageSizeStr) || 10)
			});
			const searchBits = [
				tableFilters.admissionNo,
				tableFilters.visitNo,
				tableFilters.patientName,
				tableFilters.wardName
			]
				.map((s) => s?.trim())
				.filter(Boolean);
			if (searchBits.length)
				qs.set('search', searchBits.join(' '));
			const res = await fetch(`${api}?${qs}`, {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) throw new Error(await res.text());
			const result = (await res.json()) as {
				data: IpdCensusRow[];
				total: number;
			};
			rows = result.data ?? [];
			total = result.total ?? 0;
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Load failed',
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	}

	async function handleDischarge(row: IpdCensusRow) {
		if (!api) return;
		const result = await dialogService.open({
			title: 'Discharge patient',
			message: `Discharge ${row.patientName} (admission ${row.admissionNo ?? row.admissionId})?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					action: 'discharge',
					admissionId: row.admissionId
				})
			});
			if (!res.ok) throw new Error(await res.text());
			toastService.addToast('Discharged', StatusColorEnum.SUCCESS);
			fetchRows();
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Discharge failed',
				StatusColorEnum.ERROR
			);
		}
	}

	function goToNew() {
		if (!hospitalId) return;
		routerUtil.replaceRoute(
			medoraHospitalPageUrl(
				hospitalId,
				WebRoutesEnum.MEDORA_HOME_ADT_ADMISSION_NEW
			)
		);
	}

	function wristbandBarcodeValue(row: IpdCensusRow): string {
		const no = (row.admissionNo ?? '').trim();
		if (no && /^[\x20-\x7F]+$/.test(no)) return no;
		return `A-${row.admissionId}`;
	}

	async function printWristband(row: IpdCensusRow) {
		if (!hospitalId) return;
		const payload = wristbandBarcodeValue(row);
		const wardBed = [row.wardName, row.bedName].filter(Boolean).join(' / ');
		try {
			await printFromDocumentMaster({
				hospitalId,
				documentCode: DOCUMENT_PRINT_CODE.IPD_WRISTBAND,
				extraPlaceholders: {
					'{{patient.name}}': row.patientName,
					'{{patient.code}}': row.patientCode ?? '',
					'{{patient.dob}}': '',
					'{{visit.no}}': row.visitNo ?? '',
					'{{visit.date}}': row.admittedAt
						? new Date(row.admittedAt).toLocaleString()
						: '',
					'{{visit.department}}': wardBed,
					'{{doctor.name}}': row.admittingDoctorName ?? '',
					'{{document.number}}': row.admissionNo ?? `A-${row.admissionId}`,
					'{{hospital.logo}}': '',
					'{{print.label_patient}}': 'Patient',
					'{{print.label_dob}}': 'DOB',
					'{{print.label_patient_code}}': 'MRN',
					'{{print.label_visit_no}}': 'Visit'
				},
				iframeId: 'ipd-wristband-print-iframe',
				onIframeReady: async (doc) => {
					const svg = doc.getElementById('visit-label-barcode');
					if (!svg) return;
					const { default: JsBarcode } = await import('jsbarcode');
					try {
						JsBarcode(svg, payload, {
							format: 'CODE128',
							width: 1.25,
							height: 40,
							displayValue: true,
							fontSize: 9,
							margin: 2
						});
					} catch {
						JsBarcode(svg, `A-${row.admissionId}`, {
							format: 'CODE128',
							width: 1.25,
							height: 40,
							displayValue: true,
							fontSize: 9,
							margin: 2
						});
					}
				}
			});
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Wristband print failed',
				StatusColorEnum.ERROR
			);
		}
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
		title="Active Admissions"
		{rows}
		{columns}
		{isLoading}
		bind:pageSize={pageSizeStr}
		bind:currentPage
		totalRowCount={total}
		showRefreshButton={true}
		emptyMessage="No active admissions"
		showRowActions={true}
		actionsHeader="Actions"
		actionsVariant="none"
		enableColumnFilters={true}
		showAddButton={true}
		addLabel="New Admission"
		onAdd={goToNew}
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
		{#snippet rowActions(row)}
			<MenziesTableRowActionGroup>
				<MenziesTableIconAction
					tooltipText="Wristband"
					color="secondary"
					onClick={() => void printWristband(row)}
				>
					{#snippet icon()}
						<LucidePrinter className="size-3.5" />
					{/snippet}
				</MenziesTableIconAction>
				<MenziesTableIconAction
					tooltipText="Discharge"
					color="warning"
					onClick={() => handleDischarge(row)}
				>
					{#snippet icon()}
						<LucideLogOut className="size-3.5" />
					{/snippet}
				</MenziesTableIconAction>
			</MenziesTableRowActionGroup>
		{/snippet}
	</MenziesTable>
</div>
