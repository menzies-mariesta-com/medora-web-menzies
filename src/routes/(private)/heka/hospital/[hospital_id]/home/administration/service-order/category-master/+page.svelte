<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { m } from '$lib/paraglide/messages';
	import {
		getCategoryPaginated,
		type CategorySchema
	} from '$lib/remote/table/information-table/category.remote';
	import type { PaginatedResult } from '$lib/remote/table/pagination-type';
	import { StatusEnum } from '$lib/model/enum/db-link';

	let { data } = $props();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);

	/** User's current branch from layout; "__all__" means show all branches. */
	const selectedBranchId = $derived(data?.selectedBranchId ?? null);
	const branchIdForCategory = $derived(
		selectedBranchId && selectedBranchId !== '__all__'
			? selectedBranchId
			: null
	);

	let categoryResult = $state<PaginatedResult<CategorySchema> | null>(null);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);

	const categories = $derived(categoryResult?.data ?? []);
	const total = $derived(categoryResult?.total ?? 0);

	const categoryColumns: MariTableColumn<CategorySchema>[] = [
		{
			id: 'id',
			header: m.id(),
			widthClass: 'w-16 min-w-[4rem]',
			filterable: false
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
			format: (_value, row) =>
				row.statusId === StatusEnum.ACTIVE ? 'Active' : 'Inactive'
		}
	];

	async function fetchCategories(forceRefresh = false) {
		isLoading = true;
		try {
			const pageSize = Number(pageSizeStr) || 10;
			const params = {
				page: currentPage,
				pageSize,
				hospitalId: hospitalId || undefined,
				branchId: branchIdForCategory ?? undefined
			};
			if (forceRefresh) {
				await getCategoryPaginated(params).refresh();
			}
			categoryResult = await getCategoryPaginated(params);
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		const _hospital = hospitalId;
		const _branch = selectedBranchId;
		if (!_hospital) return;
		fetchCategories(true);
	});
</script>

<div class="space-y-6">
	<DaisyUiCard>
		<DaisyUiCardBody>
			{#if isLoading && categories.length === 0}
				<DaisyUiLoading className="py-8" />
			{:else}
				<div class="{TableEnum.HEIGHT}">
					<MariTable
						rows={categories}
						columns={categoryColumns}
						isLoading={isLoading}
						bind:pageSize={pageSizeStr}
						bind:currentPage={currentPage}
						totalRowCount={total}
						showRefreshButton={true}
						refreshTooltip={m.refresh_data()}
						emptyMessage="No categories for this branch."
						showRowActions={false}
						actionsVariant="none"
						enableColumnFilters={true}
						useRemoteFilters={false}
						on:refresh={() => fetchCategories(true)}
						on:pageSizeChange={() => {
							currentPage = 1;
							fetchCategories(true);
						}}
						on:pageChange={() => fetchCategories(true)}
					/>
				</div>
			{/if}
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>
