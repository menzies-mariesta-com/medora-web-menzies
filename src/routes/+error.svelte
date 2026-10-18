<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';

	const status = $derived(page.status);
	const headline = $derived(status === 404 ? '404' : String(status));
	const description = $derived(
		status === 404
			? m.error_not_found()
			: status >= 500
				? m.error_server()
				: m.error_generic()
	);
</script>

<div class="my-app">
	<div
		class="my-main flex flex-col items-center justify-center gap-6 bg-error/10 px-4 text-center"
	>
		<div>
			<span class="my-ft-h1-display block">{headline}</span>
			<p class="text-ink-muted mt-4 max-w-md text-base">{description}</p>
		</div>
		<a href="/" class="btn btn-primary cursor-pointer">{m.error_page_back_home()}</a>
	</div>
</div>
