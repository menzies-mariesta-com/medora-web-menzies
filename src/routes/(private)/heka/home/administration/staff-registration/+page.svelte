<script lang="ts">
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCardBodyAction from '$lib/component/library/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiSkeleton from '$lib/component/library/daisyui/skeleton/DaisyUiSkeleton.svelte';
	import DaisyUiTextarea from '$lib/component/library/daisyui/textarea/DaisyUiTextarea.svelte';
	import { getDepartment } from '$lib/remote/table/information-table/department.remote';
	import { getCraftGroup } from '$lib/remote/table/master-table/craft-group.remote';
	import { getStaffType } from '$lib/remote/table/master-table/staff-type.remote';

	const staffTypeData = await getStaffType();
	const departmentData = await getDepartment();
	const craftGroupData = await getCraftGroup();

	console.log(craftGroupData)
</script>

<DaisyUiCard>
	<DaisyUiCardBody>
		<DaisyUiCardBodyTitle className="mb-5"
			>Profile Details</DaisyUiCardBodyTitle
		>
		<!-- Main Info Column -->
		<div id="main-info" class="flex justify-between">
			<!-- Profile Column -->
			<div class="flex flex-col gap-5 align-middle">
				<DaisyUiSkeleton className="w-42 h-42 rounded-full" />
				<!-- <DaisyUiInputField
					inputType="file"
					className="d-file-input"
				/> -->
				<DaisyUiButton className="d-btn-error">Remove</DaisyUiButton>
			</div>

			<!-- First Column -->
			<div class="flex flex-col gap-3">
				<div class="flex items-center">
					<DaisyUiLabel forText="first-name" className="w-36 "
						>Title</DaisyUiLabel
					>
					<DaisyUiInputField inputType="text" />
				</div>

				<div class="flex items-center">
					<DaisyUiLabel forText="first-name" className="w-36 "
						>First Name</DaisyUiLabel
					>
					<DaisyUiInputField inputType="text" />
				</div>

				<div class="flex items-center">
					<DaisyUiLabel forText="middle-name" className="w-36 "
						>Middle Name</DaisyUiLabel
					>
					<DaisyUiInputField inputType="text" />
				</div>

				<div class="flex items-center">
					<DaisyUiLabel forText="last-name" className="w-36 "
						>Last Name</DaisyUiLabel
					>
					<DaisyUiInputField inputType="text" />
				</div>

				<div class="flex items-center">
					<DaisyUiLabel forText="email" className="w-36 "
						>Email</DaisyUiLabel
					>
					<DaisyUiInputField inputType="email" />
				</div>

				<div class="flex items-center">
					<DaisyUiLabel forText="phone" className="w-36 "
						>Phone</DaisyUiLabel
					>
					<DaisyUiInputField inputType="tel" />
				</div>
			</div>

			<!-- Second Column -->
			<div class="flex flex-col gap-3">
				<div class="flex items-center">
					<DaisyUiLabel forText="phone-secondary" className="w-36 "
						>Phone (Secondary)</DaisyUiLabel
					>
					<DaisyUiInputField inputType="text" />
				</div>

				<div class="flex items-center">
					<DaisyUiLabel forText="date-of-birth" className="w-36 "
						>Date of Birth</DaisyUiLabel
					>
					<DaisyUiInputField inputType="text" />
				</div>

				<div class="flex items-center">
					<DaisyUiLabel forText="staff-type" className="w-36 "
						>Staff Type</DaisyUiLabel
					>
					<DaisyUiSelect optionHeader="Select a staff type ...">
						{#each staffTypeData as data}
							<option value={data.id}>{data.name}</option>
						{/each}
					</DaisyUiSelect>
				</div>
				<div class="flex items-center">
					<DaisyUiLabel forText="employment-type" className="w-36 "
						>Employment Type</DaisyUiLabel
					>
					<DaisyUiInputField inputType="text" />
				</div>
				<div class="flex items-center">
					<DaisyUiLabel forText="education" className="w-36 "
						>Education</DaisyUiLabel
					>
					<DaisyUiInputField inputType="text" />
				</div>
				<div class="flex items-center">
					<DaisyUiLabel forText="designation" className="w-36 "
						>Designation</DaisyUiLabel
					>
					<DaisyUiInputField inputType="text" />
				</div>
			</div>

			<!-- Third Column -->
			<div class="flex flex-col gap-3">
				<div class="flex items-center">
					<DaisyUiLabel forText="department" className="w-36 "
						>Department</DaisyUiLabel
					>
					<DaisyUiSelect optionHeader="Select a department ...">
						{#each departmentData as data}
							<option value={data.id}>{data.name}</option>
						{/each}
					</DaisyUiSelect>
				</div>

				<div class="flex items-center">
					<DaisyUiLabel forText="date-of-birth" className="w-36 "
						>Craft Group</DaisyUiLabel
					>
					<DaisyUiSelect optionHeader="Select a department ...">
						{#each craftGroupData as data}
							<option value={data.id}>{data.name}</option>
						{/each}
					</DaisyUiSelect>
				</div>

				<div class="flex items-center">
					<DaisyUiLabel forText="staff-type" className="w-36 "
						>Staff Type</DaisyUiLabel
					>
					<DaisyUiSelect optionHeader="Select a staff type ...">
						{#each staffTypeData as data}
							<option value={data.id}>{data.name}</option>
						{/each}
					</DaisyUiSelect>
				</div>
				<div class="flex items-center">
					<DaisyUiLabel forText="employment-type" className="w-36 "
						>Employment Type</DaisyUiLabel
					>
					<DaisyUiInputField inputType="text" />
				</div>
				<div class="flex items-center">
					<DaisyUiLabel forText="education" className="w-36 "
						>Education</DaisyUiLabel
					>
					<DaisyUiInputField inputType="text" />
				</div>
				<div class="flex items-center">
					<DaisyUiLabel forText="designation" className="w-36 "
						>Designation</DaisyUiLabel
					>
					<DaisyUiInputField inputType="text" />
				</div>
			</div>
		</div>

		<!-- More Info Column -->
		<div id="more-info" class="w-full">
			<div class="flex w-full flex-col gap-3">
				<DaisyUiLabel>Address</DaisyUiLabel>
				<DaisyUiTextarea className="w-full" />
			</div>
		</div>

		<!-- Action Buttons -->
		<DaisyUiCardBodyAction>
			<DaisyUiButton className="d-btn-wide d-btn-primary"
				>Save</DaisyUiButton
			>
		</DaisyUiCardBodyAction>
	</DaisyUiCardBody>
</DaisyUiCard>
