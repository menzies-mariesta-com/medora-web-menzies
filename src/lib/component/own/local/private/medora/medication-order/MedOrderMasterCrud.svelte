<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { m } from '$lib/paraglide/messages';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { toastError, toastLine } from '$lib/util/toast-copy.util';

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
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);

	type Row = Record<string, unknown>;

	let list = $state<Row[]>([]);
	let total = $state(0);
	let currentPage = $state(1);
	let pageSizeStr = $state(
		String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE)
	);
	/** Per-column filter values; keys match `tableColumns` ids (server-side + MariTable) */
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;
	let isLoading = $state(false);

	const statusFilterOptions = [
		{ label: m.active_label(), value: String(StatusEnum.ACTIVE) },
		{ label: m.inactive_label(), value: String(StatusEnum.INACTIVE) }
	];

	const statusDefaultFilterValue = String(StatusEnum.ACTIVE);

	const tableColumns = $derived.by((): MariTableColumn<unknown>[] => {
		if (variant === 'duration') {
			return [
				{
					id: 'statusId',
					header: m.active_label(),
					widthClass: 'w-28 min-w-[7rem] whitespace-nowrap',
					filterable: true,
					filterType: 'select',
					filterOptions: statusFilterOptions,
					defaultFilterValue: statusDefaultFilterValue,
					format: (_v, r) => renderActiveToggle(r as Row)
				},
				{
					id: 'code',
					header: m.med_order_code(),
					widthClass: 'min-w-[6rem]',
					filterable: true,
					format: (_v, r) => String((r as Row).code ?? '—')
				},
				{
					id: 'name',
					header: m.name(),
					widthClass: 'min-w-[10rem]',
					filterable: true,
					format: (_v, r) => String((r as Row).name ?? '—')
				},
				{
					id: 'sequenceNo',
					header: m.med_order_sequence(),
					widthClass: 'w-28 min-w-[7rem]',
					filterable: true,
					format: (_v, r) => String((r as Row).sequenceNo ?? '—')
				}
			];
		}
		if (variant === 'frequency') {
			return [
				{
					id: 'statusId',
					header: m.active_label(),
					widthClass: 'w-28 min-w-[7rem] whitespace-nowrap',
					filterable: true,
					filterType: 'select',
					filterOptions: statusFilterOptions,
					defaultFilterValue: statusDefaultFilterValue,
					format: (_v, r) => renderActiveToggle(r as Row)
				},
				{
					id: 'label',
					header: m.med_order_label(),
					widthClass: 'min-w-[10rem]',
					filterable: true,
					format: (_v, r) => String((r as Row).label ?? '—')
				},
				{
					id: 'abbreviation',
					header: m.med_order_code(),
					widthClass: 'w-32 min-w-[8rem]',
					filterable: false,
					format: (_v, r) => String((r as Row).abbreviation ?? '—')
				},
				{
					id: 'kind',
					header: m.med_order_kind(),
					widthClass: 'w-32 min-w-[8rem]',
					filterable: true,
					format: (_v, r) => String((r as Row).kind ?? '—')
				},
				{
					id: 'summaryText',
					header: m.med_order_summary(),
					widthClass: 'min-w-[12rem] max-w-md',
					filterable: true,
					cellClass: 'max-w-md truncate',
					format: (_v, r) => {
						const t = (r as Row).summaryText as
							| string
							| null
							| undefined;
						return t != null && t !== '' ? t : '—';
					}
				}
			];
		}
		return [
			{
				id: 'statusId',
				header: m.active_label(),
				widthClass: 'w-28 min-w-[7rem] whitespace-nowrap',
				filterable: true,
				filterType: 'select',
				filterOptions: statusFilterOptions,
				defaultFilterValue: statusDefaultFilterValue,
				format: (_v, r) => renderActiveToggle(r as Row)
			},
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
					const d = (r as Row).description as
						| string
						| null
						| undefined;
					return d != null && d !== '' ? d : '—';
				}
			}
		];
	});

	function apiBase() {
		return `/api/medora/hospital/${hospitalId}/home/administration/medication-order-setup/${setupSegment}`;
	}

	function isRowActive(row: Row): boolean {
		return (
			Number(row.statusId ?? StatusEnum.ACTIVE) === StatusEnum.ACTIVE
		);
	}

	async function setRowActive(row: Row, nextActive: boolean) {
		if (!hospitalId) return;
		const id = Number(row.id ?? 0);
		if (!Number.isFinite(id) || id <= 0) return;
		const statusId = nextActive
			? StatusEnum.ACTIVE
			: StatusEnum.INACTIVE;
		try {
			const res = await fetch(apiBase(), {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ id, statusId })
			});
			if (!res.ok) throw new Error(await res.text());
			// Keep UI consistent with server response
			list = list.map((r) =>
				Number(r.id) === id ? { ...r, statusId } : r
			);
			toastService.addToast(
				toastLine(title, m.toast_action_updated()),
				StatusColorEnum.SUCCESS
			);
		} catch (e) {
			toastError(
				toastService,
				title,
				m.toast_action_updated_failed(),
				e
			);
		}
	}

	function renderActiveToggle(row: Row) {
		const checked = isRowActive(row);
		// MariTable column format expects string/unknown; return a small HTML snippet via svelte isn't possible.
		// We instead show Active/Inactive label here; toggle is provided via rowActions below.
		return checked ? m.active_label() : m.inactive_label();
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
</script>

<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
	<h1 class="text-lg font-semibold">{title}</h1>
</div>

<WashCard>
	<WashCardBody className="flex flex-col gap-0 p-0">
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
					<label
						class="flex cursor-pointer items-center justify-end gap-2"
					>
						<input
							type="checkbox"
							class="toggle shrink-0 appearance-none toggle-primary toggle-sm"
							checked={isRowActive(row as Row)}
							on:change={(e) =>
								setRowActive(
									row as Row,
									(e.currentTarget as HTMLInputElement).checked
								)}
						/>
					</label>
				{/snippet}
			</MariTable>
		</div>
	</WashCardBody>
</WashCard>
