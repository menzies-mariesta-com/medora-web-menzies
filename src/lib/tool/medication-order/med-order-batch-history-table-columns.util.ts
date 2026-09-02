import type { MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
import type { MedicationOrderBatchHistoryRow } from '$lib/model/type/heka/medication-order.type';
import { formatMariTableDateTime } from '$lib/util/mari-table-datetime.util';

export type MedOrderBatchHistoryColumnLabels = {
	batch: string;
	store: string;
	visitNo: string;
	extCustomer: string;
	advisingDoctor: string;
	lines: string;
	createdAt: string;
	updatedAt: string;
	createdBy: string;
	updatedBy: string;
	notApplicable: string;
};

export function medOrderBatchHistoryTableColumns(
	labels: MedOrderBatchHistoryColumnLabels,
	options: {
		storeNameById: Record<number, string>;
	}
): MariTableColumn<MedicationOrderBatchHistoryRow>[] {
	const dash = () => labels.notApplicable;
	const { storeNameById } = options;

	return [
		{
			id: 'batchNo',
			header: labels.batch,
			widthClass: 'min-w-[8rem]',
			filterable: true,
			field: 'batchNo'
		},
		{
			id: 'visitNo',
			header: labels.visitNo,
			widthClass: 'min-w-[8rem]',
			filterable: true,
			field: 'visitNo',
			format: (v) =>
				v != null && String(v).trim() ? String(v).trim() : dash()
		},
		{
			id: 'store',
			header: labels.store,
			widthClass: 'min-w-[10rem]',
			filterable: true,
			format: (_v, row) => storeNameById[row.storeId] ?? '—'
		},
		{
			id: 'extCustomerName',
			header: labels.extCustomer,
			widthClass: 'min-w-[8rem]',
			filterable: true,
			field: 'extCustomerName',
			format: (v) =>
				v != null && String(v).trim() ? String(v) : dash()
		},
		{
			id: 'advisingDoctor',
			header: labels.advisingDoctor,
			widthClass: 'min-w-[8rem]',
			filterable: true,
			field: 'advisingDoctor',
			format: (v) =>
				v != null && String(v).trim() ? String(v) : dash()
		},
		{
			id: 'lineCount',
			header: labels.lines,
			widthClass: 'min-w-[4rem]',
			filterable: true,
			field: 'lineCount',
			format: (v) => String(v ?? dash())
		},
		{
			id: 'createdAt',
			header: labels.createdAt,
			widthClass: 'w-40 min-w-[10rem]',
			cellClass: 'whitespace-nowrap',
			filterable: false,
			format: (_v, row) => formatMariTableDateTime(row.createdAt)
		},
		{
			id: 'updatedAt',
			header: labels.updatedAt,
			widthClass: 'w-40 min-w-[10rem]',
			cellClass: 'whitespace-nowrap',
			filterable: false,
			format: (_v, row) => formatMariTableDateTime(row.updatedAt)
		},
		{
			id: 'createdByName',
			header: labels.createdBy,
			widthClass: 'min-w-[9rem]',
			filterable: true,
			field: 'createdByName',
			format: (v) =>
				v != null && String(v).trim() ? String(v) : dash()
		},
		{
			id: 'updatedByName',
			header: labels.updatedBy,
			widthClass: 'min-w-[9rem]',
			filterable: true,
			field: 'updatedByName',
			format: (v) =>
				v != null && String(v).trim() ? String(v) : dash()
		}
	];
}
