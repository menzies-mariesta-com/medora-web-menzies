<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const accessionId = $derived(Number(page.url.searchParams.get('accessionId') ?? 0));
	const api = $derived(
		hospitalId ? `/api/medora/hospital/${hospitalId}/home/diagnostics/lab/results` : ''
	);

	type Line = {
		testId: number;
		testCode: string;
		testName: string;
		valueNumeric: string | null;
		valueText: string | null;
	};

	let lines = $state<Line[]>([]);
	let accessionNo = $state('');
	let busy = $state(false);

	async function load() {
		if (!api || !accessionId) return;
		const res = await fetch(`${api}?accessionId=${accessionId}`);
		if (!res.ok) await throwUserFacingHttpError(res);
		const data = (await res.json()) as {
			accession: { accessionNo: string };
			lines: Line[];
		};
		accessionNo = data.accession.accessionNo;
		lines = data.lines.map((l) => ({
			...l,
			valueNumeric: l.valueNumeric ?? '',
			valueText: l.valueText ?? ''
		}));
	}

	async function post(action: string) {
		busy = true;
		try {
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action,
					accessionId,
					lines: lines.map((l) => ({
						testId: l.testId,
						valueNumeric: l.valueNumeric || null,
						valueText: l.valueText || null
					}))
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			if (action === 'save') await load();
		} finally {
			busy = false;
		}
	}

	lifeCycle.onMount(() => void load());
	$effect(() => {
		void accessionId;
		void load();
	});
</script>

<svelte:head><title>{msg.diagnostics_results_entry_title()}</title></svelte:head>

<div class="flex flex-col gap-4 p-4">
	<h1 class="text-primary text-xl font-bold">{msg.diagnostics_results_entry_title()}</h1>
	{#if accessionNo}
		<p class="text-sm">{msg.diagnostics_col_accession()}: {accessionNo}</p>
	{/if}
	<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
		<thead>
			<tr>
				<th>{msg.diagnostics_col_test()}</th>
				<th>{msg.mo_clinical_result()}</th>
			</tr>
		</thead>
		<tbody>
			{#each lines as line (line.testId)}
				<tr>
					<td>{line.testName} ({line.testCode})</td>
					<td>
						<WashInputField bind:value={line.valueNumeric} inputPlaceholderText="Value" />
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
	<div class="flex flex-wrap gap-2">
		<WashButton
			type="button"
			className="btn-primary cursor-pointer"
			loading={busy}
			disabled={busy || !accessionId}
			onClick={() => void post('save')}
		>
			{msg.diagnostics_save_results()}
		</WashButton>
		<WashButton
			type="button"
			className="btn-secondary cursor-pointer"
			loading={busy}
			disabled={busy || !accessionId}
			onClick={() => void post('verify')}
		>
			{msg.diagnostics_verify()}
		</WashButton>
		<WashButton
			type="button"
			className="btn-accent cursor-pointer"
			loading={busy}
			disabled={busy || !accessionId}
			onClick={() => void post('release')}
		>
			{msg.diagnostics_release()}
		</WashButton>
	</div>
</div>
