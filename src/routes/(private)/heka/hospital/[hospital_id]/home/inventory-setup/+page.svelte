<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';

	const hospitalId = $derived(page.params.hospital_id);

	$effect(() => {
		const hid = typeof hospitalId === 'string' ? hospitalId : '';
		if (hid) {
			goto(
				hekaHospitalPageUrl(
					hid,
					'/heka/home/inventory-setup/stores'
				),
				{ replaceState: true }
			);
		}
	});
</script>
