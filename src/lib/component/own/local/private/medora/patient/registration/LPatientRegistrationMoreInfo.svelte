<script lang="ts">
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';

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
		<label for="address">Address</label>
		<WashTextarea
			id="address"
			bind:value={address}
			className="w-full min-h-24 resize-y"
		/>
	</div>
	<div class="flex flex-col gap-2">
		<label for="remark">Remark</label>
		<WashTextarea
			id="remark"
			bind:value={remark}
			className="w-full min-h-24 resize-y"
		/>
	</div>
</div>
