<script lang="ts">
	import type { Snippet } from 'svelte';
	import { VisitTypeEnum } from '$lib/model/enum/db-link';
	import LVisitTypeRequiredAlert from '$lib/component/own/local/private/medora/visit/LVisitTypeRequiredAlert.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;

	let {
		hospitalId = '',
		visitId = '',
		message = msg.nursing_ed_visit_required?.() ??
			'ED nursing is for emergency visits only. Select an ED visit to continue.',
		children
	}: {
		hospitalId?: string;
		visitId?: string;
		message?: string;
		children?: Snippet;
	} = $props();
</script>

<LVisitTypeRequiredAlert
	{hospitalId}
	{visitId}
	{message}
	requiredVisitTypeId={VisitTypeEnum.ED}
>
	{#if children}
		{@render children()}
	{/if}
</LVisitTypeRequiredAlert>