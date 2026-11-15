import {
	BillingStatusTaggingEnum,
	ClinicalFormInstanceStatusTaggingEnum,
	IpdAdmissionOrderStatusTaggingEnum,
	IpdBedBookingStatusTaggingEnum,
	IpdBedStatusEnum,
	IpdBedTransferReqStatusTaggingEnum,
	InvDepartmentConsumptionStatusTaggingEnum,
	InvDepartmentIndentStatusTaggingEnum,
	InvDepartmentIssueStatusTaggingEnum,
	InvGrnStatusTaggingEnum,
	InvPoStatusTaggingEnum,
	InvPrStatusTaggingEnum,
	InvStockIssueStatusTaggingEnum,
	InvStoreTransferStatusTaggingEnum,
	SeverityEnum,
	SurgicalCaseStatusTaggingEnum,
	VisitStatusTaggingEnum,
	VisitTypeEnum
} from '$lib/model/enum/db-link';
import { PrescribingAlertSeverityEnum } from '$lib/model/enum/clinical-platform.enum';
import { EdBoardColumnEnum } from '$lib/model/enum/perioperative.enum';
import { StatusColorEnum } from '$lib/model/enum/color.enum';
import { DAISYUI_DEFAULT_HEX } from '$lib/tool/color/color-daisyui-default.util';

export const HOSPITAL_COLOR_CATEGORY = {
	VISIT_TYPE: 'visit_type',
	STATUS_TAGGING: 'status_tagging',
	ED_TRIAGE_LEVEL: 'ed_triage_level',
	TRAUMA_ACTIVATION_LEVEL: 'trauma_activation_level',
	ED_BOARD_COLUMN: 'ed_board_column',
	BED_STATUS: 'bed_status',
	SEVERITY: 'severity',
	PRESCRIBING_ALERT_SEVERITY: 'prescribing_alert_severity',
	STOCK_ALERT_SEVERITY: 'stock_alert_severity'
} as const;

export type HospitalColorCategory =
	(typeof HOSPITAL_COLOR_CATEGORY)[keyof typeof HOSPITAL_COLOR_CATEGORY];

export type ColorCatalogSectionId =
	| 'visit_type'
	| 'visit_status'
	| 'ed_triage'
	| 'trauma'
	| 'ed_board'
	| 'bed_status'
	| 'severity'
	| 'prescribing'
	| 'stock_alert'
	| 'doctor_appointment'
	| 'purchase_requisition'
	| 'purchase_order'
	| 'grn'
	| 'store_transfer'
	| 'stock_issue'
	| 'dept_indent'
	| 'dept_issue'
	| 'dept_consumption'
	| 'billing'
	| 'ipd_booking'
	| 'ipd_transfer'
	| 'ipd_admission_order'
	| 'surgical_case'
	| 'clinical_form';

export type ColorPreviewKind =
	| 'visit_bar'
	| 'badge'
	| 'ribbon'
	| 'board'
	| 'bed'
	| 'alert';

export type ColorConfigurationSection = {
	readonly id: ColorCatalogSectionId;
	readonly preview: ColorPreviewKind;
};

/** Index rows. Static so the list renders before the color API returns. */
export const COLOR_CONFIGURATION_SECTIONS: readonly ColorConfigurationSection[] =
	[
		{ id: 'visit_type', preview: 'visit_bar' },
		{ id: 'visit_status', preview: 'badge' },
		{ id: 'ed_triage', preview: 'ribbon' },
		{ id: 'trauma', preview: 'ribbon' },
		{ id: 'ed_board', preview: 'board' },
		{ id: 'bed_status', preview: 'bed' },
		{ id: 'severity', preview: 'alert' },
		{ id: 'prescribing', preview: 'alert' },
		{ id: 'stock_alert', preview: 'alert' },
		{ id: 'doctor_appointment', preview: 'badge' },
		{ id: 'purchase_requisition', preview: 'badge' },
		{ id: 'purchase_order', preview: 'badge' },
		{ id: 'grn', preview: 'badge' },
		{ id: 'store_transfer', preview: 'badge' },
		{ id: 'stock_issue', preview: 'badge' },
		{ id: 'dept_indent', preview: 'badge' },
		{ id: 'dept_issue', preview: 'badge' },
		{ id: 'dept_consumption', preview: 'badge' },
		{ id: 'billing', preview: 'badge' },
		{ id: 'ipd_booking', preview: 'badge' },
		{ id: 'ipd_transfer', preview: 'badge' },
		{ id: 'ipd_admission_order', preview: 'badge' },
		{ id: 'surgical_case', preview: 'badge' },
		{ id: 'clinical_form', preview: 'badge' }
	];

