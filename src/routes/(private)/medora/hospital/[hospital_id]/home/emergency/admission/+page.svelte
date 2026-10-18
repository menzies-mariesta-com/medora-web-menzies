<script lang="ts">
	import { page } from '$app/state';
	import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { getEdAdmissionSubPages } from '$lib/tool/medora/ed-admission-subnav.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	const routerUtil = new RouterUtil();
	const lifeCycleUtil = new LifeCycleUtil();
	const hospitalId = $derived(page.params.hospital_id);

	lifeCycleUtil.onMount(() => {
		const first = getEdAdmissionSubPages({
			erRegistration: m.ed_admission_new_title(),
			newPatient: msg.ed_admission_tab_new_patient?.() ?? 'New patient',
			list:
				msg.ed_admission_tab_registration_list?.() ??
				'Registration list'
		})[0];
		if (first?.pageUrl && hospitalId)
			routerUtil.replaceRoute(
				medoraHospitalPageUrl(hospitalId, first.pageUrl)
			);
	});
</script>
