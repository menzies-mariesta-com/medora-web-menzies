<script lang="ts">
	/**
	 * Design Dialog actions row for content-owned footers
	 * (when WashDialog `showActions={false}` / dialogService component dialogs).
	 *
	 * Parent body column already has `px-4`; use `-mx-4` so the separator is
	 * full-bleed, then `px-4` again on the action row to match shell footers.
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

<div
	class="border-base-300 -mx-4 mt-auto shrink-0 border-t"
	role="separator"
></div>
<div
	class="modal-action mt-0 -mx-4 shrink-0 px-4 py-3 {className}"
	role="presentation"
>
	{@render children()}
</div>
