<script lang="ts">
	let { isActive = $bindable() } = $props<{ isActive?: boolean }>();
</script>

<div class="mt-6 flex flex-wrap items-center gap-4">
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
		<label class="flex cursor-pointer items-center gap-2">
			<input
				type="checkbox"
				class="d-checkbox d-checkbox-primary"
				bind:checked={isActive}
			/>
			<span class="text-sm">Active</span>
		</label>
	</div>
</div>
