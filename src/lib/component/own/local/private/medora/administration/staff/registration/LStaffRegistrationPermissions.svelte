<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCheckbox from '$lib/component/wash/checkbox/WashCheckbox.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import type {
		StaffRegHospitalBranchRow,
		StaffRegUserGroupRow
	} from '$lib/model/type/medora/staff-reg-ui.type';

	let {
		branchData,
		userGroupData,
		selectedBranchIds = $bindable(),
		selectedUserGroups = $bindable(),
		selectedJoinDate = $bindable(),
		selectedResignDate = $bindable(),
		isActive = $bindable(),
		isSuperAdmin = $bindable(),
		isLocked = $bindable()
	} = $props<{
		branchData: StaffRegHospitalBranchRow[];
		userGroupData: StaffRegUserGroupRow[];
		selectedBranchIds?: string[];
		selectedUserGroups?: number[];
		selectedJoinDate?: string;
		selectedResignDate?: string;
		isActive?: boolean;
		isSuperAdmin?: boolean;
		isLocked?: boolean;
	}>();

	// ✅ Track last clicked
	let lastClicked: 'active' | 'lock' | null = null;
	let isUpdating = false;

	function handleActiveClick() {
		lastClicked = 'active';
	}

	function handleLockClick() {
		lastClicked = 'lock';
	}

	// ✅ Enforce rule AFTER state updates
	$effect(() => {
		if (isUpdating) return;

		if (isActive && isLocked) {
			isUpdating = true;

			if (lastClicked === 'active') {
				isLocked = false;
			} else if (lastClicked === 'lock') {
				isActive = false;
			}

			isUpdating = false;
		}
	});
</script>

<div
	id="permissions"
	class="mt-6 flex flex-col gap-6 md:flex-row md:flex-wrap md:items-start md:gap-8"
>
	<!-- Branch -->
	<div class="min-w-0 flex-1 md:min-w-56">
		<label class="mb-2 block">
			Branch <span class="text-error">*</span>
		</label>

		<div
			class="grid max-h-32 grid-cols-1 gap-2 overflow-auto rounded-lg border-2 border-base-300 bg-base-200/30 p-3 lg:grid-cols-2"
		>
			{#each branchData as data (data.id)}
				{@const isChecked = selectedBranchIds.includes(data.id)}
				{@const toggleBranch = () => {
					if (isChecked) {
						selectedBranchIds = selectedBranchIds.filter(
							(id: string) => id !== data.id
						);
					} else {
						selectedBranchIds = [...selectedBranchIds, data.id];
					}
				}}

				<WashButton
					type="button"
					className="cursor-pointer flex justify-start"
					onClick={toggleBranch}
				>
					<WashCheckbox checked={isChecked} />
					<span class="text-sm">{data.name}</span>
				</WashButton>
			{/each}
		</div>
	</div>

	<!-- User Group -->
	<div class="min-w-0 flex-1 md:min-w-56">
		<label class="mb-2 block">
			User Group <span class="text-error">*</span>
		</label>

		<div
			class="grid max-h-32 grid-cols-1 gap-2 overflow-auto rounded-lg border-2 border-base-300 bg-base-200/30 p-3 lg:grid-cols-3 xl:grid-cols-4"
		>
			{#each userGroupData as data (data.id)}
				{@const isChecked = selectedUserGroups.includes(data.id)}
				{@const toggleUserGroup = () => {
					if (isChecked) {
						selectedUserGroups = selectedUserGroups.filter(
							(id: number) => id !== data.id
						);
					} else {
						selectedUserGroups = [...selectedUserGroups, data.id];
					}
				}}

				<WashButton
					type="button"
					className="cursor-pointer flex justify-start"
					onClick={toggleUserGroup}
				>
					<WashCheckbox checked={isChecked} />
					<span class="text-sm">{data.name}</span>
				</WashButton>
			{/each}
		</div>
	</div>

	<!-- Dates -->
	<div class="flex flex-col gap-4">
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label class="shrink-0 sm:w-36">Join Date</label>
			<WashInputField
				bind:value={selectedJoinDate}
				inputType="date"
			/>
		</div>

		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label class="shrink-0 sm:w-36">Resign Date</label>
			<WashInputField
				bind:value={selectedResignDate}
				inputType="date"
			/>
		</div>
	</div>

	<!-- ✅ Status -->
	<div class="flex flex-col gap-3">
		<div class="flex cursor-pointer items-center gap-2">
			<WashCheckbox
				id="staff-reg-perm-active"
				bind:checked={isActive}
				onCheckedChange={handleActiveClick}
			/>
			<label
				class="cursor-pointer select-none"
				for="staff-reg-perm-active">Active</label
			>
		</div>

		<div class="flex cursor-pointer items-center gap-2">
			<WashCheckbox
				id="staff-reg-perm-lock"
				bind:checked={isLocked}
				onCheckedChange={handleLockClick}
			/>
			<label
				class="cursor-pointer select-none"
				for="staff-reg-perm-lock">Lock</label
			>
		</div>

		<div class="flex cursor-pointer items-center gap-2">
			<WashCheckbox
				id="staff-reg-perm-superadmin"
				bind:checked={isSuperAdmin}
			/>
			<label
				class="cursor-pointer select-none"
				for="staff-reg-perm-superadmin">Super Admin</label
			>
		</div>
	</div>
</div>
