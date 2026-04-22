<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';

	const hospitalId = $derived(page.params.hospital_id);
	const redirectUrl = $derived.by(() => {
		const hid = typeof hospitalId === 'string' ? hospitalId : '';
		return hid
			? hekaHospitalPageUrl(
					hid,
					'/heka/home/inventory/purchase-requisition'
				)
			: null;
	});

	$effect(() => {
		if (redirectUrl) {
			goto(redirectUrl, { replaceState: true });
		}
	});
</script>
