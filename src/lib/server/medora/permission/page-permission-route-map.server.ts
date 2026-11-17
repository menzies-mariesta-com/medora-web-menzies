import { PageActionEnum } from '$lib/model/enum/page-action.enum';

/** HTTP method → the action a caller needs to invoke that handler. */
export type RouteMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RoutePermission =
	/** Own-account endpoints: any signed-in user, no page grant involved. */
	| { selfService: true }
	/** Hospital landing / shared visit lookup: any staff holding a group. */
	| { homeWide: true }
	| { pageUrls: string[]; action: PageActionEnum }
	| {
			pageUrls: string[];
			actions: Partial<Record<RouteMethod, PageActionEnum>>;
	  };

/**
 * Authorization for every `/api/medora/hospital/:hospital_id/home/**` handler.
 * Key = path after `/home` (`/` for the hospital home itself).
 *
 * Fail-closed: a route missing from this map is denied for STAFF. Keep it in
 * sync — `pnpm run check:page-permission-map` fails the build otherwise.
 */
export const ROUTE_PERMISSION: Record<string, RoutePermission> = {
	'/account-settings': { selfService: true },
	'/administration/bed-master': {
		pageUrls: ['/medora/home/administration/bed-master'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/billing-setup/ed-billing': {
		pageUrls: [
			'/medora/home/administration/billing-setup/ed-billing'
		],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/administration/billing-setup/ip-billing': {
		pageUrls: [
			'/medora/home/administration/billing-setup/ip-billing'
		],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/administration/billing-setup/op-billing': {
		pageUrls: [
			'/medora/home/administration/billing-setup/op-billing'
		],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/administration/billing-setup/settings': {
		pageUrls: ['/medora/home/administration/billing-setup/settings'],
		actions: {
			GET: PageActionEnum.VIEW,
			PATCH: PageActionEnum.EDIT
		}
	},
	'/administration/billing-setup/settings/accommodation-policy': {
		pageUrls: ['/medora/home/administration/billing-setup/settings'],
		actions: {
			GET: PageActionEnum.VIEW,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/branches': {
		pageUrls: ['/medora/home/administration/branches'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/color-configuration': {
		pageUrls: ['/medora/home/administration/color-configuration'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/departments': {
		pageUrls: ['/medora/home/administration/departments'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/diagnosis-codes': {
		pageUrls: ['/medora/home/consultation/emr'],
		action: PageActionEnum.VIEW
	},
	'/administration/document-master/document': {
		pageUrls: [
			'/medora/home/administration/document-master/document'
		],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/document-master/document-setting': {
		pageUrls: [
			'/medora/home/administration/document-master/document-setting'
		],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/document-master/document-type': {
		pageUrls: [
			'/medora/home/administration/document-master/document-type'
		],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/document-master/placeholder-setup': {
		pageUrls: [
			'/medora/home/administration/document-master/placeholder-setup'
		],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/document-master/reusable-global-documents': {
		pageUrls: [
			'/medora/home/administration/document-master/reusable-global-documents'
		],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/er-triage-level': {
		pageUrls: ['/medora/home/administration/er-triage-level'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/external-refer-master': {
		pageUrls: ['/medora/home/administration/external-refer-master'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/financial-year': {
		pageUrls: ['/medora/home/administration/financial-year'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/medication-order-setup/[entity]': {
		pageUrls: ['/medora/home/administration/medication-order-setup'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/prefix-configuration': {
		pageUrls: ['/medora/home/administration/prefix-configuration'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/room-master': {
		pageUrls: [
			'/medora/home/administration/room-master',
			'/medora/home/administration/room-master/room'
		],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/room-master/room-category': {
		pageUrls: [
			'/medora/home/administration/room-master/room-category'
		],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/schedule-master/doctor-schedule': {
		pageUrls: [
			'/medora/home/administration/schedule-master/doctor-schedule'
		],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/administration/service-order/category-master': {
		pageUrls: [
			'/medora/home/administration/service-order/category-master'
		],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/service-order/service-item-master': {
		pageUrls: [
			'/medora/home/administration/service-order/service-item-master'
		],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/service-order/service-item-tagging': {
		pageUrls: [
			'/medora/home/administration/service-order/service-item-tagging'
		],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/service-order/sub-category-master': {
		pageUrls: [
			'/medora/home/administration/service-order/sub-category-master'
		],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/staff/list': {
		pageUrls: ['/medora/home/administration/staff/list'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW
		}
	},
	'/administration/staff/registration': {
		pageUrls: ['/medora/home/administration/staff/registration'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/administration/trauma-activation-setup': {
		pageUrls: ['/medora/home/administration/trauma-activation-setup'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/user-group': {
		pageUrls: ['/medora/home/administration/user-group'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/ward-master': {
		pageUrls: [
			'/medora/home/administration/ward-master',
			'/medora/home/administration/ward-master/ward'
		],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/ward-master/billing-policy': {
		pageUrls: ['/medora/home/administration/ward-master'],
		actions: {
			GET: PageActionEnum.VIEW,
			PUT: PageActionEnum.EDIT
		}
	},
	'/administration/ward-master/ward-category': {
		pageUrls: [
			'/medora/home/administration/ward-master/ward-category'
		],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/adt/admission': {
		pageUrls: ['/medora/home/adt/admission'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/adt/admission-order': {
		pageUrls: ['/medora/home/adt/admission'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/adt/bed-status': {
		pageUrls: ['/medora/home/adt/bed-status'],
		action: PageActionEnum.VIEW
	},
	'/adt/bed-transfer-requisition': {
		pageUrls: ['/medora/home/adt/bed-transfer-requisition'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/adt/booking': {
		pageUrls: ['/medora/home/adt/booking'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/appointment/doctor-appointment': {
		pageUrls: ['/medora/home/appointment/doctor-appointment'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/billing/advance-deposit': {
		pageUrls: ['/medora/home/billing/advance-deposit'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/billing/bill/bills': {
		pageUrls: ['/medora/home/billing/bill'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/billing/bill/context': {
		pageUrls: ['/medora/home/billing/bill'],
		action: PageActionEnum.VIEW
	},
	'/billing/bill/visit-lines': {
		pageUrls: ['/medora/home/billing/bill'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.EDIT
		}
	},
	'/billing/er-billing/visit-lines': {
		pageUrls: ['/medora/home/billing/bill'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.EDIT
		}
	},
	'/billing/ip-advance-deposit': {
		pageUrls: ['/medora/home/billing/advance-deposit'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/billing/ip-billing/advance-deposit': {
		pageUrls: ['/medora/home/billing/advance-deposit'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/billing/ip-billing/bills': {
		pageUrls: ['/medora/home/billing/bill'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/billing/ip-billing/visit-lines': {
		pageUrls: ['/medora/home/billing/bill'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.EDIT
		}
	},
	'/billing/op-billing/bills': {
		pageUrls: ['/medora/home/billing/bill'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/billing/op-billing/visit-lines': {
		pageUrls: ['/medora/home/billing/bill'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.EDIT
		}
	},
	'/clinical-form': {
		pageUrls: [
			'/medora/home/nursing-workbench/triage',
			'/medora/home/nursing-workbench/mlc-documentation',
			'/medora/home/obstetrics/partogram',
			'/medora/home/perioperative/procedure-log'
		],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/consultation': {
		pageUrls: [
			'/medora/home/consultation/emr',
			'/medora/home/consultation/cpoe/order',
			'/medora/home/consultation/cpoe/prescription',
			'/medora/home/consultation/cpoe/refer/doctor',
			'/medora/home/consultation/cpoe/refer/history',
			'/medora/home/consultation/discharge-summary',
			'/medora/home/consultation/procedures',
			'/medora/home/consultation/results'
		],
		action: PageActionEnum.VIEW
	},
	'/consultation/cpoe/order': {
		pageUrls: ['/medora/home/consultation/cpoe/order'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/consultation/cpoe/prescription': {
		pageUrls: ['/medora/home/consultation/cpoe/prescription'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/consultation/cpoe/refer/doctor': {
		pageUrls: ['/medora/home/consultation/cpoe/refer/doctor'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/consultation/cpoe/refer/history': {
		pageUrls: ['/medora/home/consultation/cpoe/refer/history'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/consultation/discharge-summary': {
		pageUrls: ['/medora/home/consultation/discharge-summary'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/consultation/emr': {
		pageUrls: ['/medora/home/consultation/emr'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/consultation/operative-notes': {
		pageUrls: ['/medora/home/consultation/operative-notes'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/consultation/procedures': {
		pageUrls: ['/medora/home/consultation/procedures'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/consultation/results': {
		pageUrls: ['/medora/home/consultation/results'],
		// POST multiplexes save / endorse / delete in the body, so one action
		// cannot express it: `edit` is the base gate for all three.
		// shortcut: body-level granularity, upgrade if results get split routes.
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.EDIT
		}
	},
	'/dashboard': { homeWide: true },
	'/diagnostics/lab/catalog': {
		pageUrls: ['/medora/home/diagnostics/lab/catalog'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/diagnostics/lab/collection-worklist': {
		pageUrls: ['/medora/home/diagnostics/lab/collection-worklist'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/diagnostics/lab/critical-callback': {
		pageUrls: ['/medora/home/diagnostics/lab/critical-callback'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/diagnostics/lab/dashboard': {
		pageUrls: ['/medora/home/diagnostics/lab/dashboard'],
		action: PageActionEnum.VIEW
	},
	'/diagnostics/lab/integration': {
		pageUrls: ['/medora/home/diagnostics/lab/integration'],
		action: PageActionEnum.VIEW
	},
	'/diagnostics/lab/receive': {
		pageUrls: ['/medora/home/diagnostics/lab/receive'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.RECEIVE
		}
	},
	'/diagnostics/lab/results': {
		pageUrls: ['/medora/home/diagnostics/lab/results'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/diagnostics/lab/worklist': {
		pageUrls: [
			'/medora/home/diagnostics/lab/worklist/hematology',
			'/medora/home/diagnostics/lab/worklist/chemistry',
			'/medora/home/diagnostics/lab/worklist/microbiology'
		],
		action: PageActionEnum.VIEW
	},
	'/document-print': {
		pageUrls: [
			'/medora/home/nursing-workbench/case-sheet',
			'/medora/home/nursing-workbench',
			'/medora/home/consultation/emr'
		],
		action: PageActionEnum.PRINT
	},
	'/emergency': {
		pageUrls: [
			'/medora/home/emergency/admission',
			'/medora/home/emergency/bed-status',
			'/medora/home/nursing-workbench/track-board',
			'/medora/home/nursing-workbench/triage'
		],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/emergency/admission': {
		pageUrls: ['/medora/home/emergency/admission'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/emergency/bed-status': {
		pageUrls: ['/medora/home/emergency/bed-status'],
		action: PageActionEnum.VIEW
	},
	'/emr/visit-list': { homeWide: true },
	'/inventory-setup/approval-config': {
		pageUrls: ['/medora/home/inventory-setup/approval-config'],
		actions: {
			GET: PageActionEnum.VIEW,
			PUT: PageActionEnum.EDIT
		}
	},
	'/inventory-setup/item-master': {
		pageUrls: ['/medora/home/inventory-setup/item-master'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/inventory-setup/item-unit-master': {
		pageUrls: ['/medora/home/inventory-setup/item-unit-master'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/inventory-setup/pharmacy-generic': {
		pageUrls: ['/medora/home/inventory-setup/pharmacy-generic'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/inventory-setup/pricing-config': {
		pageUrls: [
			'/medora/home/inventory-setup/pricing-configuration/config'
		],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/inventory-setup/pricing-formula-templates': {
		pageUrls: [
			'/medora/home/inventory-setup/pricing-configuration/formula-templates'
		],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/inventory-setup/reorder-level': {
		pageUrls: ['/medora/home/inventory-setup/reorder-level'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/inventory-setup/stock-alerts': {
		pageUrls: [
			'/medora/home/inventory-setup/stock-alerts/policy',
			'/medora/home/inventory-setup/stock-alerts/recipients'
		],
		actions: {
			GET: PageActionEnum.VIEW,
			PUT: PageActionEnum.EDIT
		}
	},
	'/inventory-setup/stores': {
		pageUrls: ['/medora/home/inventory-setup/stores'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/inventory-setup/supplier-setup': {
		pageUrls: ['/medora/home/inventory-setup/supplier-setup'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/inventory-setup/unit-master': {
		pageUrls: ['/medora/home/inventory-setup/unit-master'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/inventory/department-consumption': {
		pageUrls: ['/medora/home/inventory/department-consumption'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/inventory/department-consumption/approve': {
		pageUrls: ['/medora/home/inventory/department-consumption'],
		action: PageActionEnum.APPROVE
	},
	'/inventory/department-consumption/cancel': {
		pageUrls: ['/medora/home/inventory/department-consumption'],
		action: PageActionEnum.CANCEL
	},
	'/inventory/department-indent': {
		pageUrls: ['/medora/home/inventory/department-indent'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/inventory/department-indent/approve': {
		pageUrls: ['/medora/home/inventory/department-indent'],
		action: PageActionEnum.APPROVE
	},
	'/inventory/department-indent/cancel': {
		pageUrls: ['/medora/home/inventory/department-indent'],
		action: PageActionEnum.CANCEL
	},
	'/inventory/department-indent/issue': {
		pageUrls: ['/medora/home/inventory/department-indent'],
		action: PageActionEnum.ISSUE
	},
	'/inventory/department-indent/receive': {
		pageUrls: ['/medora/home/inventory/department-indent'],
		action: PageActionEnum.RECEIVE
	},
	'/inventory/department-issue': {
		pageUrls: ['/medora/home/inventory/department-issue'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/inventory/department-issue/approve': {
		pageUrls: ['/medora/home/inventory/department-issue'],
		action: PageActionEnum.APPROVE
	},
	'/inventory/department-issue/cancel': {
		pageUrls: ['/medora/home/inventory/department-issue'],
		action: PageActionEnum.CANCEL
	},
	'/inventory/department-issue/from-indent': {
		pageUrls: ['/medora/home/inventory/department-issue'],
		action: PageActionEnum.CREATE
	},
	'/inventory/department-issue/receive': {
		pageUrls: ['/medora/home/inventory/department-issue'],
		action: PageActionEnum.RECEIVE
	},
	'/inventory/grn': {
		pageUrls: ['/medora/home/inventory/grn'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/inventory/grn/received-by-search': {
		pageUrls: ['/medora/home/inventory/grn'],
		action: PageActionEnum.VIEW
	},
	'/inventory/grn/transfer-to-requesting-store': {
		pageUrls: ['/medora/home/inventory/grn'],
		action: PageActionEnum.EDIT
	},
	'/inventory/purchase-order': {
		pageUrls: ['/medora/home/inventory/purchase-order'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/inventory/purchase-order/approve': {
		pageUrls: ['/medora/home/inventory/purchase-order'],
		action: PageActionEnum.APPROVE
	},
	'/inventory/purchase-order/close-line': {
		pageUrls: ['/medora/home/inventory/purchase-order'],
		action: PageActionEnum.EDIT
	},
	'/inventory/purchase-order/resubmit': {
		pageUrls: ['/medora/home/inventory/purchase-order'],
		action: PageActionEnum.EDIT
	},
	'/inventory/purchase-order/send': {
		pageUrls: ['/medora/home/inventory/purchase-order'],
		action: PageActionEnum.EDIT
	},
	'/inventory/purchase-requisition': {
		pageUrls: ['/medora/home/inventory/purchase-requisition'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	},
	'/inventory/purchase-requisition/approve': {
		pageUrls: ['/medora/home/inventory/purchase-requisition'],
		action: PageActionEnum.APPROVE
	},
	'/inventory/purchase-requisition/cancel': {
		pageUrls: ['/medora/home/inventory/purchase-requisition'],
		action: PageActionEnum.CANCEL
	},
	'/inventory/purchase-requisition/close-line': {
		pageUrls: ['/medora/home/inventory/purchase-requisition'],
		action: PageActionEnum.EDIT
	},
	'/inventory/purchase-requisition/item-metrics': {
		pageUrls: ['/medora/home/inventory/purchase-requisition'],
		action: PageActionEnum.VIEW
	},
	'/inventory/purchase-requisition/resubmit': {
		pageUrls: ['/medora/home/inventory/purchase-requisition'],
		action: PageActionEnum.EDIT
	},
	'/inventory/reports/expired': {
		pageUrls: ['/medora/home/inventory/reports/expired'],
		action: PageActionEnum.EXPORT
	},
	'/inventory/reports/low-stock': {
		pageUrls: ['/medora/home/inventory/reports/low-stock'],
		action: PageActionEnum.EXPORT
	},
	'/inventory/reports/movement': {
		pageUrls: ['/medora/home/inventory/reports/movement'],
		action: PageActionEnum.EXPORT
	},
	'/inventory/stock': {
		pageUrls: ['/medora/home/inventory/stock'],
		action: PageActionEnum.VIEW
	},
	'/inventory/stock-alerts': {
		pageUrls: [
			'/medora/home/inventory/stock',
			'/medora/home/inventory-setup/stock-alerts/policy'
		],
		action: PageActionEnum.VIEW
	},
	'/medication-order/external-sales': {
		pageUrls: ['/medora/home/medication-order/external-sales'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/medication-order/internal-sales': {
		pageUrls: ['/medora/home/medication-order/internal-sales'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/nursing-workbench/care-plan': {
		pageUrls: ['/medora/home/nursing-workbench/care-plan'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/nursing-workbench/emar': {
		pageUrls: ['/medora/home/nursing-workbench/emar'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/nursing-workbench/emr/allergy': {
		pageUrls: ['/medora/home/nursing-workbench/allergy'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/nursing-workbench/emr/case-sheet': {
		pageUrls: ['/medora/home/nursing-workbench/case-sheet'],
		action: PageActionEnum.VIEW
	},
	'/nursing-workbench/emr/clinical-document': {
		pageUrls: ['/medora/home/nursing-workbench/clinical-document'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/nursing-workbench/emr/nursing-complete': {
		pageUrls: ['/medora/home/nursing-workbench/nursing-complete'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.EDIT
		}
	},
	'/nursing-workbench/emr/order': {
		pageUrls: [
			'/medora/home/nursing-workbench/order',
			'/medora/home/nursing-workbench/nursing-complete'
		],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/nursing-workbench/emr/patient-attachment': {
		pageUrls: [
			'/medora/home/nursing-workbench/patient-attachment',
			'/medora/home/registration/patient/registration'
		],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.UPLOAD
		}
	},
	'/nursing-workbench/emr/patient-visit-history-dashboard': {
		pageUrls: [
			'/medora/home/nursing-workbench/patient-visit-history-dashboard'
		],
		action: PageActionEnum.VIEW
	},
	'/nursing-workbench/emr/patient-visit-history-dashboard/visual': {
		// Journal/Visual are chart sub-tabs without their own page row.
		pageUrls: [
			'/medora/home/nursing-workbench/patient-visit-history-dashboard'
		],
		action: PageActionEnum.VIEW
	},
	'/nursing-workbench/emr/vital': {
		pageUrls: ['/medora/home/nursing-workbench/vital'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW,
			PATCH: PageActionEnum.EDIT,
			POST: PageActionEnum.CREATE
		}
	},
	'/nursing-workbench/ipd/census': {
		pageUrls: ['/medora/home/nursing-workbench/census'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.EDIT
		}
	},
	'/nursing-workbench/trauma-log': {
		pageUrls: ['/medora/home/nursing-workbench/trauma-log'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/obstetrics': {
		pageUrls: [
			'/medora/home/obstetrics/labor-board',
			'/medora/home/obstetrics/partogram'
		],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/perioperative/events': {
		pageUrls: [
			'/medora/home/perioperative/ot-board',
			'/medora/home/perioperative/cases',
			'/medora/home/perioperative/pre-op',
			'/medora/home/perioperative/procedure-log'
		],
		action: PageActionEnum.VIEW
	},
	'/perioperative/ot-room': {
		pageUrls: [
			'/medora/home/perioperative/ot-board',
			'/medora/home/perioperative/cases',
			'/medora/home/perioperative/room-setup'
		],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/perioperative/surgical-case': {
		pageUrls: [
			'/medora/home/perioperative/ot-board',
			'/medora/home/perioperative/cases',
			'/medora/home/perioperative/pre-op',
			'/medora/home/perioperative/procedure-log'
		],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE
		}
	},
	'/registration/patient/list': {
		pageUrls: ['/medora/home/registration/patient/list'],
		actions: {
			DELETE: PageActionEnum.DELETE,
			GET: PageActionEnum.VIEW
		}
	},
	'/registration/patient/registration': {
		pageUrls: ['/medora/home/registration/patient/registration'],
		actions: {
			GET: PageActionEnum.VIEW,
			POST: PageActionEnum.CREATE,
			PUT: PageActionEnum.EDIT
		}
	}
};

/** Page URLs (if any) whose grant this route requires. Empty = none needed. */
export function routePageUrls(permission: RoutePermission): string[] {
	if ('selfService' in permission || 'homeWide' in permission)
		return [];
	return permission.pageUrls;
}

/** Action a route requires for an HTTP method; null = no page grant needed. */
export function routeAction(
	permission: RoutePermission,
	method: string
): PageActionEnum | null {
	if ('selfService' in permission || 'homeWide' in permission)
		return null;
	if ('action' in permission) return permission.action;
	return (
		permission.actions[method.toUpperCase() as RouteMethod] ?? null
	);
}
