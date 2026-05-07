/** Values stored in `inv_approval_level.module` and `inv_approval_log.module`. */
export const INV_APPROVAL_MODULE_CODES = [
	'PR',
	'PO',
	'DI',
	'DISS',
	'RFS',
	'GRN',
	'DC'
] as const;
export type InvApprovalModule = (typeof INV_APPROVAL_MODULE_CODES)[number];

export function isInvApprovalModule(s: string): s is InvApprovalModule {
	return (INV_APPROVAL_MODULE_CODES as readonly string[]).includes(s);
}
