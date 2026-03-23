/** Stored in `support_ticket.status` (varchar). */
export enum SupportTicketStatusEnum {
	OPEN = 'open',
	IN_PROGRESS = 'in_progress',
	RESOLVED = 'resolved',
	CLOSED = 'closed'
}

export const SUPPORT_TICKET_STATUS_VALUES = Object.values(
	SupportTicketStatusEnum
) as string[];

export function isSupportTicketStatus(
	value: string
): value is SupportTicketStatusEnum {
	return SUPPORT_TICKET_STATUS_VALUES.includes(value);
}
