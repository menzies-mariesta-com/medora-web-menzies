<script lang="ts">
	let { children, className } = $props<{
		children: () => void;
		className?: string;
		fieldsetLegend?: string;
	}>();
</script>

<legend class="d-fieldset-legend {className}	"
	>{@render children?.()}</legend
>
