<script lang="ts">
	let { strokeWidth, className, 'aria-hidden': ariaHidden = true } = $props<{
		strokeWidth?: number;
		className?: string;
		/** Icons are decorative by default; pass `aria-hidden={false}` when the icon carries meaning. */
		'aria-hidden'?: boolean | 'true' | 'false';
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
	class="lucide lucide-underline-icon lucide-underline {className}"
	aria-hidden={ariaHidden === false || ariaHidden === 'false'
		? undefined
		: 'true'}
	><path d="M6 4v6a6 6 0 0 0 12 0V4" /><line
		x1="4"
		x2="20"
		y1="20"
		y2="20"
	/></svg
>
