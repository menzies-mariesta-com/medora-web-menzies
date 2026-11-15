<script lang="ts">
	import AdminPlansSection from '$lib/component/own/local/private/medora/admin/AdminPlansSection.svelte';
</script>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-4">
	<header class="flex min-w-0 flex-col gap-1">
		<h1 class="text-2xl font-bold text-primary">Plans</h1>
		<p class="text-sm text-base-content/70">
			Trial and subscription requests by owner. Grant, suspend, or revoke access.
		</p>
	</header>
	<AdminPlansSection />
</div>
