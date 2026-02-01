<script>
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiFieldset from '$lib/component/library/daisyui/fieldset/DaisyUiFieldset.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
</script>

<DaisyUiCard>
	<DaisyUiCardBody>
		<DaisyUiFieldset
			fieldsetLegend="LOGIN"
			fieldsetLegendClassName="my-ft-h1"
		>
			<DaisyUiLabel>Usernames</DaisyUiLabel>
			<DaisyUiInputField
				inputType="text"
				inputPlaceholderText="Username"
			/>
			<DaisyUiLabel>Password</DaisyUiLabel>
			<DaisyUiInputField
				inputType="password"
				inputPlaceholderText="Password"
			/>
			<DaisyUiButton
				onClick={() => console.log('Login clicked')}
				className="d-btn-primary"
			>
				Login
			</DaisyUiButton>
		</DaisyUiFieldset>
	</DaisyUiCardBody>
</DaisyUiCard>
