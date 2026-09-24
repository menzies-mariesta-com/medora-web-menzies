<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	$effect(() => {
		const hid = page.params.hospital_id;
		if (!hid) return;
		void goto(
			`/medora/hospital/${hid}/home/nursing-workbench/ipd/census`,
			{ replaceState: true }
		);
	});
</script>

<p class="p-4 text-sm opacity-70">Opening IPD census…</p>
