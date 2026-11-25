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
	class="lucide lucide-calendar-icon lucide-calendar {className}"
	aria-hidden={ariaHidden === false || ariaHidden === 'false'
		? undefined
		: 'true'}
	><path d="M8 2v4" /><path d="M16 2v4" /><rect
		width="18"
		height="18"
		x="3"
		y="4"
		rx="2"
	/><path d="M3 10h18" /></svg
>
