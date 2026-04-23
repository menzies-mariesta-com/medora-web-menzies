<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { m } from '$lib/paraglide/messages';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import MedicationFrequencyBuilder from '$lib/component/own/local/private/heka/medication-order/MedicationFrequencyBuilder.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	let {
		setupSegment,
		title,
		variant = 'simple'
	}: {
		setupSegment: string;
		title: string;
		variant?: 'simple' | 'duration' | 'frequency';
	} = $props();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' && page.params.hospital_id
			? page.params.hospital_id
			: ''
	);

	type Row = Record<string, unknown>;

	let list = $state<Row[]>([]);
	let total = $state(0);
	let currentPage = $state(1);
	let pageSizeStr = $state(String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE));
	/** Per-column filter values; keys match `tableColumns` ids (server-side + MariTable) */
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
	let isLoading = $state(false);

	let modalOpen = $state(false);
	let editingId = $state<number | null>(null);
	let name = $state('');
	let description = $state('');
	let code = $state('');
	let sequenceNoStr = $state('0');
	let label = $state('');
	let kind = $state('prn');
	let config = $state<Record<string, unknown>>({});
	let summaryText = $state('');

	const tableColumns = $derived.by((): MariTableColumn<unknown>[] => {
		const idCol: MariTableColumn<unknown> = {
			id: 'id',
			header: m.id(),
			widthClass: 'w-20 min-w-[5rem] whitespace-nowrap',
			filterable: true
		};
		if (variant === 'duration') {
			return [
				idCol,
				{
					id: 'code',
					header: m.med_order_code(),
					widthClass: 'min-w-[6rem]',
					filterable: true,
					format: (_v, r) =>
						String((r as Row).code ?? '—')
				},
				{
					id: 'name',
					header: m.name(),
					widthClass: 'min-w-[10rem]',
					filterable: true,
					format: (_v, r) =>
						String((r as Row).name ?? '—')
				},
				{
					id: 'sequenceNo',
					header: m.med_order_sequence(),
					widthClass: 'w-28 min-w-[7rem]',
					filterable: true,
					format: (_v, r) =>
						String((r as Row).sequenceNo ?? '—')
				}
			];
		}
		if (variant === 'frequency') {
			return [
				idCol,
				{
					id: 'label',
					header: m.med_order_label(),
					widthClass: 'min-w-[10rem]',
					filterable: true,
					format: (_v, r) =>
						String((r as Row).label ?? '—')
				},
				{
					id: 'kind',
					header: m.med_order_kind(),
					widthClass: 'w-32 min-w-[8rem]',
					filterable: true,
					format: (_v, r) =>
						String((r as Row).kind ?? '—')
				},
				{
					id: 'summaryText',
					header: m.med_order_summary(),
					widthClass: 'min-w-[12rem] max-w-md',
					filterable: true,
					cellClass: 'max-w-md truncate',
					format: (_v, r) => {
						const t = (r as Row).summaryText as string | null | undefined;
						return t != null && t !== '' ? t : '—';
					}
				}
			];
		}
		return [
			idCol,
			{
				id: 'name',
				header: m.name(),
				widthClass: 'min-w-[10rem]',
				filterable: true,
				format: (_v, r) => String((r as Row).name ?? '—')
			},
			{
				id: 'description',
				header: m.med_order_description(),
				widthClass: 'min-w-[12rem] max-w-lg',
				filterable: true,
				cellClass: 'max-w-lg truncate',
				format: (_v, r) => {
					const d = (r as Row).description as string | null | undefined;
					return d != null && d !== '' ? d : '—';
				}
			}
		];
	});

	function apiBase() {
		return `/api/heka/hospital/${hospitalId}/home/administration/medication-order-setup/${setupSegment}`;
	}

	async function load() {
		isLoading = true;
		try {
			const url = new URL(apiBase(), window.location.origin);
			url.searchParams.set('page', String(currentPage));
			const ps = Number(pageSizeStr) || 10;
			url.searchParams.set('pageSize', String(ps));
			for (const [k, v] of Object.entries(tableFilters)) {
				const t = v?.trim();
				if (t) url.searchParams.set(k, t);
			}
			const res = await fetch(url, { credentials: 'include' });
			if (!res.ok) throw new Error(await res.text());
			const pack = (await res.json()) as {
				data: Row[];
				total: number;
				totalPages: number;
			};
			list = pack.data ?? [];
			total = pack.total ?? 0;
		} finally {
			isLoading = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		load();
	});

	function openCreate() {
		editingId = null;
		name = '';
		description = '';
		code = '';
		sequenceNoStr = '0';
		label = '';
		kind = 'prn';
		config = {};
		summaryText = '';
		modalOpen = true;
	}

	function openEdit(row: Row) {
		editingId = Number(row.id);
		name = String(row.name ?? '');
		description = String(row.description ?? '');
		code = String(row.code ?? '');
		sequenceNoStr = String(row.sequenceNo ?? 0);
		label = String(row.label ?? '');
		kind = String(row.kind ?? 'prn');
		config =
			row.config && typeof row.config === 'object'
				? (row.config as Record<string, unknown>)
				: {};
		summaryText = String(
			(row as { summaryText?: string }).summaryText ?? ''
		);
		modalOpen = true;
	}

	async function save() {
		if (!hospitalId) return;
		const body: Record<string, unknown> = {};
		if (variant === 'duration') {
			body.code = code.trim();
			body.name = name.trim();
			body.sequenceNo = Number(sequenceNoStr) || 0;
		} else if (variant === 'frequency') {
			body.label = label.trim();
			body.kind = kind;
			body.config = config;
			body.summaryText = summaryText.trim() || null;
		} else {
			body.name = name.trim();
			body.description = description.trim() || null;
		}
		try {
			if (editingId == null) {
				const res = await fetch(apiBase(), {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(body)
				});
				if (!res.ok) throw new Error(await res.text());
				toastService.addToast(m.med_order_saved(), StatusColorEnum.SUCCESS);
			} else {
				const res = await fetch(apiBase(), {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ id: editingId, ...body })
				});
				if (!res.ok) throw new Error(await res.text());
				toastService.addToast(m.med_order_updated(), StatusColorEnum.SUCCESS);
			}
			modalOpen = false;
			await load();
		} catch (e) {
			toastService.addErrorToast(m.med_order_save_failed(), e);
		}
	}

	async function remove(id: number) {
		const r = await dialogService.open({
			title: m.med_order_delete_title(),
			message: m.med_order_delete_confirm(),
			variant: DialogVariantEnum.CONFIRM
		});
		if (!r.confirmed) return;
		try {
			const res = await fetch(
				`${apiBase()}?id=${encodeURIComponent(String(id))}`,
				{ method: 'DELETE', credentials: 'include' }
			);
			if (!res.ok) throw new Error(await res.text());
			toastService.addToast(m.med_order_deleted(), StatusColorEnum.SUCCESS);
			await load();
		} catch (e) {
			toastService.addErrorToast(m.med_order_delete_failed(), e);
		}
	}
