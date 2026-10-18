<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import type { ClinicalOrderSetRow } from '$lib/model/type/medora/clinical-platform.type';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	const msg = m as Record<string, (inputs?: object) => string>;
	const toastService = new ToastService();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/clinical-platform`
			: ''
	);

	let rows = $state<ClinicalOrderSetRow[]>([]);
	let name = $state('');
	let isSaving = $state(false);

	async function load() {
		const res = await fetch(`${api}?mode=orderSet.list`);
		rows = (await res.json()) as ClinicalOrderSetRow[];
	}

	async function save() {
		if (!name.trim()) return;
		isSaving = true;
		try {
			await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode: 'orderSet.save',
					name: name.trim(),
					lines: []
				})
			});
			name = '';
			toastSuccess(
				toastService,
				msg.clinical_order_sets_title(),
				msg.clinical_save()
			);
			await load();
		} finally {
			isSaving = false;
		}
	}

	$effect(() => {
		if (api) void load();
	});
</script>

<h1 class="text-primary mb-4 text-xl font-bold">{msg.clinical_order_sets_title()}</h1>
<div class="mb-4 flex flex-wrap gap-2">
	<WashInputField className="input-sm" bind:value={name} placeholder="Order set name" />
	<WashButton
		type="button"
		className="btn-primary cursor-pointer"
		loading={isSaving}
		disabled={isSaving}
		onclick={() => void save()}
	>
		{msg.clinical_save()}
	</WashButton>
</div>
<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
	<thead><tr><th>Name</th><th>Specialty</th></tr></thead>
	<tbody>
		{#each rows as row (row.id)}
			<tr><td>{row.name}</td><td>{row.specialtyTag ?? ''}</td></tr>
		{/each}
	</tbody>
</table>
