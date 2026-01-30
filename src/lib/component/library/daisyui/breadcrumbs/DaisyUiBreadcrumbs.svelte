<script lang="ts">
	let {  className, children } = $props<{
		className?: string;
        children: () => void;
	}>();
</script>

<div class="d-breadcrumbs {className}">
  <ul>
    {@render children()}
  </ul>
</div>