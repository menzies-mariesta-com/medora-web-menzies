<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import LucideBan from '$lib/component/own/library/lucide/LucideBan.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import MariTable, { type MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import {
		InvApprovalActionEnum,
		InvDepartmentConsumptionStatusTaggingEnum
	} from '$lib/model/enum/db-link';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { m } from '$lib/paraglide/messages';
	import { AppEnum } from '$lib/model/enum/app.enum';

	const toast = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);

	let { data } = $props();
	const selectedInventoryFromStoreId = $derived(
		(data as { selectedInventoryFromStoreId?: number | null }).selectedInventoryFromStoreId ??
			null
	);

	const backHref = $derived(
		hekaHospitalPageUrl(hospitalId, '/heka/home/inventory/department-consumption' as const)
	);

	type Row = {
		id: string;
		consumptionNo: string | null;
		storeId: number;
		storeName: string | null;
		itemNames?: string | null;
		statusTaggingId?: number;
		statusName?: string | null;
		canApprove?: boolean;
	};

	let list = $state<Row[]>([]);
	let loading = $state(false);
	let total = $state(0);
	let currentPage = $state(1);
	let pageSizeStr = $state(String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE));
	let remarks = $state('');
	let actId = $state<string | null>(null);

	function detailHref(id: string) {
		return `/heka/hospital/${hospitalId}/home/inventory/department-consumption/${encodeURIComponent(id)}`;
	}

	const columns: MariTableColumn<Row>[] = $derived([
		{
			id: 'consumptionNo',
			header: m.inv_dc_consumption_no(),
			field: 'consumptionNo',
			filterable: false,
			format: (_v, r) => r.consumptionNo ?? '—'
		},
		{
			id: 'storeName',
			header: m.inv_dc_store(),
			field: 'storeName',
			filterable: false,
			format: (_v, r) => r.storeName ?? '—'
		},
		{
			id: 'itemNames',
			header: m.inv_common_item(),
			field: 'itemNames',
			filterable: false,
			cellClass: 'whitespace-pre-line',
			format: (_v, r) =>
				(r.itemNames ?? '')
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean)
					.join('\n') || '—'
		},
		{
			id: 'statusName',
			header: m.status(),
			field: 'statusName',
			filterable: false,
			format: (_v, r) => r.statusName ?? '—'
		}
	]);

	async function loadList() {
		if (!hospitalId) return;
		loading = true;
		try {
			const ps = new URLSearchParams();
			ps.set('page', String(currentPage));
			ps.set('pageSize', pageSizeStr);
			ps.set(
				'statusTaggingId',
				String(InvDepartmentConsumptionStatusTaggingEnum.PENDING)
			);
			if (selectedInventoryFromStoreId != null) {
				ps.set('storeId', String(selectedInventoryFromStoreId));
			}
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/department-consumption?${ps}`,
				{ method: 'GET' }
			);
			if (!res.ok) throw new Error(String(res.status));
			const j = (await res.json()) as { data: Row[]; total?: number };
			list = j.data ?? [];
			total = j.total ?? 0;
		} catch (e) {
			toast.addErrorToast(m.inv_dc_approve_title(), e);
			list = [];
			total = 0;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void hospitalId;
		void selectedInventoryFromStoreId;
		void loadList();
	});

	async function approveRow(row: Row, action: number) {
		if (!hospitalId) return;
		actId = row.id;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/department-consumption/approve`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						consumptionId: row.id,
						action,
						remarks: remarks.trim() || null
					})
				}
			);
			if (!res.ok) {
				const t = await res.text();
				toast.addToast('Action failed', StatusColorEnum.ERROR, t || String(res.status));
				return;
			}
			await loadList();
		} catch (e) {
			toast.addErrorToast(m.inv_dc_approve_title(), e);
		} finally {
			actId = null;
		}
	}
</script>

<DaisyUiCard>
	<DaisyUiCardBody>
		<div class="mb-4 flex items-center gap-2">
			<DaisyUiTooltip
				tooltipText={m.inv_common_back_to_list()}
				className="d-tooltip-ghost d-tooltip-right"
			>
				<DaisyUiButton
					type="button"
					className="d-btn-sm d-btn-ghost d-btn-square"
						onClick={() => void goto(resolve(backHref as any))}
				>
					<LucideArrowLeft className="size-4" />
				</DaisyUiButton>
			</DaisyUiTooltip>
			<DaisyUiCardBodyTitle className="mb-0">
				{m.inv_dc_approve_title()}
			</DaisyUiCardBodyTitle>
		</div>

		<div class="mb-4 max-w-xl">
			<DaisyUiLabel>{m.inv_common_remarks()}</DaisyUiLabel>
			<input
				class="d-input d-input-bordered mt-1 w-full text-sm"
				type="text"
				bind:value={remarks}
				placeholder="Optional approval remarks..."
			/>
		</div>

		<div class={TableEnum.HEIGHT}>
			<MariTable
				columns={columns as MariTableColumn[]}
				rows={list}
				bind:currentPage
				bind:pageSize={pageSizeStr}
				totalRowCount={total}
				isLoading={loading}
				showRowActions={true}
				actionsVariant="none"
				showRefreshButton={false}
				enableColumnFilters={false}
				on:pageChange={() => loadList()}
				on:pageSizeChange={() => {
					currentPage = 1;
					void loadList();
				}}
				emptyMessage={m.inv_detail_not_found()}
			>
				{#snippet rowActions(row, _i)}
					{@const r = row as Row}
					<div class="flex flex-col items-center gap-1">
						<DaisyUiTooltip
							tooltipText={m.inv_common_view()}
							className="d-tooltip-ghost d-tooltip-right"
						>
							<DaisyUiButton
								className="d-btn-sm d-btn-ghost d-btn-square"
								disabled={loading || actId != null}
								onClick={() => void goto(detailHref(r.id))}
							>
								<LucideEye className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>

						{#if r.canApprove === true}
							<DaisyUiTooltip
								tooltipText={m.inv_dc_approve()}
								className="d-tooltip-accent d-tooltip-right"
							>
								<DaisyUiButton
									className="d-btn-sm d-btn-ghost d-btn-square text-accent"
									disabled={actId != null}
									loading={actId === r.id}
									onClick={() => void approveRow(r, InvApprovalActionEnum.APPROVED)}
								>
									<LucideCircleCheck className="size-4" />
								</DaisyUiButton>
							</DaisyUiTooltip>
							<DaisyUiTooltip
								tooltipText={m.inv_dc_reject()}
								className="d-tooltip-error d-tooltip-right"
							>
								<DaisyUiButton
									className="d-btn-sm d-btn-ghost d-btn-square text-error"
									disabled={actId != null}
									loading={actId === r.id}
									onClick={() => void approveRow(r, InvApprovalActionEnum.REJECTED)}
								>
									<LucideBan className="size-4" />
								</DaisyUiButton>
							</DaisyUiTooltip>
						{/if}
					</div>
				{/snippet}
			</MariTable>
		</div>
	</DaisyUiCardBody>
</DaisyUiCard>
