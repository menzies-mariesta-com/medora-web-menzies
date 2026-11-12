<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashSearchSelect from '$lib/component/wash/search-select/WashSearchSelect.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import type {
		BillingSetupAvailableTaggingRow,
		BillingSetupServiceTaggingLinkRow,
		CategoryListRow,
		SubCategoryListRow
	} from '$lib/model/type/medora/ui-rows.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import MenziesTableEditDeleteActions from '$lib/component/own/library/menzies/table/MenziesTableEditDeleteActions.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';
	import { formatMoneyAmount } from '$lib/util/number-display.util';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { toastSuccess } from '$lib/util/toast-copy.util';
	import { m } from '$lib/paraglide/messages';

	const toastService = new ToastService();
	const deleteLock = createActionLock();
	const linkLock = createActionLock();

	type AllowedBranch = { id: string; name: string | null };

	interface Props {
		careSetting: 'OP' | 'IP' | 'ER';
		apiSegment: 'op-billing' | 'ip-billing' | 'ed-billing';
		allowedBranches?: AllowedBranch[];
	}

	let {
		careSetting,
		apiSegment,
		allowedBranches: allowedBranchesProp = []
	}: Props = $props();

	const titleBySetting: Record<string, string> = {
		OP: 'OP Billing',
		IP: 'IP Billing',
		ER: 'ED (ER) Billing'
	};
	const pageTitle = $derived(titleBySetting[careSetting] ?? 'Billing');

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);

	const allowedBranches = $derived(allowedBranchesProp ?? []);
	const branchSelectOptions = $derived(
		allowedBranches.map((b) => ({
			value: b.id,
			label: b.name?.trim() || 'Unnamed branch'
		}))
	);

	let branchInitialized = $state(false);
	let selectedBranchId = $state('');
	$effect(() => {
		if (branchInitialized || branchSelectOptions.length === 0) return;
		selectedBranchId = branchSelectOptions[0]?.value ?? '';
		branchInitialized = true;
	});

	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/billing-setup/${apiSegment}`
			: ''
	);

	let linkResult =
		$state<PaginatedResult<BillingSetupServiceTaggingLinkRow> | null>(
			null
		);
	let availableResult =
		$state<PaginatedResult<BillingSetupAvailableTaggingRow> | null>(
			null
		);

	let linkedPage = $state(1);
	let linkedPageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let availPage = $state(1);
	let availPageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);

	let isLoadingLinks = $state(false);
	let isLoadingAvailable = $state(false);
	let deletingId = $state<number | null>(null);
	let linkingTaggingId = $state<number | null>(null);

	let availTableColumnFilters = $state<Record<string, string>>({});
	let linkedTableColumnFilters = $state<Record<string, string>>({});
	let availFilterDebounce: ReturnType<typeof setTimeout> | null = null;
	let linkedFilterDebounce: ReturnType<typeof setTimeout> | null = null;

	let categories = $state<CategoryListRow[]>([]);
	let subCategories = $state<SubCategoryListRow[]>([]);

	const categoryFilterOptions = $derived(
		categories.map((c) => ({
			label: (c.categoryName ?? '').trim() || `Category ${c.id}`,
			value: String(c.id)
		}))
	);

	function subCategoryOptionsForCategory(categoryFilterValue: string) {
		const catId = categoryFilterValue.trim();
		const list = catId
			? subCategories.filter((s) => String(s.categoryId) === catId)
			: subCategories;
		return list.map((s) => ({
			label: (s.subCategoryName ?? '').trim() || `Sub category ${s.id}`,
			value: String(s.id)
		}));
	}

	const availSubCategoryFilterOptions = $derived(
		subCategoryOptionsForCategory(availTableColumnFilters.category ?? '')
	);
	const linkedSubCategoryFilterOptions = $derived(
		subCategoryOptionsForCategory(linkedTableColumnFilters.category ?? '')
	);
	const linkedTotal = $derived(linkResult?.total ?? 0);
	const availableRows = $derived(availableResult?.data ?? []);
	const availableTotal = $derived(availableResult?.total ?? 0);

	function displayName(value: string | null | undefined, fallback: string) {
		const v = (value ?? '').trim();
		return v || fallback;
	}

	const categorySubServiceColumns = <
		TRow extends {
			categoryName: string | null;
			subCategoryName: string | null;
			serviceName: string | null;
		}
	>(
		subCategorySelectOptions: { label: string; value: string }[]
	): MenziesTableColumn<TRow>[] => [
		{
			id: 'category',
			header: 'Category',
			widthClass: 'w-44',
			filterType: 'select',
			filterOptions: categoryFilterOptions,
			filterable: true,
			format: (_v, row) => displayName(row.categoryName, '—')
		},
		{
			id: 'subCategory',
			header: 'Sub category',
			widthClass: 'w-48',
			filterType: 'select',
			filterOptions: subCategorySelectOptions,
			filterable: true,
			format: (_v, row) => displayName(row.subCategoryName, '—')
		},
		{
			id: 'serviceName',
			header: 'Service item',
			widthClass: 'w-56',
			filterable: true,
			format: (_v, row) => displayName(row.serviceName, '—')
		}
	];

	const amountDisplayColumns = <
		TRow extends {
			validDate: string | null;
			serviceAmount: string | null;
			serviceTaxAmount: string | null;
		}
	>(): MenziesTableColumn<TRow>[] => [
		{
			id: 'validDate',
			header: 'Valid date',
			widthClass: 'w-32',
			filterable: false,
			format: (_v, row) => row.validDate ?? '—'
		},
		{
			id: 'serviceAmount',
			header: 'Amount',
			widthClass: 'w-28',
			filterable: false,
			format: (_v, row) => formatMoneyAmount(row.serviceAmount)
		},
		{
			id: 'serviceTaxAmount',
			header: 'Tax',
			widthClass: 'w-28',
			filterable: false,
			format: (_v, row) => formatMoneyAmount(row.serviceTaxAmount)
		}
	];

	const availableColumns = $derived.by(
		(): MenziesTableColumn<BillingSetupAvailableTaggingRow>[] => [
			{
				id: 'taggingId',
				header: 'Tagging ID',
				widthClass: 'w-24',
				filterable: true,
				format: (_v, row) => String(row.id)
			},
			...categorySubServiceColumns<BillingSetupAvailableTaggingRow>(
				availSubCategoryFilterOptions
			),
			...amountDisplayColumns<BillingSetupAvailableTaggingRow>()
		]
	);

	const links = $derived(linkResult?.data ?? []);

	const linkedColumns = $derived.by(
		(): MenziesTableColumn<BillingSetupServiceTaggingLinkRow>[] => [
			{
				id: 'taggingId',
				header: 'Tagging ID',
				widthClass: 'w-24',
				filterable: true,
				format: (_v, row) => String(row.serviceTaggingId)
			},
			...categorySubServiceColumns<BillingSetupServiceTaggingLinkRow>(
				linkedSubCategoryFilterOptions
			),
			...amountDisplayColumns<BillingSetupServiceTaggingLinkRow>()
		]
	);

	function appendFilterQueryParams(
		qs: URLSearchParams,
		filters: Record<string, string>
	) {
		const taggingId = filters.taggingId?.trim();
		if (taggingId) qs.set('taggingId', taggingId);
		const category = filters.category?.trim();
		if (category) qs.set('categoryId', category);
		const subCategory = filters.subCategory?.trim();
		if (subCategory) qs.set('subCategoryId', subCategory);
		const service = filters.serviceName?.trim();
		if (service) qs.set('serviceName', service);
	}

	function handleAvailFiltersChange(
		event: CustomEvent<{ filters: Record<string, string> }>
	) {
		if (availFilterDebounce) clearTimeout(availFilterDebounce);
		const next = { ...event.detail.filters };
		if (next.category !== availTableColumnFilters.category) {
			next.subCategory = '';
		}
		availTableColumnFilters = next;
		availPage = 1;
		availFilterDebounce = setTimeout(() => {
			void loadAvailable();
		}, 350);
	}

	function handleLinkedFiltersChange(
		event: CustomEvent<{ filters: Record<string, string> }>
	) {
		if (linkedFilterDebounce) clearTimeout(linkedFilterDebounce);
		const next = { ...event.detail.filters };
		if (next.category !== linkedTableColumnFilters.category) {
			next.subCategory = '';
		}
		linkedTableColumnFilters = next;
		linkedPage = 1;
		linkedFilterDebounce = setTimeout(() => {
			void loadLinked();
		}, 350);
	}

	async function loadFilterMasters() {
		if (!hospitalId) return;
		try {
			const [cats, subs] = await Promise.all([
				fetchJson<CategoryListRow[]>(
					`/api/medora/hospital/${hospitalId}/home/administration/service-order/category-master?mode=all&statusId=${StatusEnum.ACTIVE}`
				),
				fetchJson<SubCategoryListRow[]>(
					`/api/medora/hospital/${hospitalId}/home/administration/service-order/sub-category-master?mode=all`
				)
			]);
			categories = cats.filter((c) => c.statusId === StatusEnum.ACTIVE);
			subCategories = subs.filter(
				(s) => s.statusId === StatusEnum.ACTIVE
			);
		} catch {
			categories = [];
			subCategories = [];
		}
	}

	async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
		const res = await fetch(url, {
			...init,
			headers: {
				'Content-Type': 'application/json',
				...(init?.headers ?? {})
			}
		});
		if (!res.ok) await throwUserFacingHttpError(res);
		return (await res.json()) as T;
	}

	async function loadLinked() {
		if (!apiBase || !selectedBranchId) {
			linkResult = null;
			return;
		}
		isLoadingLinks = true;
		try {
			const qs = new URLSearchParams({
				page: String(linkedPage),
				pageSize: linkedPageSizeStr,
				branchId: selectedBranchId
			});
			appendFilterQueryParams(qs, linkedTableColumnFilters);
			linkResult = await fetchJson<
				PaginatedResult<BillingSetupServiceTaggingLinkRow>
			>(`${apiBase}?${qs.toString()}`);
		} finally {
			isLoadingLinks = false;
		}
	}

	async function loadAvailable() {
		if (!apiBase || !selectedBranchId) {
			availableResult = null;
			return;
		}
		isLoadingAvailable = true;
		try {
			const qs = new URLSearchParams({
				mode: 'available',
				page: String(availPage),
				pageSize: availPageSizeStr,
				branchId: selectedBranchId
			});
			appendFilterQueryParams(qs, availTableColumnFilters);
			availableResult = await fetchJson<
				PaginatedResult<BillingSetupAvailableTaggingRow>
			>(`${apiBase}?${qs.toString()}`);
		} finally {
			isLoadingAvailable = false;
		}
	}

	async function reloadAll() {
		await Promise.all([loadAvailable(), loadLinked()]);
	}

	function onBranchChange() {
		linkedPage = 1;
		availPage = 1;
		void reloadAll();
	}

	async function linkOne(row: BillingSetupAvailableTaggingRow) {
		await linkLock.run(async () => {
			linkingTaggingId = row.id;
			try {
				await fetchJson(apiBase, {
					method: 'POST',
					body: JSON.stringify({ serviceTaggingIds: [row.id] })
				});
				toastSuccess(
					toastService,
					m.entity_service_item_tagging(),
					m.toast_action_updated()
				);
				await reloadAll();
			} catch (err) {
				const msg =
					err instanceof Error ? err.message : 'Failed to link tagging.';
				toastService.addToast(msg, StatusColorEnum.ERROR);
			} finally {
				linkingTaggingId = null;
			}
		});
	}

	async function handleUnlink(row: BillingSetupServiceTaggingLinkRow) {
		await deleteLock.run(async () => {
			deletingId = row.id;
			try {
				const result = await dialogService.open({
					title: 'Remove link',
					message:
						'Stop auto-adding this service item tagging when visits are completed?',
					variant: DialogVariantEnum.CONFIRM
				});
				if (!result.confirmed) return;

				await fetchJson(apiBase, {
					method: 'DELETE',
					body: JSON.stringify({ id: row.id })
				});
				toastSuccess(
					toastService,
					m.entity_service_item_tagging(),
					m.toast_action_deleted()
				);
				await reloadAll();
			} finally {
				deletingId = null;
			}
		});
	}

	$effect(() => {
		if (!hospitalId || !selectedBranchId) return;
		void reloadAll();
	});

	$effect(() => {
		if (!hospitalId) return;
		void loadFilterMasters();
	});
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-xl font-bold">{pageTitle}</h1>
		<p class="text-sm opacity-80">
			Choose a branch, then link service item taggings one at a time. Linked
			taggings are added to the open bill (op_billing / ip_billing lines) when you
			load the Bill page for a visit — not as CPOE service orders. Clinical order
			lines stay separate. Amounts come from Service Order → Service Item Tagging.
		</p>
	</div>

	{#if allowedBranches.length === 0}
		<p class="text-sm text-warning">No branches available for this user.</p>
	{:else}
		<WashCard>
			<WashCardBody className="flex flex-col gap-4">
				<div class="flex max-w-md flex-col gap-1">
					<label class="text-sm font-medium" for="billing-setup-branch">
						Branch
					</label>
					<WashSearchSelect
						inputId="billing-setup-branch"
						bind:value={selectedBranchId}
						options={branchSelectOptions}
						placeholder="Select branch"
						className="w-full"
						onChange={onBranchChange}
					/>
				</div>

				<div class={TableEnum.HEIGHT_SMALL}>
					<MenziesTable
						title="Service item taggings (available to link)"
						rows={availableRows}
						columns={availableColumns}
						isLoading={isLoadingAvailable}
						bind:pageSize={availPageSizeStr}
						bind:currentPage={availPage}
						totalRowCount={availableTotal}
						showRefreshButton={true}
						emptyMessage="No taggings to link for this branch."
						enableColumnFilters={true}
						showRowActions={true}
						actionsHeader={m.actions()}
						actionsVariant="none"
						on:refresh={() => void loadAvailable()}
						on:pageSizeChange={() => {
							availPage = 1;
							void loadAvailable();
						}}
						on:pageChange={() => void loadAvailable()}
						on:filtersChange={handleAvailFiltersChange}
					>
						{#snippet rowActions(row)}
							{@const availRow = row as BillingSetupAvailableTaggingRow}
							<WashButton
								type="button"
								className="btn-primary btn-xs"
								disabled={linkLock.pending}
								onClick={() => void linkOne(availRow)}
							>
								{linkingTaggingId === availRow.id ? 'Linking…' : 'Link'}
							</WashButton>
						{/snippet}
					</MenziesTable>
				</div>

				<div class={TableEnum.HEIGHT}>
					<MenziesTable
						title="Linked for auto billing"
						rows={links}
						columns={linkedColumns}
						isLoading={isLoadingLinks}
						bind:pageSize={linkedPageSizeStr}
						bind:currentPage={linkedPage}
						totalRowCount={linkedTotal}
						showRefreshButton={true}
						emptyMessage="No taggings linked yet for this branch."
						enableColumnFilters={true}
						showRowActions={true}
						actionsVariant="none"
						on:refresh={() => void loadLinked()}
						on:pageSizeChange={() => {
							linkedPage = 1;
							void loadLinked();
						}}
						on:pageChange={() => void loadLinked()}
						on:filtersChange={handleLinkedFiltersChange}
					>
						{#snippet rowActions(row)}
							{@const linkRow = row as BillingSetupServiceTaggingLinkRow}
							<MenziesTableEditDeleteActions
								onEdit={() => {}}
								editDisabled={true}
								onDelete={() => handleUnlink(linkRow)}
								disabled={deleteLock.pending}
								deleteLoading={deletingId === linkRow.id}
							/>
						{/snippet}
					</MenziesTable>
				</div>
			</WashCardBody>
		</WashCard>
	{/if}
</div>
