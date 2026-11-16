<script lang="ts">
	import AdminGlobalDocumentsSection from '$lib/component/own/local/private/medora/admin/AdminGlobalDocumentsSection.svelte';
	import { paraglideMsg } from '$lib/util/paraglide-msg.util';
</script>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-4">
	<header class="flex min-w-0 flex-col gap-1">
		<h1 class="text-2xl font-bold text-primary">
			{paraglideMsg('admin_global_documents_title', 'Global documents')}
		</h1>
		<p class="text-sm text-base-content/70">
			{paraglideMsg(
				'admin_global_documents_subtitle',
				'Catalog metadata and raw HTML bodies for reusable templates — no hospital print layout or document type.'
			)}
		</p>
	</header>
	<AdminGlobalDocumentsSection />
</div>
