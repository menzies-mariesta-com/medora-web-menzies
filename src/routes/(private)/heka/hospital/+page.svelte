<script lang="ts">
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
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
	import { m } from '$lib/paraglide/messages';
	import { TableEnum } from '$lib/model/enum/table.enum';

	const hospitalColumns: MariTableColumn<HospitalWithOwner>[] = [
		{ id: 'name', header: m.name(), widthClass: 'w-48 min-w-[10rem]', filterable: false, field: 'name', format: (v) => v ?? '—' },
		{ id: 'code', header: m.code(), widthClass: 'w-28 min-w-[6rem]', filterable: false, field: 'code', format: (v) => v ?? '—' },
		{ id: 'owner', header: m.owner(), widthClass: 'w-40 min-w-[10rem]', filterable: false, format: (_v, row) => row.owner?.name ?? row.owner?.email ?? '—' },
		{ id: 'phone', header: m.phone(), widthClass: 'w-36 min-w-[9rem]', filterable: false, field: 'phone', format: (v) => v ?? '—' },
		{ id: 'email', header: m.email(), widthClass: 'w-52 min-w-[12rem]', filterable: false, field: 'email', format: (v) => v ?? '—' },
		{ id: 'address', header: m.address(), widthClass: 'w-80 min-w-[16rem]', filterable: false, format: (_v, row) => row.address ?? '—', cellClass: 'max-w-[200px] truncate' }
	];

	let { data } = $props();
	const isStaff = $derived(data?.userRoleId === RoleEnum.STAFF);
	const isSystemAdmin = $derived(
		data?.userRoleId === RoleEnum.SYSTEM_ADMIN
	);
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
				isOwner && data?.user
					? (data.user as { id?: string }).id
					: undefined;
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
		HospitalModalState.currentUserId = data?.user
			? (data.user as { id?: string }).id
			: undefined;
		const result = await dialogService.open({
			title: m.edit_hospital(),
			component: NewHospitalModal
		});
		if (result.confirmed) {
			await loadHospitals(true);
		}
	}

	async function openNewHospitalModal() {
		HospitalModalState.hospitalId = null;
		HospitalModalState.currentUserRoleId = data?.userRoleId;
		HospitalModalState.currentUserId = data?.user
			? (data.user as { id?: string }).id
			: undefined;
		const result = await dialogService.open({
			title: m.new_hospital(),
			component: NewHospitalModal
		});
		if (result.confirmed) {
			await loadHospitals(true);
		}
	}

	async function handleDelete(h: HospitalWithOwner) {
		const result = await dialogService.open({
			title: m.delete_hospital(),
			message: `Delete "${h.name ?? h.code ?? m.hospitals()}"? This cannot be undone.`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deleteHospital({ id: h.id });
			toastService.addToast(
				m.hospital_deleted(),
				StatusColorEnum.SUCCESS
			);
			await loadHospitals(true);
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : m.delete_failed();
			toastService.addToast(msg, StatusColorEnum.ERROR);
		}
	}

	lifeCycleUtil.onMount(() => {
		loadHospitals();
	});
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">{m.choose_hospital()}</h1>
		<div class="flex flex-wrap items-center gap-2">
			{#if isSystemAdmin}
				<DaisyUiButton
					className="d-btn-outline"
					onClick={() =>
						routerUtil.goToRoute(WebRoutesEnum.HEKA_ADMIN_OWNERS)}
				>
					<LucideUserCog />
					{m.manage_owners()}
				</DaisyUiButton>
			{/if}
			{#if canManageHospitals}
				<DaisyUiButton
					className="d-btn-primary"
					onClick={openNewHospitalModal}
				>
					<LucidePlus />
					{m.new_hospital()}
				</DaisyUiButton>
			{/if}
		</div>
	</div>

	{#if isStaff && !data?.allowedHospitalIds?.length}
		<p class="py-8 text-center text-base-content/70">
			{m.no_hospital_assigned()}
		</p>
	{:else}
		<DaisyUiCard>
			<DaisyUiCardBody>
				{#if isLoading}
					<DaisyUiLoading className="py-8" />
				{:else if hospitals.length === 0}
					<p class="py-8 text-center text-base-content/70">
						{m.no_hospitals_yet()}
					</p>
				{:else}
					<div class="{TableEnum.HEIGHT}">
						<MariTable
							rows={hospitals}
							columns={hospitalColumns}
							isLoading={isLoading}
							showRefreshButton={true}
							refreshTooltip={m.refresh_data()}
							emptyMessage={m.no_hospitals_yet()}
							showRowActions={true}
							actionsHeader={m.actions()}
							actionsVariant="none"
							enableColumnFilters={false}
							on:refresh={() => loadHospitals(true)}
						>
						<svelte:fragment slot="rowActions" let:row>
							<div class="flex justify-end gap-2">
								<DaisyUiButton
									className="d-btn-primary d-btn-sm"
									onClick={() => goToHospitalHome(row.id)}
								>
									{m.enter()}
								</DaisyUiButton>
								{#if canManageHospitals}
									<DaisyUiButton
										className="d-btn-ghost d-btn-sm"
										onClick={() => openEditHospitalModal(row)}
									>
										<LucidePencil />
									</DaisyUiButton>
									<DaisyUiButton
										className="d-btn-ghost d-btn-error d-btn-sm"
										onClick={() => handleDelete(row)}
									>
										<LucideTrash2 />
									</DaisyUiButton>
								{/if}
							</div>
						</svelte:fragment>
					</MariTable>
					</div>
				{/if}
			</DaisyUiCardBody>
		</DaisyUiCard>
	{/if}
</div>
