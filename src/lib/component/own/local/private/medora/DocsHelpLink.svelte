<script lang="ts">
	import LucideCircleHelp from '$lib/component/own/library/lucide/LucideCircleHelp.svelte';
	import { medoraPageUrlToDocsHref } from '$lib/util/docs-help.util';
	import { m } from '$lib/paraglide/messages';

	let { pageUrl = '' } = $props<{ pageUrl?: string | null }>();

	const href = $derived(medoraPageUrlToDocsHref(pageUrl));
</script>

{#if href}
	<div class="tooltip tooltip-info" data-tip={m.docs_in_app_help()}>
		<a
			class="btn btn-ghost btn-square btn-info cursor-pointer"
			href="{href}?from=app"
			target="_blank"
			rel="noopener noreferrer"
			aria-label={m.docs_in_app_help()}
		>
			<LucideCircleHelp className="size-4" aria-hidden="true" />
		</a>
	</div>
{/if}
