<script lang="ts">
	import DaisyUiInputField from '../../inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '../../label/DaisyUiLabel.svelte';

	let { tabName, groupName, checked, className, onClick, children } =
		$props<{
			tabName: string;
			groupName: string;
			checked?: boolean;
			className?: string;

			children?: () => void;
			onClick?: () => void;
		}>();
</script>

<DaisyUiLabel forText={tabName} className="d-tab {className}">
	<DaisyUiInputField
		inputType="radio"
		nameText={groupName}
		id={tabName}
		{onClick}
		{checked}
	/>
	{@render children?.()}
</DaisyUiLabel>
