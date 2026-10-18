<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import { LabSectionEnum } from '$lib/model/enum/diagnostics.enum';
	import type { LabTestRow } from '$lib/model/type/medora/diagnostics.type';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const api = $derived(
		hospitalId ? `/api/medora/hospital/${hospitalId}/home/diagnostics/lab/catalog` : ''
	);
	let tests = $state<LabTestRow[]>([]);
	let services = $state<{ id: number; serviceName: string | null }[]>([]);
	let code = $state('');
	let name = $state('');
	let section = $state(LabSectionEnum.CHEMISTRY);
	let mapServiceId = $state('');
	let mapTargetId = $state('');
	let busy = $state(false);

	async function load() {
		if (!api) return;
		const [t, s] = await Promise.all([
			fetch(api).then((r) => r.json()),
			fetch(`${api}?mode=services`).then((r) => r.json())
		]);
		tests = t as LabTestRow[];
		services = s as { id: number; serviceName: string | null }[];
	}

	async function saveTest() {
		busy = true;
		try {
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: 'saveTest', code, name, section })
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			code = '';
			name = '';
			await load();
		} finally {
			busy = false;
		}
	}

	async function saveMap() {
		if (!mapServiceId || !mapTargetId) return;
		busy = true;
		try {
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action: 'saveServiceMap',
					serviceItemId: Number(mapServiceId),
					targetType: 'test',
					targetId: Number(mapTargetId)
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			mapServiceId = '';
			mapTargetId = '';
		} finally {
			busy = false;
		}
	}

	lifeCycle.onMount(() => void load());
</script>

<svelte:head><title>{msg.diagnostics_catalog_title()}</title></svelte:head>

<div class="flex flex-col gap-6 p-4">
	<h1 class="text-primary text-xl font-bold">{msg.diagnostics_catalog_title()}</h1>

	<section class="card border border-base-300">
		<div class="card-body gap-3">
			<h2 class="card-title text-primary font-bold">{msg.diagnostics_save_test()}</h2>
			<div class="grid gap-2 md:grid-cols-3">
				<WashInputField bind:value={code} inputPlaceholderText="Code" />
				<WashInputField bind:value={name} inputPlaceholderText="Name" />
				<select class="select select-bordered" bind:value={section}>
					<option value={LabSectionEnum.HEMATOLOGY}>Hematology</option>
					<option value={LabSectionEnum.CHEMISTRY}>Chemistry</option>
					<option value={LabSectionEnum.MICROBIOLOGY}>Microbiology</option>
				</select>
			</div>
			<WashButton
				type="button"
				className="btn-primary cursor-pointer self-end"
				loading={busy}
				disabled={busy || !code.trim() || !name.trim()}
				onClick={() => void saveTest()}
			>
				{msg.diagnostics_save_test()}
			</WashButton>
		</div>
	</section>

	<section class="card border border-base-300">
		<div class="card-body gap-3">
			<h2 class="card-title text-secondary font-bold">{msg.diagnostics_map_service()}</h2>
			<div class="grid gap-2 md:grid-cols-2">
				<select class="select select-bordered" bind:value={mapServiceId}>
					<option value="">Service item</option>
					{#each services as s (s.id)}
						<option value={String(s.id)}>{s.serviceName}</option>
					{/each}
				</select>
				<select class="select select-bordered" bind:value={mapTargetId}>
					<option value="">Lab test</option>
					{#each tests as t (t.id)}
						<option value={String(t.id)}>{t.code} – {t.name}</option>
					{/each}
				</select>
			</div>
			<WashButton
				type="button"
				className="btn-secondary cursor-pointer self-end"
				loading={busy}
				disabled={busy}
				onClick={() => void saveMap()}
			>
				{msg.diagnostics_save_map()}
			</WashButton>
		</div>
	</section>

	<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
		<thead>
			<tr>
				<th>Code</th>
				<th>Name</th>
				<th>Section</th>
			</tr>
		</thead>
		<tbody>
			{#each tests as t (t.id)}
				<tr>
					<td>{t.code}</td>
					<td>{t.name}</td>
					<td>{t.section}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
