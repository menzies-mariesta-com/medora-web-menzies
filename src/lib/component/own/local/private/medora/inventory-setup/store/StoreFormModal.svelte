<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import WashCheckbox from '$lib/component/wash/checkbox/WashCheckbox.svelte';
	import { StoreModalState } from '$lib/state/store-modal.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import type {
		StaffRegHospitalBranchRow,
		StaffRegUserGroupRow
	} from '$lib/model/type/medora/staff-reg-ui.type';
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
	let storeMarkupPercentStr = $state('0');

	const normalizedUserGroupFilter = $derived(
		userGroupFilter.trim().toLowerCase()
	);
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
		storeMarkupPercent?: string | null;
		userGroups?: { id: number; name: string | null }[];
	};

	async function fetchBranchesAll(hid: string) {
		const res = await fetch(
			`/api/medora/hospital/${hid}/home/administration/branches?mode=all`,
			{ method: 'GET' }
		);
		if (!res.ok) {
			throw new Error(`Failed to load branches (${res.status})`);
		}
		return (await res.json()) as StaffRegHospitalBranchRow[];
	}

	async function fetchStoreLookups(
		hid: string
	): Promise<StoreLookups> {
		const res = await fetch(
			`/api/medora/hospital/${hid}/home/inventory-setup/stores?mode=lookups`,
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
			`/api/medora/hospital/${hid}/home/inventory-setup/stores?id=${encodeURIComponent(String(id))}`,
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
			selectedUserGroupIds = selectedUserGroupIds.filter(
				(v) => v !== id
			);
		}
	}

	lifeCycleUtil.onMount(async () => {
		if (!hospitalId) {
			isLoading = false;
			return;
		}
		const editing =
			StoreModalState.mode === 'edit' &&
			StoreModalState.editStore != null;
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
					storeMarkupPercentStr =
						s.storeMarkupPercent != null
							? String(s.storeMarkupPercent)
							: '0';
					formActive =
						(s.statusId ?? StatusEnum.ACTIVE) === StatusEnum.ACTIVE;
					selectedUserGroupIds = (s.userGroups ?? []).map(
						(g) => g.id
					);
				}
			} else {
				isPurchaseRequisitable = false;
				storeMarkupPercentStr = '0';
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

		const markupTrim = storeMarkupPercentStr.trim();
		const markupN = Number(markupTrim === '' ? '0' : markupTrim);
		if (!Number.isFinite(markupN) || markupN < 0 || markupN > 999) {
			toastService.addToast(
				m.inv_store_markup_percent_invalid(),
				StatusColorEnum.ERROR
			);
			return;
		}

		const statusId = formActive
			? StatusEnum.ACTIVE
			: StatusEnum.INACTIVE;

		isSubmitting = true;
		try {
			const payload = {
				branchId,
				storeName: storeName.trim(),
				remark: remark.trim() || null,
				isPurchaseRequisitable,
				storeMarkupPercent: markupN.toFixed(2),
				userGroupIds: selectedUserGroupIds,
				statusId
			};
			if (modalState.mode === 'create') {
				const res = await fetch(
					`/api/medora/hospital/${hospitalId}/home/inventory-setup/stores`,
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
					`/api/medora/hospital/${hospitalId}/home/inventory-setup/stores`,
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
				<label for="store-branch" class="shrink-0 sm:w-40">{m.select_branch()}
					<span class="text-error">*</span></label>
				<div class="max-w-md flex-1">
					<WashSelect
						id="store-branch"
						bind:value={branchId}
						optionHeader=""
					>
						{#each branchRows as b (b.id)}
							<option value={b.id}>{b.name ?? b.code ?? b.id}</option>
						{/each}
					</WashSelect>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<label for="store-name" class="shrink-0 sm:w-40">{m.store_name()}
					<span class="text-error">*</span></label>
				<div class="max-w-md flex-1">
					<WashInputField
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
				<label class="shrink-0 pt-2 sm:w-40">{m.remark()}</label>
				<div class="max-w-md flex-1">
					<WashTextarea bind:value={remark} />
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<label class="shrink-0 sm:w-40">{m.inv_store_purchase_requisitable()}</label>
				<div class="max-w-md flex-1">
					<label class="flex cursor-pointer items-center gap-2">
						<input
							type="checkbox"
							class="checkbox checkbox-sm"
							bind:checked={isPurchaseRequisitable}
						/>
						<span class="text-sm opacity-80">{m.active_label()}</span>
					</label>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
			>
				<label for="store-markup" class="shrink-0 pt-2 sm:w-40">{m.inv_store_markup_percent()}</label>
				<div class="max-w-md flex-1">
					<WashInputField
						id="store-markup"
						bind:value={storeMarkupPercentStr}
						inputType="text"
						inputPlaceholderText="0"
						inputTitle={m.inv_store_markup_percent_invalid()}
					/>
					<p class="mt-1 text-xs text-base-content/60">
						{m.inv_store_markup_percent_hint()}
					</p>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
			>
				<label class="shrink-0 pt-2 sm:w-40">{m.user_groups()}</label>
				<div class="flex max-w-md flex-1 flex-col gap-2">
					{#if userGroups.length === 0}
						<p class="text-xs opacity-70">{m.no_user_groups()}</p>
					{:else}
						<WashInputField
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
										{@const checked = selectedUserGroupIds.includes(
											g.id
										)}
										<li>
											<label
												class="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-base-200"
											>
												<WashCheckbox
													{checked}
													onCheckedChange={() =>
														toggleUserGroup(g.id)}
												/>
												<span class="text-sm"
													>{g.name ?? `#${g.id}`}</span
												>
											</label>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
					<p class="text-xs opacity-70">
						{m.user_groups_optional_hint()}
					</p>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<label class="shrink-0 sm:w-40">{m.status()}</label>
				<div
					class="flex max-w-md flex-1 flex-wrap items-center gap-2"
				>
					<label class="flex cursor-pointer items-center gap-2">
						<WashCheckbox bind:checked={formActive} />
						<span class="text-sm opacity-80">{m.active_label()}</span>
					</label>
				</div>
			</div>
		</div>
		<div
			class="modal-action flex shrink-0 justify-end gap-2 border-t border-base-300 pt-4"
		>
			<WashButton
				type="button"
				className="btn-ghost"
				onClick={() => cancel()}
			>
				{m.cancel()}
			</WashButton>
			<WashButton
				type="submit"
				className="btn-primary"
				loading={isSubmitting}
			>
				{isEdit ? m.update() : m.create()}
			</WashButton>
		</div>
	</form>
{/if}
