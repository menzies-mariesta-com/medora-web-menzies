<script lang="ts">
	import WashModal from '$lib/component/wash/modal/WashModal.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { AppointmentWithRelations } from '$lib/model/type/medora/appointment.type';
	import { StringUtil } from '$lib/util/string.util.svelte';

	type CancelHistoryItem = AppointmentWithRelations;

	const { open, onClose, items, isLoading } = $props<{
		open: boolean;
		onClose: () => void;
		items: CancelHistoryItem[];
		isLoading: boolean;
	}>();

	function formatDate(d: unknown): string {
		if (d == null) return '–';
		const s = String(d);
		return s.length >= 10 ? s.slice(0, 10) : s;
	}

	function getPatientLabel(row: CancelHistoryItem): string {
		const code = row.patient?.code?.trim() ?? '';
		const name =
			row.patientName?.trim() ??
			(row.patient ? StringUtil.patientDisplayName(row.patient) : '');
		if (code && name) return `${code} – ${name}`;
		return name || code || '–';
	}

	function getCancelRemark(row: CancelHistoryItem): string {
		const r1 = (row.cancelRemark ?? null) as string | null;
		const r2 = row.remark ?? null;
		const trimmed = (r1 ?? r2 ?? '').trim();
		return trimmed || '–';
	}

	const columns: MariTableColumn<CancelHistoryItem>[] = [
		{
			id: 'appointmentDate',
			header: 'Date',
			widthClass: 'w-32',
			filterable: false,
			format: (_value, row) => formatDate(row.appointmentDate)
		},
		{
			id: 'time',
			header: 'Time',
			widthClass: 'w-40',
			filterable: false,
			format: (_value, row) => {
				const from = row.fromTime ? String(row.fromTime) : '';
				const to = row.toTime ? String(row.toTime) : '';
				return from && to ? `${from} - ${to}` : '–';
			}
		},
		{
			id: 'patient',
			header: 'Patient',
			widthClass: 'min-w-[12rem]',
			filterable: false,
			format: (_value, row) => getPatientLabel(row)
		},
		{
			id: 'cancelRemark',
			header: 'Cancel remark',
			widthClass: 'min-w-[16rem]',
			filterable: false,
			format: (_value, row) => getCancelRemark(row),
			cellClass: 'max-w-96 truncate'
		}
	];
</script>

{#if open}
	<WashModal
		groupName="cancel-appointment-history-modal"
		open={true}
		{onClose}
	>
		<div
			class="modal-box h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none"
			role="document"
		>
			<div class="mb-3 flex items-center justify-between">
				<WashCardBodyTitle className="mb-0">
					Cancel appointment history
				</WashCardBodyTitle>
				<WashButton
					className="btn-ghost btn-sm"
					onClick={onClose}
				>
					Close
				</WashButton>
			</div>

			{#if items.length === 0 && !isLoading}
				<p class="text-sm text-base-content/70">
					No cancelled appointments found.
				</p>
			{:else}
				<div class="flex flex-col gap-3 {TableEnum.HEIGHT_SMALL}">
					<MariTable
						rows={items}
						{columns}
						{isLoading}
						showRefreshButton={false}
						pageSize={String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE)}
						currentPage={1}
						emptyMessage="No items."
						showRowActions={false}
						enableColumnFilters={false}
					/>
				</div>
			{/if}
		</div>
	</WashModal>
{/if}
