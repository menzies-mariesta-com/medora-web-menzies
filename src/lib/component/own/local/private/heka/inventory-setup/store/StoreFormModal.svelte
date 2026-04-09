<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCheckbox from '$lib/component/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import { StoreModalState } from '$lib/state/store-modal.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import type {
		StaffRegDepartmentRow,
		StaffRegHospitalBranchRow,
		StaffRegUserGroupRow
	} from '$lib/model/type/heka/staff-reg-ui.type';
	import { m } from '$lib/paraglide/messages';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

	let branchRows = $state<StaffRegHospitalBranchRow[]>([]);
	let userGroups = $state<StaffRegUserGroupRow[]>([]);
	let departments = $state<StaffRegDepartmentRow[]>([]);

	let branchId = $state('');
	let storeName = $state('');
	let remark = $state('');
	let linkKindStr = $state('user_group');
	let userGroupIdStr = $state('');
	let departmentIdStr = $state('');
	let formActive = $state(true);
	let isSubmitting = $state(false);
	let isLoading = $state(true);

	const modalState = $derived(StoreModalState);
	const hospitalId = $derived(modalState.hospitalId ?? '');
	const isEdit = $derived(
		modalState.mode === 'edit' && modalState.editStore != null
	);

	type StoreLookups = {
		userGroups: StaffRegUserGroupRow[];
		departments: StaffRegDepartmentRow[];
		statuses: unknown[];
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

	async function fetchStoreById(hid: string, id: number) {
		const res = await fetch(
			`/api/heka/hospital/${hid}/home/inventory-setup/stores?id=${encodeURIComponent(String(id))}`,
			{ method: 'GET' }
		);
		if (!res.ok) {
			throw new Error(`Failed to load store (${res.status})`);
		}
		return (await res.json()) as any;
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
			departments = lookups.departments ?? [];

			if (editing && StoreModalState.editStore) {
				const s = await fetchStoreById(
					hospitalId,
					StoreModalState.editStore.id
				);
				if (s) {
					branchId = s.branchId;
					storeName = s.storeName ?? '';
					remark = s.remark ?? '';
					formActive =
						(s.statusId ?? StatusEnum.ACTIVE) ===
						StatusEnum.ACTIVE;
					if (s.userGroupId != null) {
						linkKindStr = 'user_group';
						userGroupIdStr = String(s.userGroupId);
						departmentIdStr = '';
					} else if (s.departmentId != null) {
						linkKindStr = 'department';
						departmentIdStr = String(s.departmentId);
						userGroupIdStr = '';
					}
				}
			} else if (branches.length > 0) {
				branchId = branches[0].id;
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
			toastService.addToast(
				m.select_branch(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const ugId =
			linkKindStr === 'user_group' && userGroupIdStr !== ''
				? Number(userGroupIdStr)
				: null;
		const depId =
			linkKindStr === 'department' && departmentIdStr !== ''
				? Number(departmentIdStr)
				: null;
		if (
			linkKindStr === 'user_group' &&
			(ugId == null || !Number.isFinite(ugId))
		) {
			toastService.addToast(
				m.select_user_group(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (
			linkKindStr === 'department' &&
			(depId == null || !Number.isFinite(depId))
		) {
			toastService.addToast(
				m.select_department(),
				StatusColorEnum.ERROR
			);
			return;
		}

		const statusId = formActive
			? StatusEnum.ACTIVE
			: StatusEnum.INACTIVE;

		isSubmitting = true;
		try {
			if (modalState.mode === 'create') {
				const res = await fetch(
					`/api/heka/hospital/${hospitalId}/home/inventory-setup/stores`,
					{
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({
							branchId,
							storeName: storeName.trim(),
							remark: remark.trim() || null,
							userGroupId:
								linkKindStr === 'user_group' ? ugId : null,
							departmentId:
								linkKindStr === 'department' ? depId : null,
							statusId
						})
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
							branchId,
							storeName: storeName.trim(),
							remark: remark.trim() || null,
							userGroupId:
								linkKindStr === 'user_group' ? ugId : null,
							departmentId:
								linkKindStr === 'department' ? depId : null,
							statusId
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
					>{m.link_type()}</DaisyUiLabel
				>
				<div class="flex max-w-md flex-1 flex-col gap-2">
					<DaisyUiSelect
						bind:value={linkKindStr}
						id="store-link-kind"
					>
						<option value="user_group">{m.linked_user_group()}</option>
						<option value="department">{m.linked_department()}</option>
					</DaisyUiSelect>
					<p class="text-xs opacity-70">{m.store_owner_xor_hint()}</p>
				</div>
			</div>
			{#if linkKindStr === 'user_group'}
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="store-ug"
						className="shrink-0 sm:w-40"
						>{m.select_user_group()}
						<span class="text-error">*</span></DaisyUiLabel
					>
					<div class="max-w-md flex-1">
						<DaisyUiSelect
							id="store-ug"
							bind:value={userGroupIdStr}
							optionHeader=""
						>
							{#each userGroups as g (g.id)}
								<option value={String(g.id)}>{g.name ?? g.id}</option>
							{/each}
						</DaisyUiSelect>
					</div>
				</div>
			{:else}
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="store-dept"
						className="shrink-0 sm:w-40"
						>{m.select_department()}
						<span class="text-error">*</span></DaisyUiLabel
					>
					<div class="max-w-md flex-1">
						<DaisyUiSelect
							id="store-dept"
							bind:value={departmentIdStr}
							optionHeader=""
						>
							{#each departments as d (d.id)}
								<option value={String(d.id)}>{d.name ?? d.code ?? d.id}</option>
							{/each}
						</DaisyUiSelect>
					</div>
				</div>
			{/if}
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
				{isEdit ? m.save() : m.create()}
			</DaisyUiButton>
		</div>
	</form>
{/if}
