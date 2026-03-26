<script lang="ts">
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';

	let {
		selectedAddress = $bindable(),
		selectedRemark = $bindable()
	} = $props<{
		selectedAddress?: string;
		selectedRemark?: string;
	}>();
</script>

<div
	id="more-info"
	class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6"
>
	<div class="flex flex-col gap-2">
		<DaisyUiLabel forText="address">Address</DaisyUiLabel>
		<DaisyUiTextarea
			bind:value={selectedAddress}
			className="w-full min-h-24 resize-y"
		/>
	</div>
	<div class="flex flex-col gap-2">
		<DaisyUiLabel forText="remark">Remark</DaisyUiLabel>
		<DaisyUiTextarea
			bind:value={selectedRemark}
			className="w-full min-h-24 resize-y"
		/>
	</div>
</div>
