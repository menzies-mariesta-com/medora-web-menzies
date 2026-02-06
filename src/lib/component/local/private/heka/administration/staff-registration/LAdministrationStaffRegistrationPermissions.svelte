<script lang="ts">
	import DaisyUiCheckbox from '$lib/component/library/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import type { UserGroupSchema } from '$lib/server/db/schema-type';

	let {
		userGroupData,
		selectedUserGroups = $bindable(),
		selectedJoinDate = $bindable(),
		selectedResignDate = $bindable(),
		isActive = $bindable(),
		isSuperAdmin = $bindable(),
		isLocked = $bindable()
	} = $props<{
		userGroupData: UserGroupSchema[];
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
		<DaisyUiLabel className="mb-2 block">User Group <span class="text-error">*</span></DaisyUiLabel>
		<div
			class="grid max-h-32 grid-cols-1 gap-2 overflow-auto rounded-lg border-2 border-base-300 bg-base-200/30 p-3 sm:grid-cols-2"
		>
			{#each userGroupData as data (data.id)}
				{@const isChecked = selectedUserGroups.includes(data.id)}
				{@const toggleUserGroup = () => {
					if (isChecked) {
						selectedUserGroups = selectedUserGroups.filter((id) => id !== data.id);
					} else {
						selectedUserGroups = [...selectedUserGroups, data.id];
					}
				}}
				<label class="flex cursor-pointer items-center gap-2" onclick={toggleUserGroup}>
					<DaisyUiCheckbox checked={isChecked} />
					<span class="text-sm">{data.name}</span>
				</label>
			{/each}
		</div>
	</div>
	<div class="flex flex-col gap-4">
		<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
			<DaisyUiLabel forText="join-date" className="shrink-0 sm:w-36">Join Date</DaisyUiLabel>
			<div class="min-w-0 flex-1">
				<DaisyUiInputField bind:value={selectedJoinDate} inputType="date" />
			</div>
		</div>
		<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
			<DaisyUiLabel forText="resign-date" className="shrink-0 sm:w-36">Resign Date</DaisyUiLabel>
			<div class="min-w-0 flex-1">
				<DaisyUiInputField bind:value={selectedResignDate} inputType="date" />
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
