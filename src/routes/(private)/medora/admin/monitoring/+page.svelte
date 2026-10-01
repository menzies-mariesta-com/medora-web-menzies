<script lang="ts">
	import AdminOpsRail from '$lib/component/own/local/private/medora/admin/AdminOpsRail.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as unknown as Record<string, (inputs?: object) => string>;
</script>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-4">
	<header class="flex min-w-0 flex-col gap-1">
		<h1 class="text-2xl font-bold text-primary">
			{msg.admin_monitoring_title()}
		</h1>
		<p class="text-sm text-base-content/70">
			{msg.admin_monitoring_subtitle()}
		</p>
	</header>
	<div class="min-h-[28rem]">
		<AdminOpsRail layout="page" />
	</div>
</div>
