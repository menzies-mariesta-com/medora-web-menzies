<script lang="ts">
	import DaisyUiInputField from '../../inputfield/DaisyUiInputField.svelte';

	let { drawerName, className } = $props<{
		drawerName: string;
		className?: string;
	}>();
</script>

<DaisyUiInputField
	inputType="checkbox"
	id={drawerName}
	className="d-drawer-toggle hidden {className}"
/>
