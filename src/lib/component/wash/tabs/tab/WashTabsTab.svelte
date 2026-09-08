<script lang="ts">
	import WashInputField from '../../inputfield/WashInputField.svelte';

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

<label for={tabName} class="tab {className}">
	<WashInputField
		inputType="radio"
		nameText={groupName}
		id={tabName}
		{onClick}
		{checked}
	/>
	{@render children?.()}
</label>