export type ColorCatalogEntry = {
	readonly category: HospitalColorCategory;
	readonly entityKey: string;
	readonly sectionId: ColorCatalogSectionId;
	readonly label: string;
	readonly defaultColor: string;
};

function statusDefault(name: string): string {
	const n = name.toLowerCase();
	if (n.includes('cancel') || n.includes('reject')) {
		return DAISYUI_DEFAULT_HEX.error;
	}
	if (n.includes('draft')) return DAISYUI_DEFAULT_HEX.neutral;
	if (n.includes('pending') || n.includes('sent back')) {
		return DAISYUI_DEFAULT_HEX.warning;
	}
	if (
		n.includes('approved') ||
		n.includes('posted') ||
		n.includes('complete') ||
		n.includes('closed') ||
		n.includes('admitted') ||
		n.includes('converted') ||
		n.includes('received') ||
		n.includes('issued')
	) {
		return DAISYUI_DEFAULT_HEX.success;
	}
	if (n.includes('open') || n.includes('confirmed')) {
		return DAISYUI_DEFAULT_HEX.info;
	}
	return DAISYUI_DEFAULT_HEX.primary;
}

function tagging(
	id: number,
	label: string,
	sectionId: ColorCatalogSectionId
): ColorCatalogEntry {
	return {
		category: HOSPITAL_COLOR_CATEGORY.STATUS_TAGGING,
		entityKey: String(id),
		sectionId,
		label,
		defaultColor: statusDefault(label)
	};
}

const VISIT_TYPE_ENTRIES: ColorCatalogEntry[] = [
	{
		category: HOSPITAL_COLOR_CATEGORY.VISIT_TYPE,
		entityKey: String(VisitTypeEnum.OPD),
		sectionId: 'visit_type',
		label: 'OPD',
		defaultColor: DAISYUI_DEFAULT_HEX.primary
	},
	{
		category: HOSPITAL_COLOR_CATEGORY.VISIT_TYPE,
		entityKey: String(VisitTypeEnum.IPD),
		sectionId: 'visit_type',
		label: 'IPD',
		defaultColor: DAISYUI_DEFAULT_HEX.secondary
	},
	{
		category: HOSPITAL_COLOR_CATEGORY.VISIT_TYPE,
		entityKey: String(VisitTypeEnum.ED),
		sectionId: 'visit_type',
		label: 'ED',
		defaultColor: DAISYUI_DEFAULT_HEX.error
	},
	{
		category: HOSPITAL_COLOR_CATEGORY.VISIT_TYPE,
		entityKey: String(VisitTypeEnum.DAY_CARE),
		sectionId: 'visit_type',
		label: 'DayCare',
		defaultColor: DAISYUI_DEFAULT_HEX.info
	},
	{
		category: HOSPITAL_COLOR_CATEGORY.VISIT_TYPE,
		entityKey: String(VisitTypeEnum.PACKAGE),
		sectionId: 'visit_type',
		label: 'Package',
		defaultColor: DAISYUI_DEFAULT_HEX.accent
	}
];

const VISIT_STATUS_ENTRIES: ColorCatalogEntry[] = [
	tagging(VisitStatusTaggingEnum.OPEN, 'Open', 'visit_status'),
	tagging(VisitStatusTaggingEnum.VITAL, 'Vital', 'visit_status'),
	tagging(VisitStatusTaggingEnum.SEEN, 'Seen', 'visit_status'),
	tagging(
		VisitStatusTaggingEnum.CLOSED_DISCHARGED,
		'Closed / Discharged',
		'visit_status'
	)
];

