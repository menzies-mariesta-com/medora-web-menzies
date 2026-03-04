<script lang="ts">
	import DaisyUiTable from '$lib/component/library/daisyui/table/DaisyUiTable.svelte';
	import DaisyUiTableHeader from '$lib/component/library/daisyui/table/head/DaisyUiTableHeader.svelte';
	import DaisyUiTableBody from '$lib/component/library/daisyui/table/body/DaisyUiTableBody.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiPagination from '$lib/component/library/daisyui/pagination/DaisyUiPagination.svelte';
	import DaisyUiPaginationItem from '$lib/component/library/daisyui/pagination/item/DaisyUiPaginationItem.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import {
		getExternalReferPaginated,
		deleteExternalRefer
	} from '$lib/remote/table/information-table/external-refer.remote';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { PaginatedResult } from '$lib/remote/table/pagination-type';
	import type { ExternalReferWithRelations } from '$lib/remote/table/information-table/external-refer.remote';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiTooltip from '$lib/component/library/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideRefreshCcw from '$lib/component/library/lucide/LucideRefreshCcw.svelte';
	import LucideChevronLeft from '$lib/component/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/library/lucide/LucideChevronRight.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import LucideEye from '$lib/component/library/lucide/LucideEye.svelte';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import LExternalReferMasterModal from '$lib/component/local/private/heka/administration/external-refer-master/LExternalReferMasterModal.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { m } from '$lib/paraglide/messages';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	let referResult =
		$state<PaginatedResult<ExternalReferWithRelations> | null>(null);
	let currentPage = $state(1);
	let filterPageSize = $state('10');
	let searchInput = $state('');
	let isLoading = $state(false);

	type DialogMode = 'create' | 'view' | 'edit';
	let modalState = $state<{ mode: DialogMode; id?: number } | null>(
		null
	);

	const referList = $derived(referResult?.data ?? []);
	const totalPages = $derived(referResult?.totalPages ?? 1);
	const total = $derived(referResult?.total ?? 0);

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: undefined
	);

	async function fetchRefer(opts?: { bustCache?: boolean }) {
		isLoading = true;
		const pageSize = Number(filterPageSize) || 10;
		try {
			referResult = await getExternalReferPaginated({
				page: currentPage,
				pageSize,
				search: searchInput.trim() || undefined,
				hospitalId: hospitalId ?? undefined,
				...(opts?.bustCache && { _t: Date.now() })
			});
		} finally {
			isLoading = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		fetchRefer();
	});

	let searchDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;
	let isFirstSearchEffect = true;
	$effect(() => {
		const _query = searchInput;
		if (isFirstSearchEffect) {
			isFirstSearchEffect = false;
			return;
		}
		if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
		searchDebounceTimeout = setTimeout(() => {
			currentPage = 1;
			fetchRefer();
		}, 350);
		return () => {
			if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
		};
	});

	function handlePageSizeChange() {
		currentPage = 1;
		fetchRefer();
	}

	function goToPage(p: number) {
		currentPage = p;
		fetchRefer();
	}

	async function handleDelete(referId: number) {
		try {
			const result = await dialogService.open({
				title: m.delete_external_refer(),
				message: m.confirm_delete_refer(),
				variant: DialogVariantEnum.CONFIRM
			});
			if (result.confirmed) {
				await deleteExternalRefer({ id: referId });
				await fetchRefer();
				toastService.addToast(
					m.external_refer_deleted(),
					StatusColorEnum.SUCCESS
				);
			}
		} catch (err) {
			console.error(err);
			toastService.addToast(
				m.failed_delete_external_refer(),
				StatusColorEnum.ERROR
			);
		}
	}

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return '—';
		try {
			const d = new Date(value);
			return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
		} catch {
			return '—';
		}
	}

	const REFER_COLUMN_COUNT = 14;

	function openCreate() {
		modalState = { mode: 'create' };
	}

	function viewData(id: number) {
		modalState = { mode: 'view', id };
	}

	function editData(id: number) {
		modalState = { mode: 'edit', id };
	}

	function closeModal() {
		modalState = null;
		fetchRefer({ bustCache: true });
	}
