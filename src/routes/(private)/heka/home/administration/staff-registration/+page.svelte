<script lang="ts">
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCardBodyAction from '$lib/component/library/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCheckbox from '$lib/component/library/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiJoin from '$lib/component/library/daisyui/join/DaisyUiJoin.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiSkeleton from '$lib/component/library/daisyui/skeleton/DaisyUiSkeleton.svelte';
	import DaisyUiTextarea from '$lib/component/library/daisyui/textarea/DaisyUiTextarea.svelte';

	import { getSpecialization } from '$lib/remote/table/master-table/specialization.remote';
	import { getStaffType } from '$lib/remote/table/master-table/staff-type.remote';
	import { getDepartment } from '$lib/remote/table/master-table/department.remote';
	import { getUserGroup } from '$lib/remote/table/information-table/user-group.remote';
	import { getCountry } from '$lib/remote/table/master-table/country.remote';
	import { getGender } from '$lib/remote/table/master-table/gender.remote';
	import { getIdentityType } from '$lib/remote/table/master-table/identity-type.remote';
	import { getmaritalStatus } from '$lib/remote/table/master-table/marial-status.remote';
	const staffTypeData = await getStaffType();
	const departmentData = await getDepartment();
	const specializationData = await getSpecialization();
	const genderData = await getGender();
	const maritalStatusData = await getmaritalStatus();
	const countryData = await getCountry();
	const identityTypeData = await getIdentityType();
	const userGroupData = await getUserGroup();
</script>

