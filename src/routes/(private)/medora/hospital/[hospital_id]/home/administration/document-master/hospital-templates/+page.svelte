<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialog from '$lib/component/wash/dialog/WashDialog.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import type { DocumentCatalogListRow } from '$lib/model/type/medora/document-catalog.type';
	import { DocumentCatalogLocaleEnum } from '$lib/model/enum/document-catalog.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/document-master/hospital-templates`
			: ''
	);

	let rows = $state<DocumentCatalogListRow[]>([]);
	let locale = $state(DocumentCatalogLocaleEnum.EN);
	let busy = $state(false);
	let enableTarget = $state<DocumentCatalogListRow | null>(null);
	let legalAck = $state(false);
	let toast = $state<{ kind: 'success' | 'error'; text: string } | null>(null);

	async function load() {
		if (!api) return;
		const res = await fetch(api);
		if (!res.ok) await throwUserFacingHttpError(res);
		const data = (await res.json()) as { rows: DocumentCatalogListRow[] };
		rows = data.rows;
	}

	async function enable(row: DocumentCatalogListRow) {
		if (!legalAck) return;
		busy = true;
		try {
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action: 'enable',
					catalogCode: row.catalogCode,
					locale
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			enableTarget = null;
			legalAck = false;
			toast = { kind: 'success', text: msg.document_catalog_enable_success() };
			await load();
		} finally {
			busy = false;
		}
	}

	async function disable(row: DocumentCatalogListRow) {
		busy = true;
		try {
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: 'disable', catalogCode: row.catalogCode })
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toast = { kind: 'success', text: msg.document_catalog_disable_success() };
			await load();
		} finally {
			busy = false;
		}
	}

	lifeCycle.onMount(() => void load());
</script>

<svelte:head><title>{msg.document_catalog_hospital_access_title()}</title></svelte:head>

<div class="flex flex-col gap-3 p-2">
	<h1 class="text-primary text-xl font-bold">{msg.document_catalog_hospital_access_title()}</h1>
	<p class="text-sm text-base-content/70">{msg.document_catalog_hospital_access_hint()}</p>
	<div class="alert alert-warning text-sm">{msg.document_catalog_legal_review_banner()}</div>
	<select class="select select-bordered select-sm w-fit" bind:value={locale}>
		<option value={DocumentCatalogLocaleEnum.EN}>English</option>
		<option value={DocumentCatalogLocaleEnum.MY}>Myanmar (stub)</option>
	</select>
	<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
		<thead>
			<tr>
				<th>Actions</th>
				<th>{msg.document_catalog_col_title()}</th>
				<th>{msg.document_catalog_col_category()}</th>
				<th>{msg.document_catalog_col_status()}</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.catalogCode)}
				<tr>
					<td>
						{#if row.isEnabledForHospital}
							<WashButton
								type="button"
								className="btn-error btn-xs cursor-pointer"
								loading={busy}
								disabled={busy}
								onClick={() => void disable(row)}
							>
								{msg.document_catalog_disable()}
							</WashButton>
						{:else}
							<WashButton
								type="button"
								className="btn-primary btn-xs cursor-pointer"
								onClick={() => {
									enableTarget = row;
									legalAck = false;
								}}
							>
								{msg.document_catalog_enable()}
							</WashButton>
						{/if}
					</td>
					<td>{row.title}</td>
					<td>{row.category}</td>
					<td>
						{#if row.isEnabledForHospital}
							<span class="badge badge-success badge-sm">Enabled</span>
						{:else}
							<span class="badge badge-ghost badge-sm">Off</span>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if enableTarget}
	<WashDialog
		open={true}
		onClose={() => {
			if (!busy) enableTarget = null;
		}}
		title={msg.document_catalog_enable()}
		boxClassName="max-w-md"
		showActions={false}
	>
		<p class="text-sm">{enableTarget.title}</p>
		<label class="mt-3 flex cursor-pointer items-center gap-2">
			<input type="checkbox" class="checkbox checkbox-sm" bind:checked={legalAck} />
			<span class="text-sm">{msg.document_catalog_legal_ack()}</span>
		</label>
		<WashDialogFooter>
			<WashButton
				type="button"
				className="btn-ghost cursor-pointer"
				disabled={busy}
				onClick={() => (enableTarget = null)}
			>
				Cancel
			</WashButton>
			<WashButton
				type="button"
				className="btn-primary cursor-pointer"
				loading={busy}
				disabled={busy || !legalAck}
				onClick={() => enableTarget && void enable(enableTarget)}
			>
				{msg.document_catalog_enable()}
			</WashButton>
		</WashDialogFooter>
	</WashDialog>
{/if}

{#if toast}
	<div class="toast toast-bottom toast-end z-[100]">
		<div class="alert alert-success shadow-lg"><span>{toast.text}</span></div>
	</div>
{/if}
