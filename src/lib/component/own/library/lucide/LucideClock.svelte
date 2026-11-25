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
	class="lucide lucide-clock-icon lucide-clock {className}"
	aria-hidden={ariaHidden === false || ariaHidden === 'false'
		? undefined
		: 'true'}
	><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg
>
