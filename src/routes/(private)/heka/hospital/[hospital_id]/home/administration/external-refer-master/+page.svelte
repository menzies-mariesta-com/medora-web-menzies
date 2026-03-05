<script lang="ts">
	import { page } from '$app/state';
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
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';

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

	const referColumns: MariTableColumn<ExternalReferWithRelations>[] = [
		{
			id: 'id',
			header: m.id(),
			widthClass: 'w-24 min-w-[6rem]'
		},
		{
			id: 'name',
			header: m.name(),
			widthClass: 'w-56 min-w-[14rem]',
			format: (_value, row) =>
				[
					(row.title?.name ?? '').trim(),
					(row.name ?? '').trim()
				]
					.filter(Boolean)
					.join(' ') || '—'
		},
		{
			id: 'address',
			header: m.address(),
			widthClass: 'w-56 min-w-[14rem]'
		},
		{
			id: 'country',
			header: m.country(),
			widthClass: 'w-32 min-w-[8rem]',
			field: 'country.name'
		},
		{
			id: 'state',
			header: m.state(),
			widthClass: 'w-32 min-w-[8rem]',
			field: 'state.name'
		},
		{
			id: 'city',
			header: m.city(),
			widthClass: 'w-32 min-w-[8rem]',
			field: 'city.name'
		},
		{
			id: 'postalCode',
			header: m.postal_code(),
			widthClass: 'w-28 min-w-[7rem]',
			format: (_value, row) =>
				row.postalCode != null
					? String(row.postalCode.value)
					: '—'
		},
		{
			id: 'phoneCode',
			header: m.phone_code(),
			widthClass: 'w-32 min-w-[8rem]',
			field: 'phoneCountry.countryCallingCode'
		},
		{
			id: 'phone',
			header: m.phone(),
			widthClass: 'w-36 min-w-[9rem]'
		},
		{
			id: 'email',
			header: m.email(),
			widthClass: 'w-48 min-w-[12rem]'
		},
		{
			id: 'status',
			header: m.status(),
			widthClass: 'w-28 min-w-[7rem]',
			field: 'status.name'
		},
		{
			id: 'createdAt',
			header: m.created_at(),
			widthClass: 'w-40 min-w-[10rem]',
			format: (value) => formatDateTime(value as any)
		},
		{
			id: 'updatedAt',
			header: m.updated_at(),
			widthClass: 'w-40 min-w-[10rem]',
			format: (value) => formatDateTime(value as any)
		}
	];

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
	class="flex items-center justify-end mx-4 my-2"
>
		<DaisyUiButton
			className="d-btn-primary d-btn-sm"
			onClick={openCreate}
		>
			<LucidePlus className="size-5" />
			{m.create()}
		</DaisyUiButton>
</div>

{#if isLoading && !referResult}
	<div class="flex items-center justify-center">
		<DaisyUiLoading className="d-loading-xl" />
	</div>
{:else}
	<div class="{TableEnum.HEIGHT} overflow-auto">
		<MariTable
			rows={referList}
			columns={referColumns}
			isLoading={isLoading}
			showRefreshButton={true}
			refreshTooltip={m.refresh_data()}
			emptyMessage={m.no_refer_found()}
			showRowActions={true}
			actionsHeader={m.actions()}
			actionsVariant="none"
			enableColumnFilters={false}
			on:refresh={() => fetchRefer({ bustCache: true })}
		>
			<svelte:fragment slot="rowActions" let:row>
				<td class="sticky left-0 z-2 w-16 min-w-[4rem] bg-base-100">
					<div class="flex flex-col items-center gap-1">
						<DaisyUiTooltip
							tooltipText={m.view_data()}
							className="d-tooltip-ghost d-tooltip-right"
						>
							<DaisyUiButton
								className="d-btn-ghost d-btn-sm"
								onClick={() => viewData(row.id)}
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
								onClick={() => editData(row.id)}
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
								onClick={() => handleDelete(row.id)}
							>
								<LucideTrash2 className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
					</div>
				</td>
			</svelte:fragment>
		</MariTable>
	</div>
{/if}

{#if modalState}
	<LExternalReferMasterModal {modalState} onClose={closeModal} />
{/if}
