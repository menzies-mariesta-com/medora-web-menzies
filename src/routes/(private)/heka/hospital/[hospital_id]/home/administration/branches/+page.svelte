<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import type { HospitalBranchSchema } from '$lib/server/db/schema-type';
	import {
		getBranchesByHospitalId,
		deleteBranch
	} from '$lib/remote/table/information-table/hospital-branch.remote';
	import { BranchModalState } from '$lib/state/branch-modal.state.svelte';
	import BranchFormModal from '$lib/component/local/private/heka/administration/branches/BranchFormModal.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import { m } from '$lib/paraglide/messages';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);

	let branches = $state<HospitalBranchSchema[]>([]);
	let isLoading = $state(true);

	const branchColumns: MariTableColumn<HospitalBranchSchema>[] = [
		{
			id: 'name',
			header: m.name(),
			widthClass: 'w-64 min-w-[12rem]',
			filterable: false,
			field: 'name'
		},
		{
			id: 'code',
			header: m.code(),
			widthClass: 'w-32 min-w-[8rem]',
			filterable: false,
			field: 'code'
		},
		{
			id: 'phone',
			header: m.phone(),
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			field: 'phone'
		},
		{
			id: 'email',
			header: m.email(),
			widthClass: 'w-56 min-w-[14rem]',
			filterable: false,
			field: 'email'
		},
		{
			id: 'address',
			header: m.address(),
			widthClass: 'w-80 min-w-[16rem]',
			filterable: false,
			format: (_value, row) => row.address ?? '—',
			cellClass: 'max-w-[200px] truncate'
		}
	];

	async function fetchBranches(forceRefresh = false) {
		if (!hospitalId) return;
		isLoading = true;
		try {
			if (forceRefresh)
				await getBranchesByHospitalId({ hospitalId }).refresh();
			branches = await getBranchesByHospitalId({ hospitalId });
		} finally {
			isLoading = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		fetchBranches();
	});

	async function openCreate() {
		BranchModalState.hospitalId = hospitalId;
		BranchModalState.branchId = null;
		const result = await dialogService.open({
			title: m.new_branch(),
			component: BranchFormModal
		});
		if (result.confirmed) fetchBranches(true);
	}

	async function openEdit(row: HospitalBranchSchema) {
		BranchModalState.hospitalId = hospitalId;
		BranchModalState.branchId = row.id;
		const result = await dialogService.open({
			title: m.edit_branch(),
			component: BranchFormModal
		});
		if (result.confirmed) fetchBranches(true);
	}

	async function handleDelete(row: HospitalBranchSchema) {
		const result = await dialogService.open({
			title: m.delete_branch(),
			message: `Delete "${row.name ?? row.code ?? 'this branch'}"? This cannot be undone.`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deleteBranch({ id: row.id });
			toastService.addToast(
				m.branch_deleted(),
				StatusColorEnum.SUCCESS
			);
			fetchBranches(true);
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : m.delete_failed();
			toastService.addToast(msg, StatusColorEnum.ERROR);
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">{m.branches()}</h1>
		<DaisyUiButton className="d-btn-primary" onClick={openCreate}>
			<LucidePlus />
			{m.new_branch()}
		</DaisyUiButton>
	</div>

	<DaisyUiCard>
		<DaisyUiCardBody>
			{#if isLoading}
				<DaisyUiLoading className="py-8" />
			{:else if branches.length === 0}
				<p class="py-8 text-center text-base-content/70">
					{m.no_branches_yet()}
				</p>
			{:else}
				<div class="{TableEnum.HEIGHT}">
					<MariTable
						rows={branches}
						columns={branchColumns}
						isLoading={isLoading}
						showRefreshButton={true}
						refreshTooltip={m.refresh_data()}
						emptyMessage={m.no_branches_yet()}
						showRowActions={true}
						actionsHeader={m.actions()}
						actionsVariant="none"
						enableColumnFilters={false}
						on:refresh={() => fetchBranches(true)}
					>
					<svelte:fragment slot="rowActions" let:row>
						<td class="text-right">
							<div class="flex justify-end gap-2">
								<DaisyUiButton
									className="d-btn-ghost d-btn-sm"
									onClick={() => openEdit(row)}
								>
									<LucidePencil />
								</DaisyUiButton>
								<DaisyUiButton
									className="d-btn-ghost d-btn-error d-btn-sm"
									onClick={() => handleDelete(row)}
								>
									<LucideTrash2 />
								</DaisyUiButton>
							</div>
						</td>
					</svelte:fragment>
				</MariTable>
				</div>
			{/if}
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>
