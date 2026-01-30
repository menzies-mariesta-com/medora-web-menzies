<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<ul class="d-list bg-base-200 rounded-box shadow-md {className}">
  {@render children()}
</ul>