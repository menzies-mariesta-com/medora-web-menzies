<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<!-- head -->
<thead class={className}>
	{@render children()}
</thead>