const DOCTOR_APPOINTMENT_ENTRIES: ColorCatalogEntry[] = [
	tagging(1, 'Unconfirmed', 'doctor_appointment'),
	tagging(2, 'Confirmed', 'doctor_appointment'),
	tagging(3, 'Check In', 'doctor_appointment'),
	tagging(4, 'Cancelled', 'doctor_appointment')
];

const INV_PR_ENTRIES = Object.values(InvPrStatusTaggingEnum)
	.filter((v) => typeof v === 'number')
	.map((id) => {
		const labels: Record<number, string> = {
			[InvPrStatusTaggingEnum.DRAFT]: 'Draft',
			[InvPrStatusTaggingEnum.PENDING]: 'Pending',
			[InvPrStatusTaggingEnum.APPROVED]: 'Approved',
			[InvPrStatusTaggingEnum.REJECTED]: 'Rejected',
			[InvPrStatusTaggingEnum.SENT_BACK]: 'Sent Back',
			[InvPrStatusTaggingEnum.CANCELLED]: 'Cancelled'
		};
		return tagging(
			id as number,
			labels[id as number] ?? String(id),
			'purchase_requisition'
		);
	});

function labeledStatus(
	enumObj: Record<string, number | string>,
	labels: Record<number, string>,
	sectionId: ColorCatalogSectionId
): ColorCatalogEntry[] {
	return Object.values(enumObj)
		.filter((v): v is number => typeof v === 'number')
		.map((id) => tagging(id, labels[id] ?? String(id), sectionId));
}

const INV_PO_ENTRIES = labeledStatus(
	InvPoStatusTaggingEnum,
	{
		[InvPoStatusTaggingEnum.DRAFT]: 'Draft',
		[InvPoStatusTaggingEnum.PENDING]: 'Pending',
		[InvPoStatusTaggingEnum.APPROVED]: 'Approved',
		[InvPoStatusTaggingEnum.REJECTED]: 'Rejected',
		[InvPoStatusTaggingEnum.SENT_BACK]: 'Sent back',
		[InvPoStatusTaggingEnum.SENT_TO_SUPPLIER]: 'Sent to supplier',
		[InvPoStatusTaggingEnum.PARTIALLY_RECEIVED]: 'Partially received',
		[InvPoStatusTaggingEnum.CLOSED]: 'Closed'
	},
	'purchase_order'
);

