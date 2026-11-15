<script lang="ts">
	import MedoraBrandWordmark from '$lib/component/own/global/MedoraBrandWordmark.svelte';
	import SeoHead from '$lib/component/own/snippet/seo/SeoHead.svelte';
	import { absoluteAssetUrl, absoluteUrl } from '$lib/util/seo.util';

	let { data } = $props();
</script>

<SeoHead
	title="Medora Patient App"
	description="Patient sign-in is available in the Medora mobile app on iOS and Android."
	canonical={absoluteUrl(data.origin, '/patient-app')}
	ogImage={absoluteAssetUrl(data.origin)}
	siteName="Medora"
/>

<main class="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
	<MedoraBrandWordmark />
	<h1 class="text-2xl font-semibold">Use the Medora mobile app</h1>
	<p class="text-base-content/70 leading-relaxed">
		Patient accounts sign in through the <strong>Medora Mobile</strong> app
		(medora-mobile-menzies) on iOS or Android—not this staff web portal.
	</p>
	<p class="text-sm text-base-content/60">
		Download links will appear here when the app is published to the stores.
	</p>
</main>
