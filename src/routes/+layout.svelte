<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiAlert from '$lib/component/library/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiToast from '$lib/component/library/daisyui/toast/DaisyUiToast.svelte';
	import { m } from '$lib/paraglide/messages';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { ToastState } from '$lib/state/toast.state.svelte';
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>
		{m.heka()}
	</title>
</svelte:head>

<div class="my-web">
	<div class="my-main">
		{@render children()}
	</div>
</div>

{#if ToastState.length > 0}
	<DaisyUiToast className="d-toast-bottom d-toast-end">
		{#each ToastState as toast (toast.id)}
			<DaisyUiAlert type={toast.type} message={toast.message} />
		{/each}
	</DaisyUiToast>
{/if}

<div style="display:none">
	{#each locales as locale}
		<a href={localizeHref(page.url.pathname, { locale })}>
			{locale}
		</a>
	{/each}
</div>