const OTHER_STATUS_ENTRIES: ColorCatalogEntry[] = [
	...labeledStatus(
		InvGrnStatusTaggingEnum,
		{
			[InvGrnStatusTaggingEnum.DRAFT]: 'Draft',
			[InvGrnStatusTaggingEnum.POSTED]: 'Posted',
			[InvGrnStatusTaggingEnum.CANCELLED]: 'Cancelled'
		},
		'grn'
	),
	...labeledStatus(
		InvStoreTransferStatusTaggingEnum,
		{
			[InvStoreTransferStatusTaggingEnum.DRAFT]: 'Draft',
			[InvStoreTransferStatusTaggingEnum.POSTED]: 'Posted',
			[InvStoreTransferStatusTaggingEnum.CANCELLED]: 'Cancelled'
		},
		'store_transfer'
	),
	...labeledStatus(
		InvStockIssueStatusTaggingEnum,
		{
			[InvStockIssueStatusTaggingEnum.DRAFT]: 'Draft',
			[InvStockIssueStatusTaggingEnum.POSTED]: 'Posted',
			[InvStockIssueStatusTaggingEnum.CANCELLED]: 'Cancelled'
		},
		'stock_issue'
	),
	...labeledStatus(
		InvDepartmentIndentStatusTaggingEnum,
		{
			[InvDepartmentIndentStatusTaggingEnum.DRAFT]: 'Draft',
			[InvDepartmentIndentStatusTaggingEnum.PENDING]: 'Pending',
			[InvDepartmentIndentStatusTaggingEnum.PENDING_CENTRAL]:
				'Pending central',
			[InvDepartmentIndentStatusTaggingEnum.ISSUED]: 'Issued',
			[InvDepartmentIndentStatusTaggingEnum.RECEIVED]: 'Received',
			[InvDepartmentIndentStatusTaggingEnum.CANCELLED]: 'Cancelled'
		},
		'dept_indent'
	),
	...labeledStatus(
		InvDepartmentIssueStatusTaggingEnum,
		{
			[InvDepartmentIssueStatusTaggingEnum.PENDING]: 'Pending',
			[InvDepartmentIssueStatusTaggingEnum.ISSUED]: 'Issued',
			[InvDepartmentIssueStatusTaggingEnum.RECEIVED]: 'Received',
			[InvDepartmentIssueStatusTaggingEnum.CANCELLED]: 'Cancelled'
		},
		'dept_issue'
	),
	...labeledStatus(
		InvDepartmentConsumptionStatusTaggingEnum,
		{
			[InvDepartmentConsumptionStatusTaggingEnum.DRAFT]: 'Draft',
			[InvDepartmentConsumptionStatusTaggingEnum.PENDING]: 'Pending',
			[InvDepartmentConsumptionStatusTaggingEnum.POSTED]: 'Posted',
			[InvDepartmentConsumptionStatusTaggingEnum.CANCELLED]:
				'Cancelled'
		},
		'dept_consumption'
	),
	...labeledStatus(
		BillingStatusTaggingEnum,
		{
			[BillingStatusTaggingEnum.OPEN]: 'Open',
			[BillingStatusTaggingEnum.CLOSED]: 'Closed'
		},
		'billing'
	),
	...labeledStatus(
		IpdBedBookingStatusTaggingEnum,
		{
			[IpdBedBookingStatusTaggingEnum.BOOKED]: 'Booked',
			[IpdBedBookingStatusTaggingEnum.CANCELLED]: 'Cancelled',
			[IpdBedBookingStatusTaggingEnum.CONVERTED]: 'Converted'
		},
		'ipd_booking'
	),
	...labeledStatus(
		IpdBedTransferReqStatusTaggingEnum,
		{
			[IpdBedTransferReqStatusTaggingEnum.DRAFT]: 'Draft',
			[IpdBedTransferReqStatusTaggingEnum.PENDING]: 'Pending',
			[IpdBedTransferReqStatusTaggingEnum.APPROVED]: 'Approved',
			[IpdBedTransferReqStatusTaggingEnum.COMPLETED]: 'Completed',
			[IpdBedTransferReqStatusTaggingEnum.CANCELLED]: 'Cancelled'
		},
		'ipd_transfer'
	),
	...labeledStatus(
		IpdAdmissionOrderStatusTaggingEnum,
		{
			[IpdAdmissionOrderStatusTaggingEnum.PENDING]: 'Pending',
			[IpdAdmissionOrderStatusTaggingEnum.CANCELLED]: 'Cancelled',
			[IpdAdmissionOrderStatusTaggingEnum.ADMITTED]: 'Admitted'
		},
		'ipd_admission_order'
	),
	...labeledStatus(
		SurgicalCaseStatusTaggingEnum,
		{
			[SurgicalCaseStatusTaggingEnum.REQUESTED]: 'Requested',
			[SurgicalCaseStatusTaggingEnum.SCHEDULED]: 'Scheduled',
			[SurgicalCaseStatusTaggingEnum.PRE_OP_COMPLETE]:
				'Pre-op complete',
			[SurgicalCaseStatusTaggingEnum.IN_OR]: 'In OR',
			[SurgicalCaseStatusTaggingEnum.IN_PACU]: 'In PACU',
			[SurgicalCaseStatusTaggingEnum.COMPLETED]: 'Completed',
			[SurgicalCaseStatusTaggingEnum.CANCELLED]: 'Cancelled',
			[SurgicalCaseStatusTaggingEnum.PENDING_RESCHEDULE]:
				'Pending reschedule'
		},
		'surgical_case'
	),
	...labeledStatus(
		ClinicalFormInstanceStatusTaggingEnum,
		{
			[ClinicalFormInstanceStatusTaggingEnum.DRAFT]: 'Draft',
			[ClinicalFormInstanceStatusTaggingEnum.COMPLETE]: 'Complete',
			[ClinicalFormInstanceStatusTaggingEnum.AMENDED]: 'Amended'
		},
		'clinical_form'
	)
];

