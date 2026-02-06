<script lang="ts" context="module">
	let openDropdown: HTMLDetailsElement | null = null;
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	let { children, className } = $props<{
		className?: string;
		children: () => void;
	}>();

	let detailsElement: HTMLDetailsElement;

	function handleInnerClick(event: MouseEvent) {
		if (!detailsElement || !detailsElement.open) return;

		const target = event.target as HTMLElement | null;
		if (!target) return;

		// Don't interfere with the summary toggle itself
		if (target.closest('summary')) return;

		// Close the dropdown when clicking any actionable item inside (e.g. button or link)
		if (target.closest('button, a, [data-dropdown-close]')) {
			detailsElement.open = false;
			if (openDropdown === detailsElement) {
				openDropdown = null;
			}
		}
	}

	function handleToggle() {
		if (!detailsElement) return;

		if (detailsElement.open) {
			if (openDropdown && openDropdown !== detailsElement) {
				openDropdown.open = false;
			}
			openDropdown = detailsElement;
		} else if (openDropdown === detailsElement) {
			openDropdown = null;
		}
	}

	function handleDocumentClick(event: MouseEvent) {
		if (!detailsElement || !detailsElement.open) return;

		const target = event.target as Node | null;
		if (target && !detailsElement.contains(target)) {
			detailsElement.open = false;
			if (openDropdown === detailsElement) {
				openDropdown = null;
			}
		}
	}

	onMount(() => {
		document.addEventListener('click', handleDocumentClick);

		return () => {
			document.removeEventListener('click', handleDocumentClick);
			if (openDropdown === detailsElement) {
				openDropdown = null;
			}
		};
	});
</script>

<details
	bind:this={detailsElement}
	class="d-dropdown {className}"
	on:click={handleInnerClick}
	on:toggle={handleToggle}
>
	{@render children()}
</details>
