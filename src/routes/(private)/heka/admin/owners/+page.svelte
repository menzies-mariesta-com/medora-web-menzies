<script lang="ts">
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiTable from '$lib/component/library/daisyui/table/DaisyUiTable.svelte';
	import DaisyUiTableHeader from '$lib/component/library/daisyui/table/head/DaisyUiTableHeader.svelte';
	import DaisyUiTableBody from '$lib/component/library/daisyui/table/body/DaisyUiTableBody.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import { getUsersByRole, deleteUser } from '$lib/remote/table/auth-table/user.remote';
	import { RoleEnum } from '$lib/model/enum/db-link';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { UserSchema } from '$lib/server/db/schema-type';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import NewOwnerModal from '$lib/component/snippet/modal/NewOwnerModal.svelte';
	import EditOwnerModal from '$lib/component/snippet/modal/EditOwnerModal.svelte';
	import { EditOwnerModalState } from '$lib/state/edit-owner-modal.state.svelte';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	let owners = $state<UserSchema[]>([]);
	let isLoading = $state(true);

	async function loadOwners() {
		isLoading = true;
		try {
			// Show only users with role_id = 2 (OWNER)
			owners = await getUsersByRole({ roleId: RoleEnum.OWNER });
		} finally {
			isLoading = false;
		}
	}

	async function openNewOwnerModal() {
		const result = await dialogService.open({
			title: 'New owner',
			component: NewOwnerModal
		});
		if (result.confirmed) await loadOwners();
	}

	async function openEditOwnerModal(owner: UserSchema) {
		EditOwnerModalState.owner = owner;
		const result = await dialogService.open({
			title: 'Edit owner',
			component: EditOwnerModal
		});
		if (result.confirmed) await loadOwners();
	}

	async function handleDelete(owner: UserSchema) {
		const result = await dialogService.open({
			title: 'Delete owner',
			message: `Delete "${owner.name ?? owner.email}"? This will remove their account and they will no longer be able to sign in.`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deleteUser({ id: owner.id });
			toastService.addToast('Owner deleted.', StatusColorEnum.SUCCESS);
			await loadOwners();
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Delete failed';
			toastService.addToast(msg, StatusColorEnum.ERROR);
		}
	}

	function formatDate(s: string | null | undefined): string {
		if (!s) return '—';
		try {
			return new Date(s).toLocaleDateString();
		} catch {
			return '—';
		}
	}

	lifeCycleUtil.onMount(() => {
		loadOwners();
	});
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">Owner management</h1>
		<DaisyUiButton className="d-btn-primary" onClick={openNewOwnerModal}>
			<LucidePlus />
			New owner
		</DaisyUiButton>
	</div>

	<DaisyUiCard>
		<DaisyUiCardBody>
			{#if isLoading}
				<DaisyUiLoading className="py-8" />
			{:else if owners.length === 0}
				<p class="text-base-content/70 py-8 text-center">
					No owners yet. Create one to allow them to access hospitals.
				</p>
			{:else}
				<DaisyUiTable>
					<DaisyUiTableHeader>
						<tr>
							<th>Name</th>
							<th>Email</th>
							<th>Created</th>
							<th class="text-right">Actions</th>
						</tr>
					</DaisyUiTableHeader>
					<DaisyUiTableBody>
						{#each owners as o (o.id)}
							<tr>
								<td>{o.name ?? '—'}</td>
								<td>{o.email ?? '—'}</td>
								<td>{formatDate(o.createdAt)}</td>
								<td class="text-right">
									<div class="flex justify-end gap-2">
										<DaisyUiButton
											className="d-btn-ghost d-btn-sm"
											onClick={() => openEditOwnerModal(o)}
										>
											<LucidePencil />
										</DaisyUiButton>
										<DaisyUiButton
											className="d-btn-ghost d-btn-error d-btn-sm"
											onClick={() => handleDelete(o)}
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
