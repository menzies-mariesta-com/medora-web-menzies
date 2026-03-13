<script lang="ts">
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import {
		getUsersByRole,
		deleteUser
	} from '$lib/remote/table/auth-table/user.remote';
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
	import { m } from '$lib/paraglide/messages';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	let owners = $state<UserSchema[]>([]);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(true);

	const ownerColumns: MariTableColumn<UserSchema>[] = [
		{
			id: 'name',
			header: m.name(),
			widthClass: 'w-64 min-w-[16rem]',
			field: 'name'
		},
		{
			id: 'email',
			header: m.email(),
			widthClass: 'w-72 min-w-[18rem]',
			field: 'email'
		},
		{
			id: 'createdAt',
			header: m.created(),
			widthClass: 'w-40 min-w-[10rem]',
			format: (value) =>
				formatDate(value as string | null | undefined)
		}
	];

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
			title: m.new_owner(),
			component: NewOwnerModal
		});
		if (result.confirmed) await loadOwners();
	}

	async function openEditOwnerModal(owner: UserSchema) {
		EditOwnerModalState.owner = owner;
		const result = await dialogService.open({
			title: m.edit_owner(),
			component: EditOwnerModal
		});
		if (result.confirmed) await loadOwners();
	}

	async function handleDelete(owner: UserSchema) {
		const result = await dialogService.open({
			title: m.delete_owner(),
			message: `Delete "${owner.name ?? owner.email}"? This will remove their account and they will no longer be able to sign in.`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deleteUser({ id: owner.id });
			toastService.addToast(
				m.owner_deleted(),
				StatusColorEnum.SUCCESS
			);
			await loadOwners();
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : m.delete_failed();
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
		<h1 class="text-2xl font-bold">{m.owner_management()}</h1>
		<DaisyUiButton
			className="d-btn-primary"
			onClick={openNewOwnerModal}
		>
			<LucidePlus />
			{m.new_owner()}
		</DaisyUiButton>
	</div>

	<DaisyUiCard>
		<DaisyUiCardBody>
			{#if isLoading}
				<DaisyUiLoading className="py-8" />
			{:else if owners.length === 0}
				<p class="py-8 text-center text-base-content/70">
					{m.no_owners_yet()}
				</p>
			{:else}
				<div class={TableEnum.HEIGHT}>
					<MariTable
						rows={owners}
						columns={ownerColumns}
						{isLoading}
						bind:pageSize={pageSizeStr}
						bind:currentPage
						showRefreshButton={false}
						emptyMessage={m.no_owners_yet()}
						showRowActions={true}
						actionsHeader={m.actions()}
						actionsVariant="none"
					>
						<svelte:fragment slot="rowActions" let:row>
							<td class="text-right">
								<div class="flex justify-end gap-2">
									<DaisyUiButton
										className="d-btn-ghost d-btn-sm"
										onClick={() => openEditOwnerModal(row)}
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
