<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import DaisyUiCheckbox from '$lib/component/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import { StoreModalState } from '$lib/state/store-modal.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import type {
		StaffRegHospitalBranchRow,
		StaffRegUserGroupRow
	} from '$lib/model/type/heka/staff-reg-ui.type';
	import { m } from '$lib/paraglide/messages';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

	let branchRows = $state<StaffRegHospitalBranchRow[]>([]);
	let userGroups = $state<StaffRegUserGroupRow[]>([]);

	let branchId = $state('');
	let storeName = $state('');
	let remark = $state('');
	let selectedUserGroupIds = $state<number[]>([]);
	let userGroupFilter = $state('');
	let formActive = $state(true);
	let isSubmitting = $state(false);
	let isLoading = $state(true);
	let isPurchaseRequisitable = $state(false);

	const normalizedUserGroupFilter = $derived(userGroupFilter.trim().toLowerCase());
	const filteredUserGroups = $derived(
		normalizedUserGroupFilter
			? userGroups.filter((g) =>
					(g.name ?? String(g.id))
						.trim()
						.toLowerCase()
						.includes(normalizedUserGroupFilter)
				)
			: userGroups
	);

	const modalState = $derived(StoreModalState);
	const hospitalId = $derived(modalState.hospitalId ?? '');
	const isEdit = $derived(
		modalState.mode === 'edit' && modalState.editStore != null
	);

	type StoreLookups = {
		userGroups: StaffRegUserGroupRow[];
		statuses: unknown[];
	};

	type StoreDetail = {
		id: number;
		branchId: string;
		storeName: string | null;
		remark: string | null;
		statusId: number;
		isPurchaseRequisitable?: boolean;
		userGroups?: { id: number; name: string | null }[];
	};

	async function fetchBranchesAll(hid: string) {
		const res = await fetch(
			`/api/heka/hospital/${hid}/home/administration/branches?mode=all`,
			{ method: 'GET' }
		);
		if (!res.ok) {
			throw new Error(`Failed to load branches (${res.status})`);
		}
		return (await res.json()) as StaffRegHospitalBranchRow[];
	}

	async function fetchStoreLookups(hid: string): Promise<StoreLookups> {
		const res = await fetch(
			`/api/heka/hospital/${hid}/home/inventory-setup/stores?mode=lookups`,
			{ method: 'GET' }
		);
		if (!res.ok) {
			throw new Error(`Failed to load lookups (${res.status})`);
		}
		return (await res.json()) as StoreLookups;
	}

	async function fetchStoreById(
		hid: string,
		id: number
	): Promise<StoreDetail | null> {
		const res = await fetch(
			`/api/heka/hospital/${hid}/home/inventory-setup/stores?id=${encodeURIComponent(String(id))}`,
			{ method: 'GET' }
		);
		if (!res.ok) {
			throw new Error(`Failed to load store (${res.status})`);
		}
		return (await res.json()) as StoreDetail | null;
	}

	function toggleUserGroup(id: number) {
		const idx = selectedUserGroupIds.indexOf(id);
		if (idx === -1) {
			selectedUserGroupIds = [...selectedUserGroupIds, id];
		} else {
			selectedUserGroupIds = selectedUserGroupIds.filter((v) => v !== id);
		}
	}

	lifeCycleUtil.onMount(async () => {
		if (!hospitalId) {
			isLoading = false;
			return;
		}
		const editing =
			StoreModalState.mode === 'edit' && StoreModalState.editStore != null;
		try {
			const [branches, lookups] = await Promise.all([
				fetchBranchesAll(hospitalId),
				fetchStoreLookups(hospitalId)
			]);
			branchRows = branches;
			userGroups = lookups.userGroups ?? [];

			if (editing && StoreModalState.editStore) {
				const s = await fetchStoreById(
					hospitalId,
					StoreModalState.editStore.id
				);
				if (s) {
					branchId = s.branchId;
					storeName = s.storeName ?? '';
					remark = s.remark ?? '';
					isPurchaseRequisitable = s.isPurchaseRequisitable === true;
					formActive =
						(s.statusId ?? StatusEnum.ACTIVE) === StatusEnum.ACTIVE;
					selectedUserGroupIds = (s.userGroups ?? []).map((g) => g.id);
				}
			} else {
				isPurchaseRequisitable = false;
				if (branches.length > 0) {
					branchId = branches[0].id;
				}
			}
		} finally {
			isLoading = false;
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (isSubmitting || isLoading) return;
		if (!storeName?.trim()) {
			toastService.addToast(m.name_required(), StatusColorEnum.ERROR);
			return;
		}
		if (!branchId) {
			toastService.addToast(m.select_branch(), StatusColorEnum.ERROR);
			return;
		}

		const statusId = formActive ? StatusEnum.ACTIVE : StatusEnum.INACTIVE;

		isSubmitting = true;
		try {
			const payload = {
				branchId,
				storeName: storeName.trim(),
				remark: remark.trim() || null,
				isPurchaseRequisitable,
				userGroupIds: selectedUserGroupIds,
				statusId
			};
			if (modalState.mode === 'create') {
				const res = await fetch(
					`/api/heka/hospital/${hospitalId}/home/inventory-setup/stores`,
					{
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify(payload)
					}
				);
				if (!res.ok) {
					throw new Error(`Create failed (${res.status})`);
				}
				toastService.addToast(
					m.store_created(),
					StatusColorEnum.SUCCESS
				);
			} else if (modalState.editStore) {
				const res = await fetch(
					`/api/heka/hospital/${hospitalId}/home/inventory-setup/stores`,
					{
						method: 'PUT',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({
							id: modalState.editStore.id,
							...payload
						})
					}
				);
				if (!res.ok) {
					throw new Error(`Update failed (${res.status})`);
				}
				toastService.addToast(
					m.store_updated(),
					StatusColorEnum.SUCCESS
				);
			}
			confirm();
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : m.delete_failed();
			toastService.addToast(msg, StatusColorEnum.ERROR);
		} finally {
			isSubmitting = false;
		}
	}
</script>

{#if isLoading}
	<p class="text-sm opacity-70">{m.loading()}</p>
{:else}
	<form onsubmit={handleSubmit} class="flex flex-col gap-4">
		<div class="flex flex-col gap-4">
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel
					forText="store-branch"
					className="shrink-0 sm:w-40"
					>{m.select_branch()}
					<span class="text-error">*</span></DaisyUiLabel
				>
				<div class="max-w-md flex-1">
					<DaisyUiSelect
						id="store-branch"
						bind:value={branchId}
						optionHeader=""
					>
						{#each branchRows as b (b.id)}
							<option value={b.id}>{b.name ?? b.code ?? b.id}</option>
						{/each}
					</DaisyUiSelect>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel
					forText="store-name"
					className="shrink-0 sm:w-40"
					>{m.store_name()}
					<span class="text-error">*</span></DaisyUiLabel
				>
				<div class="max-w-md flex-1">
					<DaisyUiInputField
						id="store-name"
						bind:value={storeName}
						inputType="text"
						inputPlaceholderText={m.store_name()}
						required
					/>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
			>
				<DaisyUiLabel className="shrink-0 pt-2 sm:w-40"
					>{m.remark()}</DaisyUiLabel
				>
				<div class="max-w-md flex-1">
					<DaisyUiTextarea bind:value={remark} />
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel className="shrink-0 sm:w-40"
					>{m.inv_store_purchase_requisitable()}</DaisyUiLabel
				>
				<div class="max-w-md flex-1">
					<label class="flex cursor-pointer items-center gap-2">
						<input
							type="checkbox"
							class="d-checkbox d-checkbox-sm"
							bind:checked={isPurchaseRequisitable}
						/>
						<span class="text-sm opacity-80">{m.active_label()}</span>
					</label>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
			>
				<DaisyUiLabel className="shrink-0 pt-2 sm:w-40"
					>{m.user_groups()}</DaisyUiLabel
				>
				<div class="flex max-w-md flex-1 flex-col gap-2">
					{#if userGroups.length === 0}
						<p class="text-xs opacity-70">{m.no_user_groups()}</p>
					{:else}
						<DaisyUiInputField
							id="store-user-group-filter"
							bind:value={userGroupFilter}
							inputType="text"
							inputPlaceholderText={m.inv_user_groups_search_placeholder()}
							className="mb-2"
						/>
						<div
							class="max-h-48 overflow-y-auto rounded-md border border-base-300 p-2"
						>
							{#if filteredUserGroups.length === 0}
								<p class="px-1 py-1 text-xs opacity-70">
									{m.inv_user_groups_no_filter_match()}
								</p>
							{:else}
								<ul class="flex flex-col gap-1">
									{#each filteredUserGroups as g (g.id)}
										{@const checked = selectedUserGroupIds.includes(g.id)}
										<li>
											<label
												class="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-base-200"
											>
												<DaisyUiCheckbox
													{checked}
													onCheckedChange={() => toggleUserGroup(g.id)}
												/>
												<span class="text-sm">{g.name ?? `#${g.id}`}</span>
											</label>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
					<p class="text-xs opacity-70">{m.user_groups_optional_hint()}</p>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel className="shrink-0 sm:w-40">{m.status()}</DaisyUiLabel>
				<div class="flex max-w-md flex-1 flex-wrap items-center gap-2">
					<label class="flex cursor-pointer items-center gap-2">
						<DaisyUiCheckbox bind:checked={formActive} />
						<span class="text-sm opacity-80">{m.active_label()}</span>
					</label>
				</div>
			</div>
		</div>
		<div
			class="d-modal-action flex shrink-0 justify-end gap-2 border-t border-base-300 pt-4"
		>
			<DaisyUiButton
				type="button"
				className="d-btn-ghost"
				onClick={() => cancel()}
			>
				{m.cancel()}
			</DaisyUiButton>
			<DaisyUiButton
				type="submit"
				className="d-btn-primary"
				loading={isSubmitting}
			>
				{isEdit ? m.update() : m.create()}
			</DaisyUiButton>
		</div>
	</form>
{/if}
