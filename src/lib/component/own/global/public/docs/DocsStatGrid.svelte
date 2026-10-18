<script lang="ts">
	import type { DocsManifestStats } from '$lib/model/type/medora/docs.type';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	let { stats } = $props<{ stats: DocsManifestStats }>();

	const cards = $derived([
		{ label: msg.docs_stat_workflows(), value: stats.workflows, hint: msg.docs_stat_workflows_hint() },
		{ label: msg.docs_stat_modules(), value: stats.modules, hint: msg.docs_stat_modules_hint() },
		{ label: msg.docs_stat_apis(), value: stats.apis, hint: msg.docs_stat_apis_hint() },
		{ label: msg.docs_stat_templates(), value: stats.templates, hint: msg.docs_stat_templates_hint() },
		{
			label: msg.docs_stat_journal(),
			value: stats.journalSections,
			hint: msg.docs_stat_journal_hint()
		}
	]);
</script>

<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
	{#each cards as card (card.label)}
		<div class="rounded-box border border-ink-border bg-base-100 p-4 shadow-sm">
			<p class="text-2xl font-bold text-primary">{card.value}</p>
			<p class="text-sm font-semibold">{card.label}</p>
			<p class="text-xs text-base-content/60">{card.hint}</p>
		</div>
	{/each}
</div>
