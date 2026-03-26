<script lang="ts">
	let { strokeWidth, className } = $props<{
		strokeWidth?: number;
		className?: string;
	}>();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width="24"
	height="24"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth ?? 2}
	stroke-linecap="round"
	stroke-linejoin="round"
	class="lucide lucide-text-align-end-icon lucide-text-align-end {className}"
	><path d="M21 5H3" /><path d="M21 12H9" /><path d="M21 19H7" /></svg
>
