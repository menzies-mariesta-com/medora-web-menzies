<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';

	const hospitalId = $derived(page.params.hospital_id);
	const redirectUrl = $derived.by(() => {
		const hid = typeof hospitalId === 'string' ? hospitalId : '';
		return hid
			? medoraHospitalPageUrl(
					hid,
					'/medora/home/inventory/purchase-requisition'
				)
			: null;
	});

	$effect(() => {
		if (redirectUrl) {
			goto(redirectUrl, { replaceState: true });
		}
	});
</script>
