import type { MenziesTableColumn } from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
import { activeInactiveEntityStatusColumn } from '$lib/tool/menzies/menzies-table-entity-status.util';
import {
	serviceOrderLineItemColumns,
	type ServiceOrderLineAmountFields,
	type ServiceOrderLineCatalogFields
} from '$lib/tool/order/service-order-pending-detail-columns.util';

export type ServiceOrderHistoryTableRow = ServiceOrderLineCatalogFields &
	ServiceOrderLineAmountFields & {
		orderNo: string | null;
		isUrgent: boolean;
		advisingDoctorName: string | null;
	};

export function serviceOrderHistoryDetailColumns<
	T extends ServiceOrderHistoryTableRow
>(): MenziesTableColumn<T>[] {
	return [
		activeInactiveEntityStatusColumn<T>({
			header: 'Status',
			widthClass: 'w-28'
		}),
		{
			id: 'orderNo',
			header: 'Order No',
			widthClass: 'w-32',
			filterable: false,
			format: (value) => (value ? String(value) : '–')
		},
		{
			id: 'serviceId',
			header: 'No.',
			widthClass: 'w-16',
			filterable: false,
			format: (_value, _row, index) => String(index + 1)
		},
		...(serviceOrderLineItemColumns<T>() as MenziesTableColumn<T>[])
	];
}
