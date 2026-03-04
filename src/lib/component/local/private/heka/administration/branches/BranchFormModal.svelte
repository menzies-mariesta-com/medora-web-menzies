<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTextarea from '$lib/component/library/daisyui/textarea/DaisyUiTextarea.svelte';
	import {
		createBranch,
		getBranchById,
		updateBranch
	} from '$lib/remote/table/information-table/hospital-branch.remote';
	import { BranchModalState } from '$lib/state/branch-modal.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

	let name = $state('');
	let code = $state('');
	let address = $state('');
	let phone = $state('');
	let email = $state('');
	let isSubmitting = $state(false);
	let isLoading = $state(true);

	const hospitalId = $derived(BranchModalState.hospitalId ?? '');
	const branchId = $derived(BranchModalState.branchId);
	const isEdit = $derived(branchId != null && branchId !== '');

	lifeCycleUtil.onMount(async () => {
		if (isEdit && branchId) {
			const branch = await getBranchById({ id: branchId });
			if (branch) {
				name = branch.name ?? '';
				code = branch.code ?? '';
				address = branch.address ?? '';
				phone = branch.phone ?? '';
				email = branch.email ?? '';
			}
		} else {
			name = '';
			code = '';
			address = '';
			phone = '';
			email = '';
		}
		isLoading = false;
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!name?.trim()) {
			toastService.addToast(
				'Name is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!hospitalId) {
			toastService.addToast(
				'Hospital context is missing.',
				StatusColorEnum.ERROR
			);
			return;
		}
		isSubmitting = true;
		try {
			if (isEdit && branchId) {
				await updateBranch({
					id: branchId,
					name: name.trim(),
					code: code.trim() || undefined,
					address: address.trim() || undefined,
					phone: phone.trim() || undefined,
					email: email.trim() || undefined
				});
				toastService.addToast(
					'Branch updated.',
					StatusColorEnum.SUCCESS
				);
			} else {
				await createBranch({
					hospitalId,
					name: name.trim(),
					code: code.trim() || undefined,
					address: address.trim() || undefined,
					phone: phone.trim() || undefined,
					email: email.trim() || undefined
				});
				toastService.addToast(
					'Branch created.',
					StatusColorEnum.SUCCESS
				);
			}
			confirm();
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : 'Failed to save';
			toastService.addToast(msg, StatusColorEnum.ERROR);
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		BranchModalState.branchId = null;
		cancel();
	}
</script>

{#if isLoading}
	<div class="flex items-center justify-center py-8">
		<span class="d-loading d-loading-lg d-loading-spinner" />
	</div>
{:else}
	<form onsubmit={handleSubmit} class="flex flex-col gap-4">
		<div class="flex flex-col gap-4">
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel
					forText="branch-name"
					className="shrink-0 sm:w-36 font-bold"
					>Name <span class="text-error">*</span></DaisyUiLabel
				>
				<div class="max-w-80 flex-1">
					<DaisyUiInputField
						id="branch-name"
						bind:value={name}
						inputType="text"
						inputPlaceholderText="Branch name"
						required
					/>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel
					forText="branch-code"
					className="shrink-0 sm:w-36">Code</DaisyUiLabel
				>
				<div class="max-w-80 flex-1">
					<DaisyUiInputField
						id="branch-code"
						bind:value={code}
						inputType="text"
						inputPlaceholderText="e.g. BR01"
					/>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel
					forText="branch-phone"
					className="shrink-0 sm:w-36">Phone</DaisyUiLabel
				>
				<div class="max-w-80 flex-1">
					<DaisyUiInputField
						id="branch-phone"
						bind:value={phone}
						inputType="tel"
						inputPlaceholderText="Branch phone"
					/>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel
					forText="branch-email"
					className="shrink-0 sm:w-36">Email</DaisyUiLabel
				>
				<div class="max-w-80 flex-1">
					<DaisyUiInputField
						id="branch-email"
						bind:value={email}
						inputType="email"
						inputPlaceholderText="branch@example.com"
					/>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
			>
				<DaisyUiLabel
					forText="branch-address"
					className="shrink-0 sm:w-36 pt-2">Address</DaisyUiLabel
				>
				<div class="max-w-80 flex-1">
					<DaisyUiTextarea
						id="branch-address"
						bind:value={address}
						placeholder="Street, city, etc."
					/>
				</div>
			</div>
		</div>
		<div
			class="d-modal-action flex shrink-0 justify-end gap-2 border-t border-base-300 pt-4"
		>
			<DaisyUiButton
				type="button"
				className="d-btn-ghost"
				onClick={handleCancel}
			>
				Cancel
			</DaisyUiButton>
			<DaisyUiButton
				type="submit"
				className="d-btn-primary"
				disabled={isSubmitting}
			>
				{isSubmitting
					? isEdit
						? 'Updating…'
						: 'Creating…'
					: isEdit
						? 'Update'
						: 'Create'}
			</DaisyUiButton>
		</div>
	</form>
{/if}
