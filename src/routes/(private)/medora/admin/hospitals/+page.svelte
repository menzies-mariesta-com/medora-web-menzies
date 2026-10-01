<script lang="ts">
	import AdminHospitalsSection from '$lib/component/own/local/private/medora/admin/AdminHospitalsSection.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as unknown as Record<string, (inputs?: object) => string>;
</script>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-4">
	<header class="flex min-w-0 flex-col gap-1">
		<h1 class="text-2xl font-bold text-primary">
			{msg.admin_overview_hospitals()}
		</h1>
		<p class="text-sm text-base-content/70">
			{msg.admin_hospitals_title()}
		</p>
	</header>
	<AdminHospitalsSection />
</div>
