<script lang="ts">
	/**
	 * Design Dialog actions row for content-owned footers
	 * (when WashDialog `showActions={false}` / dialogService component dialogs).
	 * Matches Design: separator + `modal-action mt-0 shrink-0 px-4 py-3`.
	 */
	import type { Snippet } from 'svelte';

	let {
		children,
		className = ''
	}: {
		children: Snippet;
		className?: string;
	} = $props();
</script>

<div class="border-base-300 shrink-0 border-t" role="separator"></div>
<div
	class="modal-action mt-0 shrink-0 px-4 py-3 {className}"
	role="presentation"
>
	{@render children()}
</div>
