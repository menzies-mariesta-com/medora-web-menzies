<script lang="ts">
	import LAuthLogin from '$lib/component/own/local/public/auth/login/LAuthLogin.svelte';
	import { m } from '$lib/paraglide/messages';

	const title = $derived(`${m.auth_sign_in_title()} | ${m.menzies_medora()}`);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<LAuthLogin />
