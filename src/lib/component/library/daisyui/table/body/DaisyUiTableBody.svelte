<script lang="ts">
	let {  className, children } = $props<{
		className?: string;
        children: () => void;
	}>();
</script>

<tbody class="{className}">
    {@render children()}
</tbody>