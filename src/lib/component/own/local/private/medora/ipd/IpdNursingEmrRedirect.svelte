<script lang="ts">
	/**
	 * Thin IPD nav wrapper: redirects to shared Nursing EMR screens with IPD
	 * visit-picker context (visitType=IPD, status=admitted).
	 */
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { buildIpdNursingEmrUrl } from '$lib/tool/ipd/ipd-nursing-redirect.util';

	let {
		emrChild
	}: {
		emrChild: string;
	} = $props();

	$effect(() => {
		const hid = page.params.hospital_id;
		if (!hid || typeof hid !== 'string') return;
		void goto(
			buildIpdNursingEmrUrl({
				hospitalId: hid,
				emrChild,
				search: page.url.search
			}),
			{ replaceState: true }
		);
	});
</script>

<p class="p-4 text-sm opacity-70">Opening IPD nursing chart…</p>
