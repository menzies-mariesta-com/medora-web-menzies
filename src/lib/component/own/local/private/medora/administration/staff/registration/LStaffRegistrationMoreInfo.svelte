<script lang="ts">
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';

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
		<label for="address">Address</label>
		<WashTextarea
			bind:value={selectedAddress}
			className="w-full min-h-24 resize-y"
		/>
	</div>
	<div class="flex flex-col gap-2">
		<label for="remark">Remark</label>
		<WashTextarea
			bind:value={selectedRemark}
			className="w-full min-h-24 resize-y"
		/>
	</div>
</div>
