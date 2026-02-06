<script lang="ts">
	let { className, href, target, onClick, children } = $props<{
		className?: string;
		href?: string;
		target?: string;
		onClick?: (e: MouseEvent) => void;
		children: () => void;
	}>();
</script>

<a class="d-link {className}" {href} {target} onclick={onClick}>{@render children()}</a>
