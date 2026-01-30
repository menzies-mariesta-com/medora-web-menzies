<script lang="ts">
	let { className, href, target, children } = $props<{
		className?: string;
		href: string;
		target?: string;
		children: () => void;
	}>();
</script>

<a class="d-link {className}" {href} {target}>{@render children()}</a>
