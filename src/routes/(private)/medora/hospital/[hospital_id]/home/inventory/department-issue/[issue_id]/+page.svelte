<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import DepartmentIssueDetailView from '$lib/component/own/local/private/medora/inventory/department-issue/DepartmentIssueDetailView.svelte';
	import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const issueId = $derived(
		typeof page.params.issue_id === 'string'
			? page.params.issue_id
			: ''
	);
	const backHref = $derived(
		resolve(
			medoraHospitalPageUrl(
				hospitalId,
				'/medora/home/inventory/department-issue' as const
			) as any
		)
	);
</script>

<DepartmentIssueDetailView {hospitalId} {issueId} {backHref} />
