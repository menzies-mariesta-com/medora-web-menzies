<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<ul class="d-list rounded-box shadow-md {className}">
	{@render children()}
</ul>