</script>

<div
	class="mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between"
>
	<div
		class="order-1 flex flex-wrap items-center gap-2 md:order-none"
	>
		<DaisyUiButton
			className="d-btn-primary d-btn-sm"
			onClick={openCreate}
		>
			<LucidePlus className="size-5" />
			{m.create()}
		</DaisyUiButton>
		<p class="text-sm opacity-80">
			{#if total > 0}
				{@const pageSize = Number(filterPageSize) || 10}
				{@const start = (currentPage - 1) * pageSize + 1}
				{@const end = Math.min(currentPage * pageSize, total)}
				Showing <span class="text-success">{start}–{end}</span> of
				<span class="text-error">{total}</span> refer
			{:else}
				Showing 0 of 0 refer
			{/if}
		</p>
	</div>

	<div
		class="order-3 flex flex-1 flex-wrap items-center gap-3 md:order-none md:justify-end"
	>
		<div>
			<DaisyUiInputField
				inputPlaceholderText={m.search_placeholder_refer()}
				bind:value={searchInput}
				className="d-input-sm"
			/>
		</div>
		<DaisyUiTooltip
			tooltipText={m.refresh_data()}
			className="d-tooltip-bottom d-tooltip-primary"
		>
			<DaisyUiButton
				className="d-btn-primary d-btn-sm"
				onClick={() => fetchRefer()}
			>
				<LucideRefreshCcw className="size-5" />
			</DaisyUiButton>
		</DaisyUiTooltip>
	</div>

	<div
		class="order-2 flex items-center gap-2 whitespace-nowrap md:order-none"
	>
		<span class="text-sm">{m.per_page()}</span>
		<DaisyUiSelect
			className="d-select d-select-sm w-16"
			bind:value={filterPageSize}
			onChange={handlePageSizeChange}
			disabled={isLoading}
		>
			<option value="5">5</option>
			<option value="10">10</option>
			<option value="25">25</option>
			<option value="50">50</option>
			<option value="100">100</option>
		</DaisyUiSelect>
	</div>

	{#if referResult !== null}
		<div
			class="order-4 w-full md:order-none md:w-auto md:justify-end"
		>
			<DaisyUiPagination>
				<DaisyUiPaginationItem
					onClick={() => goToPage(currentPage - 1)}
					className="d-btn-sm"
					disabled={currentPage <= 1 || isLoading}
				>
					<LucideChevronLeft className="size-5" />
				</DaisyUiPaginationItem>
				{#each Array.from({ length: totalPages }, (_, i) => i + 1) as p (p)}
					<DaisyUiPaginationItem
						className="d-btn-sm"
						onClick={() => goToPage(p)}
					>
						{p}
					</DaisyUiPaginationItem>
				{/each}
				<DaisyUiPaginationItem
					onClick={() => goToPage(currentPage + 1)}
					className="d-btn-sm"
					disabled={currentPage >= totalPages || isLoading}
				>
					<LucideChevronRight className="size-5" />
				</DaisyUiPaginationItem>
			</DaisyUiPagination>
		</div>
	{/if}
</div>

{#if isLoading && !referResult}
	<div class="flex items-center justify-center">
		<DaisyUiLoading className="d-loading-xl" />
	</div>
{:else}
	<div class="max-h-[calc(100vh-18rem)] overflow-auto">
		<DaisyUiTable className="d-table d-table-zebra d-table-sm">
			<DaisyUiTableHeader>
				<tr class="sticky top-0 z-3 bg-base-200">
					<th class="sticky left-0 z-1 w-16 min-w-[4rem] bg-base-200"
						>{m.actions()}</th
					>
					<th
						class="sticky top-0 left-[4.75rem] z-1 w-24 min-w-[6rem] bg-base-200"
						>{m.id()}</th
					>
					<th class="w-56 min-w-[14rem]">{m.name()}</th>
					<th class="w-56 min-w-[14rem]">{m.address()}</th>
					<th class="w-32 min-w-[8rem]">{m.country()}</th>
					<th class="w-32 min-w-[8rem]">{m.state()}</th>
					<th class="w-32 min-w-[8rem]">{m.city()}</th>
					<th class="w-28 min-w-[7rem]">{m.postal_code()}</th>
					<th class="w-32 min-w-[8rem]">{m.phone_code()}</th>
					<th class="w-36 min-w-[9rem]">{m.phone()}</th>
					<th class="w-48 min-w-[12rem]">{m.email()}</th>
					<th class="w-28 min-w-[7rem]">{m.status()}</th>
					<th class="w-40 min-w-[10rem]">{m.created_at()}</th>
					<th class="w-40 min-w-[10rem]">{m.updated_at()}</th>
				</tr>
			</DaisyUiTableHeader>
			<DaisyUiTableBody>
				{#each referList as refer (refer.id)}
					<tr class="z-0 hover:bg-info/30">
						<td
							class="sticky left-0 z-2 w-16 min-w-[4rem] bg-base-100"
						>
							<div class="flex flex-col items-center gap-1">
								<DaisyUiTooltip
									tooltipText={m.view_data()}
									className="d-tooltip-ghost d-tooltip-right"
								>
									<DaisyUiButton
										className="d-btn-ghost d-btn-sm"
										onClick={() => viewData(refer.id)}
									>
										<LucideEye className="size-5" />
									</DaisyUiButton>
								</DaisyUiTooltip>
								<DaisyUiTooltip
									tooltipText={m.edit_data()}
									className="d-tooltip-accent d-tooltip-right"
								>
									<DaisyUiButton
										className="d-btn-sm d-btn-ghost d-btn-accent"
										onClick={() => editData(refer.id)}
									>
										<LucidePencil className="size-5" />
									</DaisyUiButton>
								</DaisyUiTooltip>
								<DaisyUiTooltip
									tooltipText={m.delete_data()}
									className="d-tooltip-error d-tooltip-right"
								>
									<DaisyUiButton
										className="d-btn-ghost d-btn-sm d-btn-error"
										disabled={isLoading}
										onClick={() => handleDelete(refer.id)}
									>
										<LucideTrash2 className="size-5" />
									</DaisyUiButton>
								</DaisyUiTooltip>
							</div>
						</td>
						<td
							class="sticky left-[4.75rem] z-1 w-24 min-w-[6rem] bg-base-100"
						>
							{refer.id}
						</td>
						<td class="w-56 min-w-[14rem]">
							{[
								(refer.title?.name ?? '').trim(),
								(refer.name ?? '').trim()
							]
								.filter(Boolean)
								.join(' ') || '—'}
						</td>
						<td class="w-56 min-w-[14rem]">{refer.address ?? '—'}</td>
						<td class="w-32 min-w-[8rem]"
							>{refer.country?.name ?? '—'}</td
						>
						<td class="w-32 min-w-[8rem]"
							>{refer.state?.name ?? '—'}</td
						>
						<td class="w-32 min-w-[8rem]"
							>{refer.city?.name ?? '—'}</td
						>
						<td class="w-28 min-w-[7rem]"
							>{refer.postalCode != null
								? String(refer.postalCode.value)
								: '—'}</td
						>
						<td class="w-32 min-w-[8rem]"
							>{refer.phoneCountry?.countryCallingCode ?? '—'}</td
						>
						<td class="w-36 min-w-[9rem]">{refer.phone ?? '—'}</td>
						<td class="w-48 min-w-[12rem]">{refer.email ?? '—'}</td>
						<td class="w-28 min-w-[7rem]"
							>{refer.status?.name ?? '—'}</td
						>
						<td class="w-40 min-w-[10rem]"
							>{formatDateTime(refer.createdAt)}</td
						>
						<td class="w-40 min-w-[10rem]"
							>{formatDateTime(refer.updatedAt)}</td
						>
					</tr>
				{:else}
					<tr>
						<td
							colspan={REFER_COLUMN_COUNT}
							class="text-center opacity-70"
						>
							{m.no_refer_found()}
						</td>
					</tr>
				{/each}
			</DaisyUiTableBody>
		</DaisyUiTable>
	</div>
{/if}

{#if modalState}
	<LExternalReferMasterModal {modalState} onClose={closeModal} />
{/if}
