<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();
	const toastService = new ToastService();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/er-billing-setup`
			: ''
	);

	let loading = $state(true);
	let saving = $state(false);
	let erBedServiceItemId = $state('');
	let erConsumableServiceItemId = $state('');

	async function load() {
		if (!api) return;
		loading = true;
		try {
			const res = await fetch(api, { credentials: 'include' });
			if (!res.ok) await throwUserFacingHttpError(res);
			const row = (await res.json()) as {
				erBedServiceItemId?: number | null;
				erConsumableServiceItemId?: number | null;
			};
			erBedServiceItemId =
				row.erBedServiceItemId != null ? String(row.erBedServiceItemId) : '';
			erConsumableServiceItemId =
				row.erConsumableServiceItemId != null
					? String(row.erConsumableServiceItemId)
					: '';
		} finally {
			loading = false;
		}
	}

	async function save() {
		if (!api || saving) return;
		saving = true;
		try {
			const res = await fetch(api, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					erBedServiceItemId: erBedServiceItemId.trim()
						? Number(erBedServiceItemId)
						: null,
					erConsumableServiceItemId: erConsumableServiceItemId.trim()
						? Number(erConsumableServiceItemId)
						: null
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toastService.addToast(
				msg.er_billing_setup_saved?.() ?? 'ED billing setup saved',
				StatusColorEnum.SUCCESS
			);
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Save failed',
				StatusColorEnum.ERROR
			);
		} finally {
			saving = false;
		}
	}

	lifeCycle.onMount(() => {
		void load();
	});
</script>

<div class="mx-auto max-w-lg space-y-4 p-6">
	<h1 class="card-title text-primary font-bold">
		{msg.er_billing_setup_title?.() ?? 'ED billing setup'}
	</h1>
	<p class="text-sm opacity-70">
		{msg.er_billing_setup_blurb?.() ??
			'Service item IDs used for auto ED bed charges and department consumption lines on ED bills.'}
	</p>
	{#if loading}
		<p class="text-sm">{m.loading?.() ?? 'Loading…'}</p>
	{:else}
		<label class="form-control w-full">
			<span class="label-text">
				{msg.er_billing_setup_bed_service?.() ?? 'ED bed service item ID'}
			</span>
			<input
				class="input input-bordered w-full cursor-text"
				inputmode="numeric"
				bind:value={erBedServiceItemId}
			/>
		</label>
		<label class="form-control w-full">
			<span class="label-text">
				{msg.er_billing_setup_consumable_service?.() ??
					'Consumable billing service item ID'}
			</span>
			<input
				class="input input-bordered w-full cursor-text"
				inputmode="numeric"
				bind:value={erConsumableServiceItemId}
			/>
		</label>
		<WashButton
			className="btn btn-primary cursor-pointer"
			loading={saving}
			disabled={saving}
			onClick={() => save()}
		>
			{m.save?.() ?? 'Save'}
		</WashButton>
	{/if}
</div>
