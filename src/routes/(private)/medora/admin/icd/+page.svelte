<script lang="ts">
	import AdminIcdSection from '$lib/component/own/local/private/medora/admin/AdminIcdSection.svelte';
	import { paraglideMsg } from '$lib/util/paraglide-msg.util';
</script>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-4">
	<header class="flex min-w-0 flex-col gap-1">
		<h1 class="text-2xl font-bold text-primary">
			{paraglideMsg('admin_icd_title', 'ICD codes')}
		</h1>
		<p class="text-sm text-base-content/70">
			{paraglideMsg(
				'admin_icd_subtitle',
				'Browse full WHO ICD-10 and ICD-11 diagnosis codes used by EMR pickers.'
			)}
		</p>
	</header>
	<AdminIcdSection />
</div>
