<script lang="ts">
	let { children, className } = $props<{
		children: () => void;
		className?: string;
		fieldsetLegend?: string;
		fieldsetLegendImage?: string;
		fieldsetLegendClassName?: string;
	}>();
</script>

<fieldset class="d-fieldset {className}">
	{@render children()}
</fieldset>
