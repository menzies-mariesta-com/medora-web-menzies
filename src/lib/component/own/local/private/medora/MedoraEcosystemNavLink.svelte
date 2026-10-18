<script lang="ts">
	import LucideBalloon from '$lib/component/own/library/lucide/LucideBalloon.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import {
		WebRoutesEnum,
		medoraHospitalHome
	} from '$lib/model/enum/routes.enum';
	import { resolve } from '$app/paths';
	import { paraglideMsg } from '$lib/util/paraglide-fallback.util';

	let {
		hospitalId = null,
		className = ''
	}: {
		hospitalId?: string | null;
		className?: string;
	} = $props();

	const ecosystemLabel = $derived(
		paraglideMsg('nav_ecosystem', 'Ecosystem')
	);

	const href = $derived(
		hospitalId?.trim()
			? `${medoraHospitalHome(hospitalId.trim())}/ecosystem`
			: resolve(WebRoutesEnum.MEDORA_ECOSYSTEM)
	);
</script>

<WashTooltip tooltipText={ecosystemLabel} className="tooltip-accent">
	<a
		{href}
		class="btn btn-circle btn-ghost btn-accent cursor-pointer {className}"
		aria-label={ecosystemLabel}
	>
		<LucideBalloon className="size-6" />
	</a>
</WashTooltip>
