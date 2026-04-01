import { getServiceOrder } from '$lib/remote/table/information-table/service-order.remote';
import { getServiceOrderDetail } from '$lib/remote/table/information-table/service-order-detail.remote';
import { getServiceItem } from '$lib/remote/table/information-table/service-item.remote';
import type { VisitServiceLinePrintRow } from '$lib/util/document-placeholder.util';
import { formatMoneyAmount } from '$lib/util/number-display.util';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	ServiceItemSchema,
	ServiceOrderDetailSchema,
	ServiceOrderSchema
} from '$lib/server/db/schema-type';

function parseAmount(value: string | null | undefined): number {
	const num = Number(value ?? 0);
	return Number.isFinite(num) ? num : 0;
}

function formatDate(value: string | null | undefined): string {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return date.toLocaleDateString();
}

function formatDateTime(value: string | null | undefined): string {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return date.toLocaleString();
}

/** All service order lines for a visit (non-deleted details), for print / placeholders. */
export async function fetchVisitServiceLinePrintRows(params: {
	visitId: number;
	hospitalId: string;
}): Promise<VisitServiceLinePrintRow[]> {
	const { visitId, hospitalId } = params;
	const orders = await getServiceOrder({ visitId });
	if (orders.length === 0) return [];

	const orderIds = orders.map((o) => o.id);
	const details = await getServiceOrderDetail({
		serviceOrderIds: orderIds
	});
	const services = await getServiceItem({
		hospitalId,
		statusId: null
	});

	const serviceById: Record<number, ServiceItemSchema> = {};
	for (const service of services) {
		serviceById[service.id] = service;
	}

	const orderById: Record<number, ServiceOrderSchema> = {};
	for (const order of orders) {
		orderById[order.id] = order;
	}

	return details.map((detail: ServiceOrderDetailSchema) => {
		const service = serviceById[detail.serviceId];
		const order = orderById[detail.serviceOrderId];
		const amount = parseAmount(detail.serviceAmount);
		const tax = parseAmount(detail.serviceTaxAmount);
		const unit = Number(detail.serviceUnit ?? 1);
		const multiplier = Number.isFinite(unit) && unit > 0 ? unit : 1;
		const lineTotal = (amount + tax) * multiplier;
		const serviceLabel = service?.serviceCode
			? `${service.serviceName} (${service.serviceCode})`
			: (service?.serviceName ?? `Service #${detail.serviceId}`);
		const statusLabel =
			detail.statusId === StatusEnum.ACTIVE
				? 'Active'
				: detail.statusId === StatusEnum.INACTIVE
					? 'Inactive'
					: `Status ${detail.statusId ?? '?'}`;

		return {
			orderNo: order?.orderNo ?? '—',
			orderDate: formatDate(order?.orderDate ?? null),
			statusLabel,
			serviceLabel,
			amount: formatMoneyAmount(amount),
			tax: formatMoneyAmount(tax),
			unit: String(detail.serviceUnit ?? 1),
			lineTotal: formatMoneyAmount(lineTotal),
			nursingCompleteTime: formatDateTime(
				detail.nursingCompleteTime ?? null
			),
			urgent: detail.isUrgent ? 'Yes' : 'No',
			instruction: detail.instruction?.trim() || '—'
		};
	});
}
