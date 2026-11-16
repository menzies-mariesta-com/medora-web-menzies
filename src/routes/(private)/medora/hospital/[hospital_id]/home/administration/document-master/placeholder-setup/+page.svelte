<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableEditDeleteActions from '$lib/component/own/library/menzies/table/MenziesTableEditDeleteActions.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { PlaceholderRegistryEntry } from '$lib/model/constant/document-placeholder.registry';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { toastSuccess } from '$lib/util/toast-copy.util';
	import { m } from '$lib/paraglide/messages';

	const lifeCycle = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/document-master/placeholder-setup`
			: ''
	);

	type TextRow = {
		id: number;
		code: string;
		text: string;
		description: string | null;
	};

	let textRows = $state<TextRow[]>([]);
	let systemRows = $state<PlaceholderRegistryEntry[]>([]);
	let isLoading = $state(true);
	let textCurrentPage = $state(1);
	let textPageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let systemCurrentPage = $state(1);
	let systemPageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);

	let dialogOpen = $state(false);
	let editingId = $state<number | null>(null);
	let codeInput = $state('');
	let textInput = $state('');
	let descInput = $state('');
	let saving = $state(false);

	const textPageSize = $derived(
		Number(textPageSizeStr) || AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE
	);
	const pagedTextRows = $derived(
		textRows.slice(
			(textCurrentPage - 1) * textPageSize,
			textCurrentPage * textPageSize
		)
	);

	const systemPageSize = $derived(
		Number(systemPageSizeStr) || AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE
	);
	const pagedSystemRows = $derived(
		systemRows.slice(
			(systemCurrentPage - 1) * systemPageSize,
			systemCurrentPage * systemPageSize
		)
	);

	const dialogTitle = $derived(
		editingId ? 'Edit text placeholder' : 'Create text placeholder'
	);

	async function load() {
		if (!api) return;
		isLoading = true;
		try {
			const [listRes, sysRes] = await Promise.all([
				fetch(api),
				fetch(`${api}?mode=system`)
			]);
			if (!listRes.ok) await throwUserFacingHttpError(listRes);
			if (!sysRes.ok) await throwUserFacingHttpError(sysRes);
			const list = (await listRes.json()) as { rows: TextRow[] };
			const sys = (await sysRes.json()) as {
				placeholders: PlaceholderRegistryEntry[];
			};
			textRows = list.rows ?? [];
			systemRows = sys.placeholders ?? [];
		} catch (err) {
			console.error(err);
			toastService.addToast('Failed to load placeholders', StatusColorEnum.ERROR);
		} finally {
			isLoading = false;
		}
	}

	function openCreate() {
		editingId = null;
		codeInput = '';
		textInput = '';
		descInput = '';
		dialogOpen = true;
	}

	function openEdit(row: TextRow) {
		editingId = row.id;
		codeInput = row.code;
		textInput = row.text;
		descInput = row.description ?? '';
		dialogOpen = true;
	}

	function closeDialog() {
		dialogOpen = false;
		editingId = null;
	}

	async function handleSave() {
		if (!api) return;
		const code = codeInput.trim();
		const text = textInput.trim();
		if (!editingId && !code) {
			toastService.addToast('Code is required', StatusColorEnum.WARNING);
			return;
		}
		if (!text) {
			toastService.addToast('Text is required', StatusColorEnum.WARNING);
			return;
		}
		saving = true;
		try {
			if (editingId) {
				const res = await fetch(api, {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						id: editingId,
						text,
						description: descInput.trim() || null
					})
				});
				if (!res.ok) await throwUserFacingHttpError(res);
				toastSuccess(toastService, 'Text placeholder', m.toast_action_updated());
			} else {
				const res = await fetch(api, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						code,
						text,
						description: descInput.trim() || null
					})
				});
				if (!res.ok) await throwUserFacingHttpError(res);
				toastSuccess(toastService, 'Text placeholder', m.toast_action_created());
			}
			closeDialog();
			await load();
		} catch (err) {
			console.error(err);
			toastService.addToast(
				err instanceof Error ? err.message : 'Save failed',
				StatusColorEnum.ERROR
			);
		} finally {
			saving = false;
		}
	}

	async function handleDelete(id: number) {
		if (!api) return;
		const result = await dialogService.open({
			title: 'Delete text placeholder',
			message: 'Remove this placeholder from the hospital?',
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			const res = await fetch(api, {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id })
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toastSuccess(toastService, 'Text placeholder', m.toast_action_deleted());
			await load();
		} catch (err) {
			console.error(err);
			toastService.addToast('Delete failed', StatusColorEnum.ERROR);
		}
	}

	const textColumns: MenziesTableColumn<TextRow>[] = [
		{
			id: 'token',
			header: 'Token',
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (_v, row) => `{{${row.code}}}`
		},
		{
			id: 'code',
			header: 'Code',
			widthClass: 'w-32 min-w-[8rem]',
			field: 'code'
		},
		{
			id: 'text',
			header: 'Text',
			widthClass: 'min-w-[12rem]',
			field: 'text'
		},
		{
			id: 'description',
			header: 'Description',
			widthClass: 'min-w-[10rem]',
			field: 'description',
			format: (v) => (v != null && String(v).trim() ? String(v) : '—')
		}
	];

	const systemColumns: MenziesTableColumn<PlaceholderRegistryEntry>[] = [
		{
			id: 'token',
			header: 'Token',
			widthClass: 'w-44 min-w-[11rem]',
			field: 'token'
		},
		{
			id: 'category',
			header: 'Category',
			widthClass: 'w-28 min-w-[7rem]',
			field: 'category'
		},
		{
			id: 'description',
			header: 'Description',
			widthClass: 'min-w-[12rem]',
			field: 'description'
		}
	];

	lifeCycle.onMount(() => void load());
</script>

<svelte:head><title>Placeholder setup</title></svelte:head>

<div class="flex flex-col gap-6 p-2">
	<header class="flex flex-col gap-1">
		<h1 class="text-xl font-bold text-primary">Placeholder setup</h1>
		<p class="text-sm text-base-content/70">
			Text placeholders use tokens like <code class="text-xs">{'{{thank}}'}</code>
			in document HTML. Data placeholders are system-defined and read-only below.
		</p>
	</header>

	<div class="{TableEnum.HEIGHT} min-h-[16rem]">
		<MenziesTable
			title="Your text placeholders"
			wash={true}
			rows={pagedTextRows}
			columns={textColumns}
			{isLoading}
			bind:pageSize={textPageSizeStr}
			bind:currentPage={textCurrentPage}
			totalRowCount={textRows.length}
			showRefreshButton={true}
			refreshTooltip={m.refresh_data()}
			emptyMessage="No text placeholders yet"
			showRowActions={true}
			actionsHeader={m.actions()}
			showAddButton={true}
			addLabel={m.create()}
			onAdd={openCreate}
			on:refresh={() => load()}
			on:pageSizeChange={() => {
				textCurrentPage = 1;
			}}
		>
			{#snippet rowActions(row, _index)}
				{@const typedRow = row as TextRow}
				<MenziesTableEditDeleteActions
					onEdit={() => openEdit(typedRow)}
					onDelete={() => handleDelete(typedRow.id)}
					editTooltip={m.edit_data()}
					deleteTooltip={m.delete_data()}
				/>
			{/snippet}
		</MenziesTable>
	</div>

	<div class="{TableEnum.HEIGHT} min-h-[16rem]">
		<MenziesTable
			title="Data placeholders (read-only)"
			wash={true}
			rows={pagedSystemRows}
			columns={systemColumns}
			isLoading={false}
			bind:pageSize={systemPageSizeStr}
			bind:currentPage={systemCurrentPage}
			totalRowCount={systemRows.length}
			showRefreshButton={false}
			showAddButton={false}
			showRowActions={false}
			emptyMessage="No system placeholders"
			on:pageSizeChange={() => {
				systemCurrentPage = 1;
			}}
		/>
	</div>
</div>

{#if dialogOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-base-300/50 p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="placeholder-dialog-title"
	>
		<div
			class="flex w-full max-w-lg flex-col gap-4 rounded-box border border-ink-border bg-base-100 p-4 shadow-lg"
		>
			<h2 id="placeholder-dialog-title" class="text-lg font-semibold">
				{dialogTitle}
			</h2>
			<div class="flex flex-col gap-3">
				<div class="flex flex-col gap-1">
					<label for="ph-code" class="text-sm font-medium">
						Code {#if !editingId}<span class="text-error">*</span>{/if}
					</label>
					<WashInputField
						id="ph-code"
						bind:value={codeInput}
						inputPlaceholderText="thank"
						disabled={editingId != null}
					/>
					<p class="text-xs text-base-content/60">
						{editingId
							? 'Code cannot be changed after create.'
							: 'Lowercase letters, numbers, underscore (e.g. thank).'}
					</p>
				</div>
				<div class="flex flex-col gap-1">
					<label for="ph-text" class="text-sm font-medium">
						Text <span class="text-error">*</span>
					</label>
					<WashInputField
						id="ph-text"
						bind:value={textInput}
						inputPlaceholderText="Thank you for choosing our hospital."
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label for="ph-desc" class="text-sm font-medium">
						Description (optional)
					</label>
					<WashInputField id="ph-desc" bind:value={descInput} />
				</div>
			</div>
			<div class="flex justify-end gap-2">
				<WashButton variant="ghost" disabled={saving} onClick={closeDialog}>
					{m.cancel()}
				</WashButton>
				<WashButton
					variant="primary"
					loading={saving}
					disabled={saving}
					onClick={() => void handleSave()}
				>
					{editingId ? m.update() : m.create()}
				</WashButton>
			</div>
		</div>
	</div>
{/if}
