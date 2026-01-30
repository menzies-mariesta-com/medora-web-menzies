<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<button class="d-join-item d-btn {className}"
	>{@render children()}</button
>
