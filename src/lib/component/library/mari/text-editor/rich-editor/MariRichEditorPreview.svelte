<script lang="ts">
	let { value } = $props<{
		value: string;
	}>();
</script>

<div class="mt-4 rounded-box border border-base-300 bg-base-100 p-4">
	<div class="mb-2 text-sm font-semibold opacity-70">Preview</div>
	<div class="prose max-w-none">
		{@html value}
	</div>
</div>