const BED_STATUS_ENTRIES: ColorCatalogEntry[] = [
	{
		category: HOSPITAL_COLOR_CATEGORY.BED_STATUS,
		entityKey: String(IpdBedStatusEnum.FREE),
		sectionId: 'bed_status',
		label: 'Free',
		defaultColor: DAISYUI_DEFAULT_HEX.success
	},
	{
		category: HOSPITAL_COLOR_CATEGORY.BED_STATUS,
		entityKey: String(IpdBedStatusEnum.OCCUPIED),
		sectionId: 'bed_status',
		label: 'Occupied',
		defaultColor: DAISYUI_DEFAULT_HEX.warning
	},
	{
		category: HOSPITAL_COLOR_CATEGORY.BED_STATUS,
		entityKey: String(IpdBedStatusEnum.BLOCKED),
		sectionId: 'bed_status',
		label: 'Blocked',
		defaultColor: DAISYUI_DEFAULT_HEX.error
	},
	{
		category: HOSPITAL_COLOR_CATEGORY.BED_STATUS,
		entityKey: String(IpdBedStatusEnum.CLEANING),
		sectionId: 'bed_status',
		label: 'Cleaning',
		defaultColor: DAISYUI_DEFAULT_HEX.info
	}
];

const ED_BOARD_ENTRIES: ColorCatalogEntry[] = (
	Object.values(EdBoardColumnEnum) as string[]
).map((code) => ({
	category: HOSPITAL_COLOR_CATEGORY.ED_BOARD_COLUMN,
	entityKey: code,
	sectionId: 'ed_board' as const,
	label: code
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' '),
	defaultColor:
		code === EdBoardColumnEnum.RESUS
			? DAISYUI_DEFAULT_HEX.error
			: code === EdBoardColumnEnum.FAST_TRACK
				? DAISYUI_DEFAULT_HEX.success
				: DAISYUI_DEFAULT_HEX.info
}));

const SEVERITY_ENTRIES: ColorCatalogEntry[] = [
	{
		category: HOSPITAL_COLOR_CATEGORY.SEVERITY,
		entityKey: String(SeverityEnum.MAJOR),
		sectionId: 'severity',
		label: 'Major',
		defaultColor: DAISYUI_DEFAULT_HEX.error
	},
	{
		category: HOSPITAL_COLOR_CATEGORY.SEVERITY,
		entityKey: String(SeverityEnum.MODERATE),
		sectionId: 'severity',
		label: 'Moderate',
		defaultColor: DAISYUI_DEFAULT_HEX.warning
	},
	{
		category: HOSPITAL_COLOR_CATEGORY.SEVERITY,
		entityKey: String(SeverityEnum.MINOR),
		sectionId: 'severity',
		label: 'Minor',
		defaultColor: DAISYUI_DEFAULT_HEX.info
	},
	{
		category: HOSPITAL_COLOR_CATEGORY.SEVERITY,
		entityKey: String(SeverityEnum.NO_ALERT),
		sectionId: 'severity',
		label: 'No Alert',
		defaultColor: DAISYUI_DEFAULT_HEX.neutral
	}
];

const PRESCRIBING_ENTRIES: ColorCatalogEntry[] = [
	{
		category: HOSPITAL_COLOR_CATEGORY.PRESCRIBING_ALERT_SEVERITY,
		entityKey: PrescribingAlertSeverityEnum.INFO,
		sectionId: 'prescribing',
		label: 'Info',
		defaultColor: DAISYUI_DEFAULT_HEX.info
	},
	{
		category: HOSPITAL_COLOR_CATEGORY.PRESCRIBING_ALERT_SEVERITY,
		entityKey: PrescribingAlertSeverityEnum.MODERATE,
		sectionId: 'prescribing',
		label: 'Moderate',
		defaultColor: DAISYUI_DEFAULT_HEX.warning
	},
	{
		category: HOSPITAL_COLOR_CATEGORY.PRESCRIBING_ALERT_SEVERITY,
		entityKey: PrescribingAlertSeverityEnum.SEVERE,
		sectionId: 'prescribing',
		label: 'Severe',
		defaultColor: DAISYUI_DEFAULT_HEX.error
	}
];

