<script lang="ts">
	import type { Snippet } from 'svelte';
	import { VisitTypeEnum } from '$lib/model/enum/db-link';
	import LVisitTypeRequiredAlert from '$lib/component/own/local/private/medora/visit/LVisitTypeRequiredAlert.svelte';

	let {
		hospitalId = '',
		visitId = '',
		message = 'This screen is for IPD visits only. Select an IPD visit, or open an OPD workflow for this patient.',
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
	requiredVisitTypeId={VisitTypeEnum.IPD}
>
	{#if children}
		{@render children()}
	{/if}
</LVisitTypeRequiredAlert>