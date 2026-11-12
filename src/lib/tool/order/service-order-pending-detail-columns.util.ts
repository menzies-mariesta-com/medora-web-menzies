import type { MenziesTableColumn } from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
import {
	formatNumberDisplay,
	type NumberDisplayInput
} from '$lib/util/number-display.util';

export type ServiceOrderLineAmountFields = {
	serviceAmount: string | null;
	serviceTaxAmount: string | null;
	serviceUnit: number;
};

export type ServiceOrderLineCatalogFields = {
	serviceName: string;
	categoryName: string;
	subCategoryName: string;
	instruction: string | null;
};

export type ServiceOrderPendingTableRow = ServiceOrderLineCatalogFields &
	ServiceOrderLineAmountFields & {
		serviceId: number;
		isUrgent: boolean;
		advisingDoctorName: string | null;
	};

function parseMoney(value: string | null | undefined): number {
	if (value == null) return 0;
	const trimmed = String(value).trim();
	if (!trimmed) return 0;
	const n = Number(trimmed);
	return Number.isFinite(n) ? n : 0;
}

/** Line total: unit × (service amount + tax per unit). */
export function formatServiceOrderLineAmount(
	row: ServiceOrderLineAmountFields
): string {
	const unit = row.serviceUnit >= 1 ? row.serviceUnit : 1;
	const total =
		unit * parseMoney(row.serviceAmount) +
		unit * parseMoney(row.serviceTaxAmount);
	return formatNumberDisplay(total);
}

type ServiceOrderLineItemRow = ServiceOrderLineCatalogFields &
	ServiceOrderLineAmountFields & {
		isUrgent: boolean;
		advisingDoctorName: string | null;
	};

/** Shared line columns: service catalog → money → flags (no row index). */
export function serviceOrderLineItemColumns<
	T extends ServiceOrderLineItemRow
>(): MenziesTableColumn<T>[] {
	return [
		{
			id: 'serviceName',
			header: 'Service Name',
			widthClass: 'w-64',
			filterable: false,
			format: (_value, row) => row.serviceName || '–'
		},
		{
			id: 'subCategoryName',
			header: 'Sub category',
			widthClass: 'w-48',
			filterable: false,
			format: (_value, row) =>
				row.subCategoryName?.trim() ? row.subCategoryName : '–'
		},
		{
			id: 'categoryName',
			header: 'Category',
			widthClass: 'w-40',
			filterable: false,
			format: (_value, row) =>
				row.categoryName?.trim() ? row.categoryName : '–'
		},
		{
			id: 'instruction',
			header: 'Instruction',
			widthClass: 'w-64',
			filterable: false,
			format: (_value, row) =>
				(row.instruction as string | null | undefined)?.trim() || '–'
		},
		{
			id: 'serviceUnit',
			header: 'Unit',
			widthClass: 'w-20',
			filterable: false,
			format: (value) => (value != null ? String(value) : '–')
		},
		{
			id: 'serviceAmount',
			header: 'Service Amount',
			widthClass: 'w-32',
			filterable: false,
			format: (value) =>
				formatNumberDisplay(value as NumberDisplayInput)
		},
		{
			id: 'serviceTaxAmount',
			header: 'Tax',
			widthClass: 'w-24',
			filterable: false,
			format: (value) =>
				formatNumberDisplay(value as NumberDisplayInput)
		},
		{
			id: 'lineAmount',
			header: 'Amount',
			widthClass: 'w-32',
			filterable: false,
			format: (_value, row) => formatServiceOrderLineAmount(row)
		},
		{
			id: 'isUrgent',
			header: 'Urgent',
			widthClass: 'w-20',
			filterable: false,
			format: (_value, row) => (row.isUrgent ? 'Yes' : 'No')
		},
		{
			id: 'advisingDoctorName',
			header: 'Advising Doctor',
			widthClass: 'w-40',
			filterable: false,
			format: (_value, row) =>
				row.advisingDoctorName && row.advisingDoctorName.trim()
					? row.advisingDoctorName
					: '–'
		}
	];
}

export function serviceOrderPendingDetailColumns<
	T extends ServiceOrderPendingTableRow
>(): MenziesTableColumn<T>[] {
	return [
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