</script>

<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
	<h1 class="text-lg font-semibold">{title}</h1>
	<DaisyUiButton className="d-btn d-btn-primary d-btn-sm" onClick={openCreate}>
		<LucidePlus className="size-4" />
		{m.med_order_add()}
	</DaisyUiButton>
</div>

<DaisyUiCard>
	<DaisyUiCardBody className="flex flex-col gap-0 p-0">
		<div class="{TableEnum.HEIGHT} min-h-0 overflow-hidden">
			<MariTable
				rows={list}
				columns={tableColumns}
				{isLoading}
				bind:pageSize={pageSizeStr}
				bind:currentPage
				totalRowCount={total}
				useRemoteFilters={true}
				showRefreshButton={true}
				refreshTooltip={m.refresh_data()}
				emptyMessage={m.med_order_list_empty()}
				showRowActions={true}
				actionsVariant="none"
				actionsHeader={m.actions()}
				enableColumnFilters={true}
				on:refresh={load}
				on:pageSizeChange={() => {
					currentPage = 1;
					load();
				}}
				on:pageChange={load}
				on:filtersChange={(e) => {
					tableFilters = e.detail.filters;
					currentPage = 1;
					if (filterDebounceTimeout) {
						clearTimeout(filterDebounceTimeout);
					}
					filterDebounceTimeout = setTimeout(() => {
						load();
					}, 350);
				}}
			>
				{#snippet rowActions(row)}
					<div class="flex items-center justify-end gap-1">
						<DaisyUiTooltip
							tooltipText={m.edit_data()}
							className="d-tooltip-accent d-tooltip-right"
						>
							<DaisyUiButton
								className="d-btn-ghost d-btn-xs d-btn-square d-btn-success"
								onClick={() => openEdit(row as Row)}
							>
								<LucidePencil className="size-4" />
							</DaisyUiButton>
						</DaisyUiTooltip>
						<DaisyUiTooltip
							tooltipText={m.delete_data()}
							className="d-tooltip-error d-tooltip-right"
						>
							<DaisyUiButton
								className="d-btn-ghost d-btn-xs d-btn-square d-btn-error"
								onClick={() => remove(Number((row as Row).id))}
							>
								<LucideTrash2 className="size-4" />
							</DaisyUiButton>
						</DaisyUiTooltip>
					</div>
				{/snippet}
			</MariTable>
		</div>
	</DaisyUiCardBody>
</DaisyUiCard>

{#if modalOpen}
	<dialog class="d-modal d-modal-open" open>
		<div class="d-modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
			<h3 class="d-modal-title text-lg font-semibold">
				{editingId == null ? m.med_order_add() : m.med_order_edit()}
			</h3>
			<div class="flex flex-col gap-3 py-2">
				{#if variant === 'duration'}
					<div class="flex flex-col gap-1">
						<span class="text-sm font-medium">{m.med_order_code()}</span>
						<DaisyUiInputField
							nameText="med-order-code"
							bind:value={code}
							minLength={0}
							maxlength={64}
						/>
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-sm font-medium">{m.name()}</span>
						<DaisyUiInputField
							nameText="med-order-name"
							bind:value={name}
							minLength={0}
							maxlength={512}
						/>
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-sm font-medium">{m.med_order_sequence()}</span>
						<DaisyUiInputField
							nameText="med-order-sequence"
							inputType="number"
							bind:value={sequenceNoStr}
							min="0"
							maxlength={10}
						/>
					</div>
				{:else if variant === 'frequency'}
					<div class="flex flex-col gap-1">
						<span class="text-sm font-medium">{m.med_order_label()}</span>
						<DaisyUiInputField
							nameText="med-order-freq-label"
							bind:value={label}
							minLength={0}
							maxlength={512}
						/>
					</div>
					{#key editingId}
						<MedicationFrequencyBuilder bind:kind bind:config bind:summaryText />
					{/key}
				{:else}
					<div class="flex flex-col gap-1">
						<span class="text-sm font-medium">{m.name()}</span>
						<DaisyUiInputField
							nameText="med-order-name"
							bind:value={name}
							minLength={0}
							maxlength={512}
						/>
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-sm font-medium">{m.med_order_description()}</span>
						<DaisyUiInputField
							nameText="med-order-desc"
							bind:value={description}
							minLength={0}
							maxlength={2000}
						/>
					</div>
				{/if}
			</div>
			<div class="d-modal-action">
				<button
					type="button"
					class="d-btn"
					onclick={() => (modalOpen = false)}>{m.cancel()}</button
				>
				<button type="button" class="d-btn d-btn-primary" onclick={save}>
					{m.save()}
				</button>
			</div>
		</div>
		<button
			type="button"
			class="d-modal-backdrop"
			aria-label={m.med_order_dialog_close_aria()}
			onclick={() => (modalOpen = false)}
		></button>
	</dialog>
{/if}
