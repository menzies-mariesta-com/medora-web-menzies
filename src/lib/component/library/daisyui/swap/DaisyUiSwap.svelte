<script lang="ts">
	import DaisyUiInputField from '../inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '../label/DaisyUiLabel.svelte';

	let { effect, className, children } = $props<{
		effect?: 'flip' | 'rotate';
		className?: string;
		children: () => void;
	}>();
</script>

<DaisyUiLabel
	className={`d-swap ${className} ${effect ? 'd-swap-' + effect : ''}`}
>
	<DaisyUiInputField
		inputType="checkbox"
		className="d-theme-controller"
		hidden
		value="garden"
	/>
	{@render children()}
</DaisyUiLabel>
