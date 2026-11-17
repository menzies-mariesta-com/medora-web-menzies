<script lang="ts">
	let {
		label = 'Trial expired'
	}: {
		label?: string;
	} = $props();
</script>

<div
	class="pointer-events-none fixed left-0 top-0 z-[9999] h-28 w-28 overflow-hidden"
	aria-hidden="true"
>
	<div
		class="absolute left-[-56px] top-[18px] w-[200px] rotate-[-45deg] bg-error py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-error-content shadow-md"
	>
		{label}
	</div>
</div>
