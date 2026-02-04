<script>
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiDropdownButton from '$lib/component/library/daisyui/dropdown/button/DaisyUiDropdownButton.svelte';
	import DaisyUiDropdownContent from '$lib/component/library/daisyui/dropdown/content/DaisyUiDropdownContent.svelte';
	import DaisyUiDropdown from '$lib/component/library/daisyui/dropdown/DaisyUiDropdown.svelte';
	import DaisyUiNavbar from '$lib/component/library/daisyui/navbar/DaisyUiNavbar.svelte';
</script>

<DaisyUiNavbar className="flex border-t border-neutral/32 gap-3 ">
	<DaisyUiDropdown>
		<DaisyUiDropdownButton>Diagnosis History</DaisyUiDropdownButton>
		<DaisyUiDropdownContent
			className="max-w-screen max-h-screen flex"
		>
			<DaisyUiButton>Hello</DaisyUiButton>
			<DaisyUiButton>Hello</DaisyUiButton>
		</DaisyUiDropdownContent>
	</DaisyUiDropdown>

	<DaisyUiDropdown>
		<DaisyUiDropdownButton>Registration</DaisyUiDropdownButton>
		<DaisyUiDropdownContent
			className="max-w-screen max-h-screen flex"
		>
			<DaisyUiButton>Hello</DaisyUiButton>
			<DaisyUiButton>Hello</DaisyUiButton>
		</DaisyUiDropdownContent>
	</DaisyUiDropdown>
</DaisyUiNavbar>
