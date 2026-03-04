<script lang="ts">
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTextarea from '$lib/component/library/daisyui/textarea/DaisyUiTextarea.svelte';

	let { address = $bindable(), remark = $bindable() } = $props<{
		address?: string;
		remark?: string;
	}>();
</script>

<div
	id="more-info"
	class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6"
>
	<div class="flex flex-col gap-2">
		<DaisyUiLabel forText="address">Address</DaisyUiLabel>
		<DaisyUiTextarea
			id="address"
			bind:value={address}
			className="w-full min-h-24 resize-y"
		/>
	</div>
	<div class="flex flex-col gap-2">
		<DaisyUiLabel forText="remark">Remark</DaisyUiLabel>
		<DaisyUiTextarea
			id="remark"
			bind:value={remark}
			className="w-full min-h-24 resize-y"
		/>
	</div>
</div>
