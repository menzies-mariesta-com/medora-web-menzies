<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCheckbox from '$lib/component/wash/checkbox/WashCheckbox.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { WardModalState } from '$lib/state/ward-modal.state.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	type BranchOption = { id: string; name: string | null; code: string | null };

	let { confirm, cancel }: DialogSlotProps = $props();

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);
	const wardApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/ward-master`
			: ''
	);

	let formName = $state('');
	let formCode = $state('');
	let formBranchId = $state('');
	let formActive = $state(true);
	let isSubmitting = $state(false);
	let isLoading = $state(true);
	let branches = $state<BranchOption[]>([]);

	const modalState = $derived(WardModalState);
	const branchOptions = $derived(
		branches.map((b) => ({
			value: b.id,
			label: b.name?.trim() || b.code?.trim() || b.id
		}))
	);

	async function fetchBranches(): Promise<BranchOption[]> {
		if (!hospitalId) return [];
		const res = await fetch(
			`/api/medora/hospital/${hospitalId}/home/administration/branches?mode=all`,
			{ credentials: 'include', cache: 'no-store' }
		);
		if (!res.ok) throw new Error(`Failed to load branches (${res.status})`);
		return (await res.json()) as BranchOption[];
	}

	lifeCycleUtil.onMount(async () => {
		try {
			branches = await fetchBranches();
			const state = WardModalState;
			if (state.mode === 'edit' && state.editWard) {
				formName = state.editWard.name ?? '';
				formCode = state.editWard.code ?? '';
				formBranchId = state.editWard.branchId ?? '';
				formActive =
					(state.editWard.statusId ?? StatusEnum.ACTIVE) ===
					StatusEnum.ACTIVE;
			} else {
				formName = '';
				formCode = '';
				formBranchId = branches[0]?.id ?? '';
				formActive = true;
			}
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Unable to load branches',
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (isSubmitting || isLoading) return;
		if (!formName.trim()) {
			toastService.addToast(
				'Ward name is required',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!formBranchId) {
			toastService.addToast(
				m.select_branch(),
				StatusColorEnum.ERROR
			);
			return;
		}

		isSubmitting = true;
		try {
			if (!wardApi) throw new Error('Hospital context missing');
			const isEdit =
				modalState.mode === 'edit' && modalState.editWard != null;
			const response = await fetch(wardApi, {
				method: isEdit ? 'PUT' : 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					...(isEdit ? { id: modalState.editWard?.id } : {}),
					name: formName.trim(),
					code: formCode.trim() || null,
					branchId: formBranchId,
					statusId: formActive
						? StatusEnum.ACTIVE
						: StatusEnum.INACTIVE
				})
			});
			if (!response.ok) {
				const text = await response.text().catch(() => '');
				throw new Error(
					text ||
						`${isEdit ? 'Update' : 'Create'} failed: ${response.status}`
				);
			}
			toastService.addToast(
				isEdit ? 'Ward updated' : 'Ward created',
				StatusColorEnum.SUCCESS
			);
			confirm();
		} catch (error) {
			toastService.addToast(
				error instanceof Error
					? error.message
					: 'Unable to save ward',
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
	<div class="flex flex-col gap-4">
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="ward-branch" class="shrink-0 sm:w-36">
				{m.branches()} <span class="text-error">*</span>
			</label>
			<div class="max-w-80 flex-1">
				<WashSelect
					id="ward-branch"
					bind:value={formBranchId}
					options={branchOptions}
					placeholder={m.select_branch()}
					disabled={isLoading || branches.length === 0}
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="ward-name" class="shrink-0 sm:w-36">
				{m.name()} <span class="text-error">*</span>
			</label>
			<div class="max-w-80 flex-1">
				<WashInputField
					id="ward-name"
					bind:value={formName}
					inputType="text"
					inputPlaceholderText={m.name()}
					required
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="ward-code" class="shrink-0 sm:w-36"
				>{m.code()}</label
			>
			<div class="max-w-80 flex-1">
				<WashInputField
					id="ward-code"
					bind:value={formCode}
					inputType="text"
					inputPlaceholderText={m.code()}
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<span class="shrink-0 sm:w-36">{m.status()}</span>
			<label
				class="flex max-w-80 flex-1 cursor-pointer items-center gap-2"
			>
				<WashCheckbox bind:checked={formActive} />
				<span class="text-sm opacity-80">{m.active_label()}</span>
			</label>
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
			disabled={isLoading}
		>
			{m.ok()}
		</WashButton>
	</div>
</form>
