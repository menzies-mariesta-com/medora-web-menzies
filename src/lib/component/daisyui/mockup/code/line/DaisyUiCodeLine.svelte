<script lang="ts">
	let { dataPrefix, className, children } = $props<{
		dataPrefix?: string;
		className?: string;
		children: () => void;
	}>();
</script>

<pre data-prefix={dataPrefix} class={className}><code
		>{@render children()}</code
	></pre>