<DaisyUiCard>
	<DaisyUiCardBody>
		<DaisyUiCardBodyTitle className="mb-5"
			>Profile Details</DaisyUiCardBodyTitle
		>

		<!-- Profile + Main form grid: responsive -->
		<div
			class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10"
		>
			<!-- Profile block: centered on mobile, then fixed width on lg+ -->
			<div
				class="flex shrink-0 flex-col items-center gap-4 sm:flex-row sm:items-start lg:flex-col lg:items-center"
			>
				<DaisyUiSkeleton
					className="size-28 rounded-full sm:size-32 lg:size-36"
				/>
				<div class="flex flex-col gap-2">
					<DaisyUiButton className="d-btn-error d-btn-sm"
						>Remove</DaisyUiButton
					>
				</div>
			</div>

			<!-- Form columns: 1 col mobile, 2 md, 3 xl -->
			<div
				class="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3"
			>
				<!-- Column 1 -->
				<div class="flex flex-col gap-4">
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel forText="title" className="shrink-0 sm:w-36"
							>Title</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiInputField inputType="text" />
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel
							forText="first-name"
							className="shrink-0 sm:w-36">First Name</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiInputField inputType="text" />
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel
							forText="middle-name"
							className="shrink-0 sm:w-36">Middle Name</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiInputField inputType="text" />
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel
							forText="last-name"
							className="shrink-0 sm:w-36">Last Name</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiInputField inputType="text" />
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel forText="email" className="shrink-0 sm:w-36"
							>Email</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiInputField inputType="email" />
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel
							forText="gender"
							className="shrink-0 sm:w-36">Gender</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiSelect optionHeader="Select a gender ...">
								{#each genderData as data}
									<option value={data.id}>{data.name}</option>
								{/each}
							</DaisyUiSelect>
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel
							forText="marital-status"
							className="shrink-0 sm:w-36"
							>Marital Status</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiSelect
								optionHeader="Select a marital status ..."
							>
								{#each maritalStatusData as data}
									<option value={data.id}>{data.name}</option>
								{/each}
							</DaisyUiSelect>
						</div>
					</div>
				</div>

				<!-- Column 2 -->
				<div class="flex flex-col gap-4">
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel forText="phone" className="shrink-0 sm:w-36"
							>Phone</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiInputField inputType="tel" />
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel
							forText="phone-secondary"
							className="shrink-0 sm:w-36"
							>Phone (Secondary)</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiInputField inputType="text" />
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel
							forText="date-of-birth"
							className="shrink-0 sm:w-36">Date of Birth</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiInputField inputType="text" />
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel
							forText="staff-type"
							className="shrink-0 sm:w-36">Staff Type</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiSelect optionHeader="Select a staff type ...">
								{#each staffTypeData as data}
									<option value={data.id}>{data.name}</option>
								{/each}
							</DaisyUiSelect>
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel
							forText="employment-type"
							className="shrink-0 sm:w-36"
							>Employment Type</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiInputField inputType="text" />
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel
							forText="education"
							className="shrink-0 sm:w-36">Education</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiInputField inputType="text" />
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel
							forText="designation"
							className="shrink-0 sm:w-36">Designation</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiInputField inputType="text" />
						</div>
					</div>
				</div>

				<!-- Column 3 -->
				<div class="flex flex-col gap-4">
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel
							forText="department"
							className="shrink-0 sm:w-36">Department</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiSelect optionHeader="Select a department ...">
								{#each departmentData as data}
									<option value={data.id}>{data.name}</option>
								{/each}
							</DaisyUiSelect>
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel
							forText="specialization"
							className="shrink-0 sm:w-36"
							>Specialization</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiSelect
								optionHeader="Select a specialization ..."
							>
								{#each specializationData as data}
									<option value={data.id}>{data.name}</option>
								{/each}
							</DaisyUiSelect>
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel
							forText="country"
							className="shrink-0 sm:w-36">Country</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiSelect optionHeader="Select a country ...">
								{#each countryData as data}
									<option value={data.id}>{data.name}</option>
								{/each}
							</DaisyUiSelect>
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel
							forText="identity-type"
							className="shrink-0 sm:w-36">Identity Type</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiJoin>
								<DaisyUiSelect
									optionHeader="Select an identity type ..."
								>
									{#each identityTypeData as data}
										<option value={data.id}>{data.name}</option>
									{/each}
								</DaisyUiSelect>
								<DaisyUiInputField inputType="text" />
							</DaisyUiJoin>
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel forText="state" className="shrink-0 sm:w-36"
							>State</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiInputField inputType="text" />
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel forText="city" className="shrink-0 sm:w-36"
							>City</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiInputField inputType="text" />
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<DaisyUiLabel
							forText="postal-code"
							className="shrink-0 sm:w-36">Postal Code</DaisyUiLabel
						>
						<div class="min-w-0 flex-1">
							<DaisyUiInputField inputType="text" />
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- More Info: 1 col mobile, 2 cols md+ -->
		<div
			id="more-info"
			class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6"
		>
			<div class="flex flex-col gap-2">
				<DaisyUiLabel forText="address">Address</DaisyUiLabel>
				<DaisyUiTextarea className="w-full min-h-24 resize-y" />
			</div>
			<div class="flex flex-col gap-2">
				<DaisyUiLabel forText="remark">Remark</DaisyUiLabel>
				<DaisyUiTextarea className="w-full min-h-24 resize-y" />
			</div>
		</div>

		<!-- Permissions: stack on mobile, row on md+ -->
		<div
			id="permissions"
			class="mt-6 flex flex-col gap-6 md:flex-row md:flex-wrap md:items-start md:gap-8"
		>
			<div class="min-w-0 flex-1 md:min-w-56">
				<DaisyUiLabel className="mb-2 block">User Group</DaisyUiLabel>
				<div
					class="flex max-h-32 flex-col gap-2 overflow-auto rounded-lg border-2 border-base-300 bg-base-200/30 p-3"
				>
					{#each userGroupData as data}
						<label class="flex cursor-pointer items-center gap-2">
							<DaisyUiCheckbox checked={false} />
							<span class="text-sm">{data.name}</span>
						</label>
					{/each}
				</div>
			</div>
			<div class="flex flex-col gap-4">
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="join-date"
						className="shrink-0 sm:w-36">Join Date</DaisyUiLabel
					>
					<div class="min-w-0 flex-1">
						<DaisyUiInputField inputType="text" />
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="resign-date"
						className="shrink-0 sm:w-36">Resign Date</DaisyUiLabel
					>
					<div class="min-w-0 flex-1">
						<DaisyUiInputField inputType="text" />
					</div>
				</div>
			</div>
			<div class="flex flex-col gap-3">
				<label class="flex cursor-pointer items-center gap-2">
					<DaisyUiCheckbox checked={true} />
					<span>Active</span>
				</label>
				<label class="flex cursor-pointer items-center gap-2">
					<DaisyUiCheckbox checked={false} />
					<span>Super Admin</span>
				</label>
				<label class="flex cursor-pointer items-center gap-2">
					<DaisyUiCheckbox checked={false} />
					<span>Lock</span>
				</label>
			</div>
		</div>

		<!-- Action Buttons -->
		<DaisyUiCardBodyAction className="mt-6">
			<DaisyUiButton className="d-btn-wide d-btn-primary"
				>Save</DaisyUiButton
			>
		</DaisyUiCardBodyAction>
	</DaisyUiCardBody>
</DaisyUiCard>
