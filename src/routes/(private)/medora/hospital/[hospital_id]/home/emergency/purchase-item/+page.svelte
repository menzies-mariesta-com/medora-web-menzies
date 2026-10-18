<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import {
		medoraHospitalPageUrl,
		WebRoutesEnum
	} from '$lib/model/enum/routes.enum';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(page.url.searchParams.get('visitId')?.trim() ?? '');

	function goPharmacy() {
		if (!hospitalId || !visitId) return;
		void goto(
			`${medoraHospitalPageUrl(hospitalId, WebRoutesEnum.MEDORA_HOME_MEDICATION_ORDER_INTERNAL_SALES)}?visitId=${encodeURIComponent(visitId)}`
		);
	}

	function goSupplies() {
		if (!hospitalId || !visitId) return;
		void goto(
			`/medora/hospital/${hospitalId}/home/inventory/department-consumption/new?visitId=${encodeURIComponent(visitId)}`
		);
	}
</script>

<div class="mx-auto flex max-w-lg flex-col gap-4 p-6">
	<h1 class="text-primary text-lg font-bold">
		{msg.ed_purchase_item_title?.() ?? 'Purchase item'}
	</h1>
	{#if !visitId}
		<p class="text-warning text-sm">
			{msg.ed_purchase_item_need_visit?.() ??
				'Open this page from Emergency registration with a visit selected (visitId in the URL).'}
		</p>
	{:else}
		<p class="text-sm opacity-70">
			{msg.ed_purchase_item_intro?.() ??
				'Issue pharmacy or supplies from an accessible store for this ED visit. Charges appear on ER billing after approval (supplies) or save (pharmacy).'}
		</p>
		<div class="grid gap-3">
			<div class="rounded-box border border-base-300 p-4">
				<h2 class="font-medium">
					{msg.ed_purchase_item_pharmacy?.() ?? 'Pharmacy (internal sales)'}
				</h2>
				<WashButton
					className="btn-primary mt-2 cursor-pointer"
					onClick={goPharmacy}
				>
					{msg.ed_purchase_item_open_pharmacy?.() ?? 'Open pharmacy sales'}
				</WashButton>
			</div>
			<div class="rounded-box border border-base-300 p-4">
				<h2 class="font-medium">
					{msg.ed_purchase_item_supplies?.() ?? 'Supplies (department consumption)'}
				</h2>
				<WashButton
					className="btn-primary mt-2 cursor-pointer"
					onClick={goSupplies}
				>
					{msg.ed_purchase_item_open_supplies?.() ?? 'Issue supplies'}
				</WashButton>
			</div>
		</div>
	{/if}
</div>
