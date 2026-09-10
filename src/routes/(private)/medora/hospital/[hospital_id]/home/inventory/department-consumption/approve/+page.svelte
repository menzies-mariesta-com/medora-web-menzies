<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import LucideBan from '$lib/component/own/library/lucide/LucideBan.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import {
		InvApprovalActionEnum,
		InvDepartmentConsumptionStatusTaggingEnum
	} from '$lib/model/enum/db-link';
	import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { m } from '$lib/paraglide/messages';
	import { AppEnum } from '$lib/model/enum/app.enum';

	const toast = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	let { data } = $props();
	const selectedInventoryFromStoreId = $derived(
		(data as { selectedInventoryFromStoreId?: number | null })
			.selectedInventoryFromStoreId ?? null
	);

	const backHref = $derived(
		medoraHospitalPageUrl(
			hospitalId,
			'/medora/home/inventory/department-consumption' as const
		)
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
	let pageSizeStr = $state(
		String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE)
	);
	let remarks = $state('');
	let actId = $state<string | null>(null);

	function detailHref(id: string) {
		return `/medora/hospital/${hospitalId}/home/inventory/department-consumption/${encodeURIComponent(id)}`;
	}

	const columns: MenziesTableColumn<Row>[] = $derived([
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
				`/api/medora/hospital/${hospitalId}/home/inventory/department-consumption?${ps}`,
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
				`/api/medora/hospital/${hospitalId}/home/inventory/department-consumption/approve`,
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
				toast.addToast(
					'Action failed',
					StatusColorEnum.ERROR,
					t || String(res.status)
				);
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

<WashCard>
	<WashCardBody>
		<div class="mb-4 flex items-center gap-2">
			<WashTooltip
				tooltipText={m.inv_common_back_to_list()}
				className="tooltip-ghost"
			>
				<WashButton
					type="button"
					className="btn-xs btn-ghost btn-square"
					onClick={() => void goto(resolve(backHref as any))}
				>
					<LucideArrowLeft className="size-4" />
				</WashButton>
			</WashTooltip>
			<WashCardBodyTitle className="mb-0">
				{m.inv_dc_approve_title()}
			</WashCardBodyTitle>
		</div>

		<div class="mb-4 max-w-xl">
			<label>{m.inv_common_remarks()}</label>
			<input
				class="input-bordered input mt-1 w-full text-sm"
				type="text"
				bind:value={remarks}
				placeholder="Optional approval remarks..."
			/>
		</div>

		<div class={TableEnum.HEIGHT}>
			<MenziesTable
				columns={columns as MenziesTableColumn[]}
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
						<WashTooltip
							tooltipText={m.inv_common_view()}
							className="tooltip-ghost"
						>
							<WashButton
								className="btn-xs btn-ghost btn-square"
								disabled={loading || actId != null}
								onClick={() => void goto(detailHref(r.id))}
							>
								<LucideEye className="size-3.5" />
							</WashButton>
						</WashTooltip>

						{#if r.canApprove === true}
							<WashTooltip
								tooltipText={m.inv_dc_approve()}
								className="tooltip-accent"
							>
								<WashButton
									className="btn-xs btn-ghost btn-square text-accent"
									disabled={actId != null}
									loading={actId === r.id}
									onClick={() =>
										void approveRow(
											r,
											InvApprovalActionEnum.APPROVED
										)}
								>
									<LucideCircleCheck className="size-4" />
								</WashButton>
							</WashTooltip>
							<WashTooltip
								tooltipText={m.inv_dc_reject()}
								className="tooltip-error"
							>
								<WashButton
									className="btn-xs btn-ghost btn-square text-error"
									disabled={actId != null}
									loading={actId === r.id}
									onClick={() =>
										void approveRow(
											r,
											InvApprovalActionEnum.REJECTED
										)}
								>
									<LucideBan className="size-4" />
								</WashButton>
							</WashTooltip>
						{/if}
					</div>
				{/snippet}
			</MenziesTable>
		</div>
	</WashCardBody>
</WashCard>
