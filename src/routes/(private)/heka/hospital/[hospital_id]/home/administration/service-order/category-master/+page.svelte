<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { m } from '$lib/paraglide/messages';
	import type { CategoryListRow } from '$lib/model/type/heka/ui-rows.type';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import { StatusEnum } from '$lib/model/enum/db-link';

	let { data } = $props();

	/** Categories are global (master table); no hospital/branch filter. */
	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);

	let categoryResult =
		$state<PaginatedResult<CategoryListRow> | null>(null);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const categories = $derived(categoryResult?.data ?? []);
	const total = $derived(categoryResult?.total ?? 0);

	async function fetchJson<T>(
		input: string,
		init?: RequestInit
	): Promise<T> {
		const res = await fetch(input, {
			...init,
			headers: {
				...(init?.headers ?? {}),
				'content-type': 'application/json'
			}
		});
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as T;
	}

	const categoryColumns: MariTableColumn<CategoryListRow>[] = [
		{
			id: 'id',
			header: 'No.',
			widthClass: 'w-16 min-w-[4rem]',
			filterable: false,
			format: (_value, _row, rowIndex) => {
				const pageSize = Number(pageSizeStr) || 10;
				return (currentPage - 1) * pageSize + rowIndex + 1;
			}
		},
		{
			id: 'categoryName',
			header: 'Category',
			widthClass: 'w-64 min-w-[12rem]',
			field: 'categoryName'
		},
		{
			id: 'status',
			header: m.status(),
			widthClass: 'w-32 min-w-[8rem]',
			filterType: 'select',
			filterOptions: [
				{ label: 'Active', value: String(StatusEnum.ACTIVE) },
				{ label: 'Inactive', value: String(StatusEnum.INACTIVE) }
			],
			defaultFilterValue: String(StatusEnum.ACTIVE),
			format: (_value, row) =>
				row.statusId === StatusEnum.ACTIVE ? 'Active' : 'Inactive'
		}
	];

	async function fetchCategories(forceRefresh = false) {
		void forceRefresh;
		isLoading = true;
		try {
			if (!hospitalId) return;
			const pageSize = Number(pageSizeStr) || 10;
			const parsedStatusId = tableFilters.status
				? Number(tableFilters.status)
				: undefined;
			const parsedId = tableFilters.id
				? Number(tableFilters.id)
				: undefined;
			const params = {
				page: currentPage,
				pageSize,
				id:
					parsedId != null && Number.isFinite(parsedId)
						? parsedId
						: undefined,
				categoryName: tableFilters.categoryName?.trim() || undefined,
				statusId:
					parsedStatusId != null && Number.isFinite(parsedStatusId)
						? parsedStatusId
						: undefined
			};
			const qs = new URLSearchParams();
			qs.set('page', String(params.page));
			qs.set('pageSize', String(params.pageSize));
			if (params.id != null) qs.set('id', String(params.id));
			if (params.categoryName)
				qs.set('categoryName', params.categoryName);
			if (params.statusId != null)
				qs.set('statusId', String(params.statusId));

			categoryResult = await fetchJson<
				PaginatedResult<CategoryListRow>
			>(
				`/api/heka/hospital/${hospitalId}/home/administration/service-order/category-master?${qs.toString()}`
			);
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		fetchCategories(true);
	});
</script>

<div class="space-y-6">
	<DaisyUiCard>
		<DaisyUiCardBody>
			<div class={TableEnum.HEIGHT}>
				<MariTable
					rows={categories}
					columns={categoryColumns}
					{isLoading}
					bind:pageSize={pageSizeStr}
					bind:currentPage
					totalRowCount={total}
					showRefreshButton={true}
					refreshTooltip={m.refresh_data()}
					emptyMessage="No categories."
					showRowActions={false}
					actionsVariant="none"
					enableColumnFilters={true}
					useRemoteFilters={true}
					on:refresh={() => fetchCategories(true)}
					on:pageSizeChange={() => {
						currentPage = 1;
						fetchCategories(true);
					}}
					on:pageChange={() => fetchCategories(true)}
					on:filtersChange={(event) => {
						if (filterDebounceTimeout) {
							clearTimeout(filterDebounceTimeout);
						}
						tableFilters = event.detail.filters;
						currentPage = 1;
						filterDebounceTimeout = setTimeout(() => {
							fetchCategories(true);
						}, 350);
					}}
				/>
			</div>
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>