const STOCK_ALERT_ENTRIES: ColorCatalogEntry[] = [
	{
		category: HOSPITAL_COLOR_CATEGORY.STOCK_ALERT_SEVERITY,
		entityKey: StatusColorEnum.SUCCESS,
		sectionId: 'stock_alert',
		label: 'Success',
		defaultColor: DAISYUI_DEFAULT_HEX.success
	},
	{
		category: HOSPITAL_COLOR_CATEGORY.STOCK_ALERT_SEVERITY,
		entityKey: StatusColorEnum.INFO,
		sectionId: 'stock_alert',
		label: 'Info',
		defaultColor: DAISYUI_DEFAULT_HEX.info
	},
	{
		category: HOSPITAL_COLOR_CATEGORY.STOCK_ALERT_SEVERITY,
		entityKey: StatusColorEnum.WARNING,
		sectionId: 'stock_alert',
		label: 'Warning',
		defaultColor: DAISYUI_DEFAULT_HEX.warning
	},
	{
		category: HOSPITAL_COLOR_CATEGORY.STOCK_ALERT_SEVERITY,
		entityKey: StatusColorEnum.ERROR,
		sectionId: 'stock_alert',
		label: 'Error',
		defaultColor: DAISYUI_DEFAULT_HEX.error
	}
];

/** Default ED triage level colors (entity_key = level 1–5). */
export const ED_TRIAGE_LEVEL_DEFAULT_ENTRIES: ColorCatalogEntry[] = [
	{ level: 1, name: 'Level 1', color: DAISYUI_DEFAULT_HEX.error },
	{ level: 2, name: 'Level 2', color: DAISYUI_DEFAULT_HEX.warning },
	{ level: 3, name: 'Level 3', color: DAISYUI_DEFAULT_HEX.info },
	{ level: 4, name: 'Level 4', color: DAISYUI_DEFAULT_HEX.success },
	{ level: 5, name: 'Level 5', color: DAISYUI_DEFAULT_HEX.neutral }
].map((d) => ({
	category: HOSPITAL_COLOR_CATEGORY.ED_TRIAGE_LEVEL,
	entityKey: String(d.level),
	sectionId: 'ed_triage' as const,
	label: d.name,
	defaultColor: d.color
}));

export const STATIC_COLOR_CATALOG: readonly ColorCatalogEntry[] = [
	...VISIT_TYPE_ENTRIES,
	...VISIT_STATUS_ENTRIES,
	...ED_TRIAGE_LEVEL_DEFAULT_ENTRIES,
	...BED_STATUS_ENTRIES,
	...ED_BOARD_ENTRIES,
	...SEVERITY_ENTRIES,
	...PRESCRIBING_ENTRIES,
	...STOCK_ALERT_ENTRIES,
	...DOCTOR_APPOINTMENT_ENTRIES,
	...INV_PR_ENTRIES,
	...INV_PO_ENTRIES,
	...OTHER_STATUS_ENTRIES
];

export function hospitalColorMapKey(
	category: string,
	entityKey: string
): string {
	return `${category}:${entityKey}`;
}

export function findCatalogEntry(
	category: string,
	entityKey: string
): ColorCatalogEntry | undefined {
	return STATIC_COLOR_CATALOG.find(
		(e) => e.category === category && e.entityKey === entityKey
	);
}

export function defaultColorFor(
	category: string,
	entityKey: string
): string {
	return (
		findCatalogEntry(category, entityKey)?.defaultColor ??
		DAISYUI_DEFAULT_HEX.neutral
	);
}
