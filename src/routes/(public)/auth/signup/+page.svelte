<script lang="ts">
	import LAuthSignup from '$lib/component/own/local/public/auth/signup/LAuthSignup.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<LAuthSignup countries={data.countries} genders={data.genders} />
