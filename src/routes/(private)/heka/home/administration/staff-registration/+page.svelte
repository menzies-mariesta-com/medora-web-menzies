<script lang="ts">
	import DaisyUiAvatar from '$lib/component/library/daisyui/avatar/DaisyUiAvatar.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCardBodyAction from '$lib/component/library/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSkeleton from '$lib/component/library/daisyui/skeleton/DaisyUiSkeleton.svelte';
</script>

<DaisyUiCard>
	<DaisyUiCardBody>
		<DaisyUiCardBodyTitle>Profile Details</DaisyUiCardBodyTitle>
		<div id="main-info" class="flex justify-between">
			<div class="flex flex-col gap-5">
				<DaisyUiSkeleton className="w-42 h-42 rounded-full" />
				<!-- <DaisyUiInputField
					inputType="file"
					className="d-file-input"
				/> -->
				<DaisyUiButton className="d-btn-error">Remove</DaisyUiButton>
			</div>
			<div class="flex flex-col gap-3">
				<div class="flex items-center">
					<DaisyUiLabel forText="first-name" className="w-36 "
						>Staff Number</DaisyUiLabel
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
					<DaisyUiLabel forText="first-name" className="w-36 "
						>Staff Type</DaisyUiLabel
					>
					<DaisyUiInputField inputType="text" />
				</div>
			</div>
			<div class="flex flex-col gap-3">
				<div class="flex items-center">
					<DaisyUiLabel forText="first-name" className="w-36 "
						>Staff Number</DaisyUiLabel
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
					<DaisyUiLabel forText="first-name" className="w-36 "
						>Staff Type</DaisyUiLabel
					>
					<DaisyUiInputField inputType="text" />
				</div>
			</div>
		</div>
		<div id="more-info" class="flex"></div>
		<DaisyUiCardBodyAction>
			<DaisyUiButton className="d-btn-wide d-btn-primary"
				>Save</DaisyUiButton
			>
		</DaisyUiCardBodyAction>
	</DaisyUiCardBody>
</DaisyUiCard>
