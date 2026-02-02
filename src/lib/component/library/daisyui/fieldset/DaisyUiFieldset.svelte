<script lang="ts">
	let {
		children,
		className,
		fieldsetLegend,
		fieldsetLegendClassName
	} = $props<{
		children: () => void;
		className?: string;
		fieldsetLegend?: string;
		fieldsetLegendClassName?: string;
	}>();
</script>

<fieldset class="d-fieldset {className}">
	<legend class="d-fieldset-legend {fieldsetLegendClassName}	"
		>{fieldsetLegend}</legend
	>
	{@render children()}
</fieldset>
