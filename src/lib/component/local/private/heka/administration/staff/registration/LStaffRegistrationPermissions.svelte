<script lang="ts">
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCheckbox from '$lib/component/library/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import type {
		HospitalBranchSchema,
		UserGroupSchema
	} from '$lib/server/db/schema-type';

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
		branchData: HospitalBranchSchema[];
		userGroupData: UserGroupSchema[];
		selectedBranchIds?: string[];
		selectedUserGroups?: number[];
		selectedJoinDate?: string;
		selectedResignDate?: string;
		isActive?: boolean;
		isSuperAdmin?: boolean;
		isLocked?: boolean;
	}>();
</script>

<div
	id="permissions"
	class="mt-6 flex flex-col gap-6 md:flex-row md:flex-wrap md:items-start md:gap-8"
>
	<div class="min-w-0 flex-1 md:min-w-56">
		<DaisyUiLabel className="mb-2 block"
			>Branch <span class="text-error">*</span></DaisyUiLabel
		>
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
				<DaisyUiButton
					type="button"
					className="cursor-pointer flex justify-start"
					onClick={toggleBranch}
				>
					<DaisyUiCheckbox checked={isChecked} />
					<span class="text-sm">{data.name}</span>
				</DaisyUiButton>
			{/each}
		</div>
	</div>
	<div class="min-w-0 flex-1 md:min-w-56">
		<DaisyUiLabel className="mb-2 block"
			>User Group <span class="text-error">*</span></DaisyUiLabel
		>
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
				<DaisyUiButton
					type="button"
					className="cursor-pointer flex justify-start"
					onClick={toggleUserGroup}
				>
					<DaisyUiCheckbox checked={isChecked} />
					<span class="text-sm">{data.name}</span>
				</DaisyUiButton>
			{/each}
		</div>
	</div>
	<div class="flex flex-col gap-4">
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="join-date" className="shrink-0 sm:w-36"
				>Join Date</DaisyUiLabel
			>
			<div class="min-w-0 flex-1">
				<DaisyUiInputField
					bind:value={selectedJoinDate}
					inputType="date"
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="resign-date" className="shrink-0 sm:w-36"
				>Resign Date</DaisyUiLabel
			>
			<div class="min-w-0 flex-1">
				<DaisyUiInputField
					bind:value={selectedResignDate}
					inputType="date"
				/>
			</div>
		</div>
	</div>
	<div class="flex flex-col gap-3">
		<label class="flex cursor-pointer items-center gap-2">
			<DaisyUiCheckbox bind:checked={isActive} />
			<span>Active</span>
		</label>
		<label class="flex cursor-pointer items-center gap-2">
			<DaisyUiCheckbox bind:checked={isSuperAdmin} />
			<span>Super Admin</span>
		</label>
		<label class="flex cursor-pointer items-center gap-2">
			<DaisyUiCheckbox bind:checked={isLocked} />
			<span>Lock</span>
		</label>
	</div>
</div>
