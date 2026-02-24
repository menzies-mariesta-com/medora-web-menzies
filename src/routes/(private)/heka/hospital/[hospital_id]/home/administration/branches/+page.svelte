<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiTable from '$lib/component/library/daisyui/table/DaisyUiTable.svelte';
	import DaisyUiTableHeader from '$lib/component/library/daisyui/table/head/DaisyUiTableHeader.svelte';
	import DaisyUiTableBody from '$lib/component/library/daisyui/table/body/DaisyUiTableBody.svelte';
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

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' && page.params.hospital_id ? page.params.hospital_id : ''
	);

	let branches = $state<HospitalBranchSchema[]>([]);
	let isLoading = $state(true);

	async function fetchBranches(forceRefresh = false) {
		if (!hospitalId) return;
		isLoading = true;
		try {
			if (forceRefresh) await getBranchesByHospitalId({ hospitalId }).refresh();
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
			title: 'New branch',
			component: BranchFormModal
		});
		if (result.confirmed) fetchBranches(true);
	}

	async function openEdit(row: HospitalBranchSchema) {
		BranchModalState.hospitalId = hospitalId;
		BranchModalState.branchId = row.id;
		const result = await dialogService.open({
			title: 'Edit branch',
			component: BranchFormModal
		});
		if (result.confirmed) fetchBranches(true);
	}

	async function handleDelete(row: HospitalBranchSchema) {
		const result = await dialogService.open({
			title: 'Delete branch',
			message: `Delete "${row.name ?? row.code ?? 'this branch'}"? This cannot be undone.`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deleteBranch({ id: row.id });
			toastService.addToast('Branch deleted.', StatusColorEnum.SUCCESS);
			fetchBranches(true);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Delete failed';
			toastService.addToast(msg, StatusColorEnum.ERROR);
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">Branches</h1>
		<DaisyUiButton className="d-btn-primary" onClick={openCreate}>
			<LucidePlus />
			New branch
		</DaisyUiButton>
	</div>

	<DaisyUiCard>
		<DaisyUiCardBody>
			{#if isLoading}
				<DaisyUiLoading className="py-8" />
			{:else if branches.length === 0}
				<p class="text-base-content/70 py-8 text-center">
					No branches yet. Add a branch for this hospital.
				</p>
			{:else}
				<DaisyUiTable>
					<DaisyUiTableHeader>
						<tr>
							<th>Name</th>
							<th>Code</th>
							<th>Phone</th>
							<th>Email</th>
							<th>Address</th>
							<th class="text-right">Actions</th>
						</tr>
					</DaisyUiTableHeader>
					<DaisyUiTableBody>
						{#each branches as b (b.id)}
							<tr>
								<td>{b.name ?? '—'}</td>
								<td>{b.code ?? '—'}</td>
								<td>{b.phone ?? '—'}</td>
								<td>{b.email ?? '—'}</td>
								<td class="max-w-[200px] truncate" title={b.address ?? undefined}>{b.address ?? '—'}</td>
								<td class="text-right">
									<div class="flex justify-end gap-2">
										<DaisyUiButton
											className="d-btn-ghost d-btn-sm"
											onClick={() => openEdit(b)}
										>
											<LucidePencil />
										</DaisyUiButton>
										<DaisyUiButton
											className="d-btn-ghost d-btn-error d-btn-sm"
											onClick={() => handleDelete(b)}
										>
											<LucideTrash2 />
										</DaisyUiButton>
									</div>
								</td>
							</tr>
						{/each}
					</DaisyUiTableBody>
				</DaisyUiTable>
			{/if}
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>
