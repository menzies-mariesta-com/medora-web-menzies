<script lang="ts">
	let { children, className } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<ul
	class="d-dropdown-content d-menu z-1 w-52 rounded-box p-2 shadow-sm {className}"
>
	{@render children()}
</ul>
