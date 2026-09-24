<script lang="ts">
	/**
	 * Svelte stand-in for wash-ui `ChevronsUpDown`
	 * (`@menzies-mariesta-com/menzies-design-wash-ui/icons` — lucide-react).
	 * Same SVG as the package icon; prefer this over importing React icons.
	 */
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
	stroke-width={strokeWidth ?? 1.75}
	stroke-linecap="round"
	stroke-linejoin="round"
	class="lucide lucide-chevrons-up-down-icon lucide-chevrons-up-down {className}"
	aria-hidden="true"
	><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg
>
