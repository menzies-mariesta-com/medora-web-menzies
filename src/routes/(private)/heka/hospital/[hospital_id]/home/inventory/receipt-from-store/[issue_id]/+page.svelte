<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import DepartmentIssueDetailView from '$lib/component/own/local/private/heka/inventory/department-issue/DepartmentIssueDetailView.svelte';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { m } from '$lib/paraglide/messages';

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
			hekaHospitalPageUrl(
				hospitalId,
				'/heka/home/inventory/receipt-from-store' as const
			) as any
		)
	);
</script>

<DepartmentIssueDetailView
	{hospitalId}
	{issueId}
	{backHref}
	showIncomingQty={true}
	backTooltip={m.inv_page_receipt_from_store_title()}
	detailHeading={m.inv_page_receipt_from_store_title()}
/>
