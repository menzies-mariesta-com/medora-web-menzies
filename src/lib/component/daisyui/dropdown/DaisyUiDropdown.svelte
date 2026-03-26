<script lang="ts" module>
	let openDropdown: HTMLDetailsElement | null = null;
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	let { children, className } = $props<{
		className?: string;
		children: () => void;
	}>();

	let detailsElement: HTMLDetailsElement;

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

		const target = event.target as HTMLElement | null;
		if (!target) return;

		const clickedInside = detailsElement.contains(target);

		// Click outside closes the dropdown.
		if (!clickedInside) {
			detailsElement.open = false;
			if (openDropdown === detailsElement) openDropdown = null;
			return;
		}

		// Click inside:
		// - don't interfere with the summary toggle
		// - close when clicking actionable items (buttons/links/custom close targets)
		if (target.closest('summary')) return;

		if (target.closest('button, a, [data-dropdown-close]')) {
			detailsElement.open = false;
			if (openDropdown === detailsElement) openDropdown = null;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleDocumentClick);
		detailsElement?.addEventListener('toggle', handleToggle);

		return () => {
			document.removeEventListener('click', handleDocumentClick);
			detailsElement?.removeEventListener('toggle', handleToggle);
			if (openDropdown === detailsElement) {
				openDropdown = null;
			}
		};
	});
</script>

<details bind:this={detailsElement} class="d-dropdown {className}">
	{@render children()}
</details>
