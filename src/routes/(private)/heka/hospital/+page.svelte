<script lang="ts">
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiTable from '$lib/component/library/daisyui/table/DaisyUiTable.svelte';
	import DaisyUiTableHeader from '$lib/component/library/daisyui/table/head/DaisyUiTableHeader.svelte';
	import DaisyUiTableBody from '$lib/component/library/daisyui/table/body/DaisyUiTableBody.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import {
		getHospitalWithOwner,
		deleteHospital,
		type HospitalWithOwner
	} from '$lib/remote/table/information-table/hospital.remote';
	import { hekaHospitalHome } from '$lib/model/enum/routes.enum';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import NewHospitalModal from '$lib/component/snippet/modal/NewHospitalModal.svelte';
	import { HospitalModalState } from '$lib/state/hospital-modal.state.svelte';
	import { RoleEnum } from '$lib/model/enum/db-link';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import LucideUserCog from '$lib/component/library/lucide/LucideUserCog.svelte';

	let { data } = $props();
	const isStaff = $derived(data?.userRoleId === RoleEnum.STAFF);
	const isSystemAdmin = $derived(data?.userRoleId === RoleEnum.SYSTEM_ADMIN);
	const isOwner = $derived(data?.userRoleId === RoleEnum.OWNER);
	const canManageHospitals = $derived(!isStaff);

	const routerUtil = new RouterUtil();
	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	let hospitals = $state<HospitalWithOwner[]>([]);
	let isLoading = $state(true);

	async function loadHospitals(forceRefresh = false) {
		isLoading = true;
		try {
			const ownerId =
				isOwner && data?.user ? (data.user as { id?: string }).id : undefined;
			const params = ownerId != null ? { ownerId } : undefined;
			// After create/update/delete, invalidate cache then fetch so list updates
			if (forceRefresh) {
				await getHospitalWithOwner(params).refresh();
			}
			hospitals = await getHospitalWithOwner(params);
		} finally {
			isLoading = false;
		}
	}

	function goToHospitalHome(hospitalId: string) {
		routerUtil.goToRoute(hekaHospitalHome(hospitalId));
	}

	async function openEditHospitalModal(h: HospitalWithOwner) {
		HospitalModalState.hospitalId = h.id as string;
		HospitalModalState.currentUserRoleId = data?.userRoleId;
		HospitalModalState.currentUserId = data?.user ? (data.user as { id?: string }).id : undefined;
		const result = await dialogService.open({
			title: 'Edit hospital',
			component: NewHospitalModal
		});
		if (result.confirmed) {
			await loadHospitals(true);
		}
	}

	async function openNewHospitalModal() {
		HospitalModalState.hospitalId = null;
		HospitalModalState.currentUserRoleId = data?.userRoleId;
		HospitalModalState.currentUserId = data?.user ? (data.user as { id?: string }).id : undefined;
		const result = await dialogService.open({
			title: 'New hospital',
			component: NewHospitalModal
		});
		if (result.confirmed) {
			await loadHospitals(true);
		}
	}

	async function handleDelete(h: HospitalWithOwner) {
		const result = await dialogService.open({
			title: 'Delete hospital',
			message: `Delete "${h.name ?? h.code ?? 'Hospital'}"? This cannot be undone.`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deleteHospital({ id: h.id });
			toastService.addToast('Hospital deleted.', StatusColorEnum.SUCCESS);
			await loadHospitals(true);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Delete failed';
			toastService.addToast(msg, StatusColorEnum.ERROR);
		}
	}

	lifeCycleUtil.onMount(() => {
		loadHospitals();
	});
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">Choose a hospital</h1>
		<div class="flex flex-wrap items-center gap-2">
			{#if isSystemAdmin}
				<DaisyUiButton
					className="d-btn-outline"
					onClick={() => routerUtil.goToRoute(WebRoutesEnum.HEKA_ADMIN_OWNERS)}
				>
					<LucideUserCog />
					Manage owners
				</DaisyUiButton>
			{/if}
			{#if canManageHospitals}
				<DaisyUiButton
					className="d-btn-primary"
					onClick={openNewHospitalModal}
				>
					<LucidePlus />
					New hospital
				</DaisyUiButton>
			{/if}
		</div>
	</div>

	{#if isStaff && !(data?.allowedHospitalIds?.length)}
		<p class="text-base-content/70 py-8 text-center">
			No hospital assigned to your account. Contact your administrator.
		</p>
	{:else}
	<DaisyUiCard>
		<DaisyUiCardBody>
			{#if isLoading}
				<DaisyUiLoading className="py-8" />
			{:else if hospitals.length === 0}
				<p class="text-base-content/70 py-8 text-center">
					No hospitals yet. Create one to get started.
				</p>
			{:else}
				<DaisyUiTable>
					<DaisyUiTableHeader>
						<tr>
							<th>Name</th>
							<th>Code</th>
							<th>Owner</th>
							<th>Phone</th>
							<th>Email</th>
							<th>Address</th>
							<th class="text-right">Actions</th>
						</tr>
					</DaisyUiTableHeader>
					<DaisyUiTableBody>
						{#each hospitals as h (h.id)}
							<tr>
								<td>{h.name ?? '—'}</td>
								<td>{h.code ?? '—'}</td>
								<td>{h.owner?.name ?? h.owner?.email ?? '—'}</td>
								<td>{h.phone ?? '—'}</td>
								<td>{h.email ?? '—'}</td>
								<td class="max-w-[200px] truncate" title={h.address ?? undefined}>{h.address ?? '—'}</td>
								<td class="text-right">
									<div class="flex justify-end gap-2">
										<DaisyUiButton
											className="d-btn-primary d-btn-sm"
											onClick={() => goToHospitalHome(h.id)}
										>
											Enter
										</DaisyUiButton>
										{#if canManageHospitals}
											<DaisyUiButton
												className="d-btn-ghost d-btn-sm"
												onClick={() => openEditHospitalModal(h)}
											>
												<LucidePencil />
											</DaisyUiButton>
											<DaisyUiButton
												className="d-btn-ghost d-btn-error d-btn-sm"
												onClick={() => handleDelete(h)}
											>
												<LucideTrash2 />
											</DaisyUiButton>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</DaisyUiTableBody>
				</DaisyUiTable>
			{/if}
		</DaisyUiCardBody>
	</DaisyUiCard>
	{/if}
</div>
