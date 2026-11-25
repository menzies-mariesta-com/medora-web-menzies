import {
	DEFAULT_PAGE_ACTIONS,
	PageActionEnum
} from '$lib/model/enum/page-action.enum';

/**
 * Permissions each page offers in the User Group access matrix.
 * Pages missing here offer DEFAULT_PAGE_ACTIONS (view/create/edit/delete).
 * A page's list is also the allowlist for `page_permission_route_map`, so a
 * route can never require an action its page does not expose.
 */
export const PAGE_ACTIONS_BY_PAGE_URL: Record<
	string,
	PageActionEnum[]
> = {
	// ── Inventory: each document has its own workflow verbs ──
	'/medora/home/inventory/purchase-requisition': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.APPROVE,
		PageActionEnum.CANCEL,
		PageActionEnum.PRINT
	],
	'/medora/home/inventory/purchase-order': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.APPROVE,
		PageActionEnum.PRINT
	],
	'/medora/home/inventory/grn': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.RECEIVE,
		PageActionEnum.PRINT
	],
	'/medora/home/inventory/department-indent': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.APPROVE,
		PageActionEnum.CANCEL,
		PageActionEnum.ISSUE,
		PageActionEnum.RECEIVE,
		PageActionEnum.PRINT
	],
	'/medora/home/inventory/department-issue': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.APPROVE,
		PageActionEnum.CANCEL,
		PageActionEnum.ISSUE,
		PageActionEnum.RECEIVE,
		PageActionEnum.PRINT
	],
	'/medora/home/inventory/department-consumption': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.APPROVE,
		PageActionEnum.CANCEL,
		PageActionEnum.PRINT
	],
	'/medora/home/inventory/receipt-from-store': [
		PageActionEnum.VIEW,
		PageActionEnum.RECEIVE
	],
	'/medora/home/inventory/stock': [
		PageActionEnum.VIEW,
		PageActionEnum.EDIT,
		PageActionEnum.EXPORT
	],
	'/medora/home/inventory/reports': [
		PageActionEnum.VIEW,
		PageActionEnum.EXPORT
	],
	'/medora/home/inventory/reports/low-stock': [
		PageActionEnum.VIEW,
		PageActionEnum.EXPORT
	],
	'/medora/home/inventory/reports/expired': [
		PageActionEnum.VIEW,
		PageActionEnum.EXPORT
	],
	'/medora/home/inventory/reports/movement': [
		PageActionEnum.VIEW,
		PageActionEnum.EXPORT
	],

	// ── Billing: post + print ──
	'/medora/home/billing/bill': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT
	],
	'/medora/home/billing/advance-deposit': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT
	],

	// ── Clinical chart: print + attach files ──
	'/medora/home/nursing-workbench': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT,
		PageActionEnum.UPLOAD
	],
	'/medora/home/nursing-workbench/vital': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT
	],
	'/medora/home/nursing-workbench/allergy': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT
	],
	'/medora/home/nursing-workbench/order': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT
	],
	'/medora/home/nursing-workbench/nursing-complete': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT
	],
	'/medora/home/nursing-workbench/case-sheet': [
		PageActionEnum.VIEW,
		PageActionEnum.PRINT
	],
	'/medora/home/nursing-workbench/clinical-document': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT
	],
	'/medora/home/nursing-workbench/patient-attachment': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.UPLOAD
	],
	'/medora/home/nursing-workbench/emar': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT
	],
	'/medora/home/nursing-workbench/care-plan': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT
	],
	'/medora/home/nursing-workbench/triage': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT
	],
	'/medora/home/nursing-workbench/mlc-documentation': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT
	],
	// Census admits / transfers / discharges patients (POST multiplexed by body action).
	'/medora/home/nursing-workbench/census': [
		PageActionEnum.VIEW,
		PageActionEnum.EDIT,
		PageActionEnum.EXPORT
	],
	// Board writes: assign/transfer ED bed, discharge encounter.
	'/medora/home/nursing-workbench/track-board': [
		PageActionEnum.VIEW,
		PageActionEnum.CREATE,
		PageActionEnum.EXPORT
	],
	'/medora/home/nursing-workbench/trauma-log': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT
	],
	'/medora/home/nursing-workbench/patient-visit-history-dashboard': [
		PageActionEnum.VIEW,
		PageActionEnum.PRINT
	],
	'/medora/home/consultation/emr': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT
	],
	'/medora/home/consultation/cpoe/prescription': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT
	],
	'/medora/home/consultation/discharge-summary': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT
	],
	'/medora/home/consultation/results': [
		PageActionEnum.VIEW,
		PageActionEnum.EDIT,
		PageActionEnum.DELETE,
		PageActionEnum.APPROVE,
		PageActionEnum.PRINT
	],
	'/medora/home/consultation/procedures': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT
	],
	'/medora/home/consultation/operative-notes': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT
	],
	'/medora/home/diagnostics/lab/catalog': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.EXPORT
	],
	'/medora/home/diagnostics/lab/receive': [
		PageActionEnum.VIEW,
		PageActionEnum.RECEIVE
	],
	// POST saves / endorses / verifies a result, so `create` is the base gate.
	'/medora/home/diagnostics/lab/results': [
		PageActionEnum.VIEW,
		PageActionEnum.CREATE,
		PageActionEnum.APPROVE,
		PageActionEnum.PRINT
	],
	'/medora/home/diagnostics/lab/critical-callback': [
		PageActionEnum.VIEW,
		PageActionEnum.CREATE,
		PageActionEnum.EDIT,
		PageActionEnum.PRINT
	],
	'/medora/home/diagnostics/lab/worklist/hematology': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.RECEIVE
	],
	'/medora/home/diagnostics/lab/worklist/chemistry': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.RECEIVE
	],
	'/medora/home/diagnostics/lab/worklist/microbiology': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.RECEIVE
	],
	'/medora/home/registration/patient/registration': [
		...DEFAULT_PAGE_ACTIONS,
		PageActionEnum.PRINT,
		PageActionEnum.UPLOAD
	],
	'/medora/home/registration/patient/list': [
		PageActionEnum.VIEW,
		PageActionEnum.DELETE,
		PageActionEnum.EXPORT
	]
};

/** Actions exposed by a page; falls back to CRUD for pages without an entry. */
export function pageActionsFor(pageUrl: string): PageActionEnum[] {
	return PAGE_ACTIONS_BY_PAGE_URL[pageUrl] ?? DEFAULT_PAGE_ACTIONS;
}
