export enum WebRoutesEnum {
	DEFAULT = '/',

	// public
	ONBOARDING = '/onboarding',
	ONBOARDING_MARKETPLACE = '/onboarding/marketplace',
	LOGIN = '/auth/login',
	SIGNUP = '/auth/signup',
	RESET_PASSWORD = '/auth/reset-password',
	EMAIL_VERIFICATION = '/auth/email-verification',
	TWO_FACTOR = '/auth/two-factor',
	TWO_FACTOR_SETUP = '/auth/two-factor/setup',
	PLUGIN = '/plugin',
	PRICING = '/pricing',
	/** Public documentation shell (opens from Help in a new tab). */
	DOCS = '/docs',

	// private - medora
	MEDORA = '/medora',
	/** Hospital list / select (choose hospital before modules). */
	MEDORA_HOSPITAL = '/medora/hospital',
	/** Menzies product hub (NextUp, patient/doctor apps). */
	MEDORA_ECOSYSTEM = '/medora/ecosystem',
	/** System admin overview (SYSTEM_ADMIN only). */
	MEDORA_ADMIN = '/medora/admin',
	MEDORA_ADMIN_OWNERS = '/medora/admin/owners',
	MEDORA_ADMIN_HOSPITALS = '/medora/admin/hospitals',
	MEDORA_ADMIN_STAFF = '/medora/admin/staff',
	MEDORA_ADMIN_MONITORING = '/medora/admin/monitoring',
	MEDORA_ADMIN_ICD = '/medora/admin/icd',
	MEDORA_ADMIN_TEAM = '/medora/admin/team',

	// Legacy base paths (DB stores /medora/home/...; use medoraHospitalHome(hospitalId) + suffix for real URLs)
	MEDORA_HOME = '/medora/home',
	MEDORA_HOME_ADMINISTRATION = '/medora/home/administration',
	MEDORA_HOME_ADMINISTRATION_STAFF = '/medora/home/administration/staff',
	MEDORA_HOME_ADMINISTRATION_STAFF_REGISTRATION = '/medora/home/administration/staff/registration',
	MEDORA_HOME_ADMINISTRATION_STAFF_LIST = '/medora/home/administration/staff/list',
	MEDORA_HOME_ADMINISTRATION_BRANCHES = '/medora/home/administration/branches',
	MEDORA_HOME_ADMINISTRATION_MEDICATION_ORDER_SETUP = '/medora/home/administration/medication-order-setup',
	MEDORA_HOME_ADMINISTRATION_MEDICATION_ORDER_SETUP_FREQUENCY = '/medora/home/administration/medication-order-setup/frequency',
	MEDORA_HOME_ADMINISTRATION_MEDICATION_ORDER_SETUP_FORM = '/medora/home/administration/medication-order-setup/form',
	MEDORA_HOME_ADMINISTRATION_MEDICATION_ORDER_SETUP_ROUTE = '/medora/home/administration/medication-order-setup/route',
	MEDORA_HOME_ADMINISTRATION_MEDICATION_ORDER_SETUP_DURATION = '/medora/home/administration/medication-order-setup/duration',
	MEDORA_HOME_ADMINISTRATION_MEDICATION_ORDER_SETUP_ORDER_TYPE = '/medora/home/administration/medication-order-setup/order-type',
	MEDORA_HOME_ADMINISTRATION_MEDICATION_ORDER_SETUP_DOSE_UNIT = '/medora/home/administration/medication-order-setup/dose-unit',
	MEDORA_HOME_ADMINISTRATION_MEDICATION_ORDER_SETUP_FOOD_RELATION = '/medora/home/administration/medication-order-setup/food-relation',
	MEDORA_HOME_REGISTRATION = '/medora/home/registration',
	MEDORA_HOME_REGISTRATION_PATIENT = '/medora/home/registration/patient',
	MEDORA_HOME_REGISTRATION_PATIENT_REGISTRATION = '/medora/home/registration/patient/registration',
	MEDORA_HOME_REGISTRATION_PATIENT_LIST = '/medora/home/registration/patient/list',
	MEDORA_HOME_ACCOUNT = '/medora/home/account',
	MEDORA_HOME_ECOSYSTEM = '/medora/home/ecosystem',

	// Nursing Workbench module (navbar auto-hides; sub-pages: Vital, Diagnosis)
	MEDORA_HOME_NURSING_WORKBENCH = '/medora/home/nursing-workbench',
	MEDORA_HOME_NURSING_WORKBENCH_EMR = '/medora/home/nursing-workbench/emr',
	MEDORA_HOME_NURSING_WORKBENCH_EMR_PATIENT_VISIT_HISTORY_DASHBOARD = '/medora/home/nursing-workbench/emr/patient-visit-history-dashboard',
	MEDORA_HOME_NURSING_WORKBENCH_EMR_VITAL = '/medora/home/nursing-workbench/emr/vital',
	MEDORA_HOME_NURSING_WORKBENCH_EMR_DIAGNOSIS = '/medora/home/nursing-workbench/emr/diagnosis',
	MEDORA_HOME_NURSING_WORKBENCH_ED = '/medora/home/nursing-workbench/ed',
	MEDORA_HOME_NURSING_WORKBENCH_ED_TRACK_BOARD = '/medora/home/nursing-workbench/ed/track-board',
	MEDORA_HOME_NURSING_WORKBENCH_ED_VITAL = '/medora/home/nursing-workbench/ed/vital',
	MEDORA_HOME_NURSING_WORKBENCH_ED_ALLERGY = '/medora/home/nursing-workbench/ed/allergy',
	MEDORA_HOME_NURSING_WORKBENCH_ED_PATIENT_ATTACHMENT = '/medora/home/nursing-workbench/ed/patient-attachment',
	MEDORA_HOME_NURSING_WORKBENCH_ED_CLINICAL_DOCUMENT = '/medora/home/nursing-workbench/ed/clinical-document',
	MEDORA_HOME_NURSING_WORKBENCH_ED_CASE_SHEET = '/medora/home/nursing-workbench/ed/case-sheet',
	MEDORA_HOME_NURSING_WORKBENCH_ED_ORDER = '/medora/home/nursing-workbench/ed/order',
	MEDORA_HOME_NURSING_WORKBENCH_ED_NURSING_COMPLETE = '/medora/home/nursing-workbench/ed/nursing-complete',
	MEDORA_HOME_NURSING_WORKBENCH_ED_TRIAGE = '/medora/home/nursing-workbench/ed/triage',
	MEDORA_HOME_NURSING_WORKBENCH_ED_TRAUMA_LOG = '/medora/home/nursing-workbench/ed/trauma-log',

	// Consultation module (navbar auto-hides like nursing EMR)
	MEDORA_HOME_CONSULTATION = '/medora/home/consultation',
	MEDORA_HOME_CONSULTATION_EMR = '/medora/home/consultation/emr',
	MEDORA_HOME_CONSULTATION_CPOE = '/medora/home/consultation/cpoe',
	MEDORA_HOME_CONSULTATION_CPOE_ORDER = '/medora/home/consultation/cpoe/order',
	MEDORA_HOME_CONSULTATION_CPOE_PRESCRIPTION = '/medora/home/consultation/cpoe/prescription',
	MEDORA_HOME_CONSULTATION_CPOE_REFER = '/medora/home/consultation/cpoe/refer',

	// ADT module
	MEDORA_HOME_ADT = '/medora/home/adt',
	MEDORA_HOME_ADT_BED_STATUS = '/medora/home/adt/bed-status',
	MEDORA_HOME_ADT_ADMISSION = '/medora/home/adt/admission',
	MEDORA_HOME_ADT_ADMISSION_NEW = '/medora/home/adt/admission/new',
	MEDORA_HOME_ADT_ADMISSION_LIST = '/medora/home/adt/admission/list',
	MEDORA_HOME_ADT_ADMISSION_PENDING = '/medora/home/adt/admission/pending',
	MEDORA_HOME_ADT_BOOKING = '/medora/home/adt/booking',
	MEDORA_HOME_ADT_BOOKING_NEW = '/medora/home/adt/booking/new',
	MEDORA_HOME_ADT_BOOKING_LIST = '/medora/home/adt/booking/list',
	MEDORA_HOME_ADT_BED_TRANSFER_REQUISITION = '/medora/home/adt/bed-transfer-requisition',
	MEDORA_HOME_ADT_BED_TRANSFER_REQUISITION_NEW = '/medora/home/adt/bed-transfer-requisition/new',
	MEDORA_HOME_ADT_BED_TRANSFER_REQUISITION_LIST = '/medora/home/adt/bed-transfer-requisition/list',

	// Billing module (navbar auto-hides like nursing EMR)
	MEDORA_HOME_BILLING = '/medora/home/billing',
	MEDORA_HOME_BILLING_OP_BILLING = '/medora/home/billing/op-billing',
	MEDORA_HOME_BILLING_IP_BILLING = '/medora/home/billing/ip-billing',
	MEDORA_HOME_BILLING_IP_BILLING_BILL = '/medora/home/billing/ip-billing/bill',
	MEDORA_HOME_BILLING_IP_ADVANCE_DEPOSIT = '/medora/home/billing/ip-billing/advance-deposit',
	MEDORA_HOME_BILLING_OT_BILLING = '/medora/home/billing/ot-billing',

	// Medication Order module (navbar auto-hides like nursing EMR)
	MEDORA_HOME_MEDICATION_ORDER = '/medora/home/medication-order',
	MEDORA_HOME_MEDICATION_ORDER_INTERNAL_SALES = '/medora/home/medication-order/internal-sales',
	MEDORA_HOME_MEDICATION_ORDER_EXTERNAL_SALES = '/medora/home/medication-order/external-sales',

	// Serice Item
	MEDORA_HOME_SERVICE_ITEM = '/medora/home/service-item',
	MEDORA_HOME_SERVICE_ITEM_SERVICE = '/medora/home/service-item/service',
	MEDORA_HOME_SERVICE_ITEM_CREATE = '/medora/home/service-item/service/create',
	MEDORA_HOME_SERVICE_ITEM_TAGGING = '/medora/home/service-item/service/tagging',

	// Operation Theatre module
	MEDORA_HOME_OPERATION_THEATRE = '/medora/home/operation-theatre',
	MEDORA_HOME_OPERATION_THEATRE_SCHEDULER = '/medora/home/operation-theatre/ot-scheduler',
	MEDORA_HOME_OPERATION_THEATRE_REGISTRATION = '/medora/home/operation-theatre/registration',
	MEDORA_HOME_OPERATION_THEATRE_REGISTRATION_OT_PATIENT = '/medora/home/operation-theatre/registration/ot-patient',
	MEDORA_HOME_OPERATION_THEATRE_REGISTRATION_NEW_PATIENT = '/medora/home/operation-theatre/registration/new-patient',
	MEDORA_HOME_OPERATION_THEATRE_REGISTRATION_LIST = '/medora/home/operation-theatre/registration/list',
	MEDORA_HOME_OPERATION_THEATRE_BOOKING_DETAILS = '/medora/home/operation-theatre/booking-details',
	MEDORA_HOME_OPERATION_THEATRE_WARD_TO_OT = '/medora/home/operation-theatre/ward-to-ot',
	MEDORA_HOME_OPERATION_THEATRE_REPORTS = '/medora/home/operation-theatre/reports',
	MEDORA_HOME_OPERATION_THEATRE_MASTER = '/medora/home/operation-theatre/ot-master',

	// Emergency module
	MEDORA_HOME_EMERGENCY = '/medora/home/emergency',
	/** @deprecated Use MEDORA_HOME_NURSING_WORKBENCH_ED_*; legacy paths redirect. */
	MEDORA_HOME_EMERGENCY_TRACK_BOARD = '/medora/home/nursing-workbench/ed/track-board',
	/** @deprecated Use MEDORA_HOME_NURSING_WORKBENCH_ED_TRIAGE; legacy paths redirect. */
	MEDORA_HOME_EMERGENCY_TRIAGE = '/medora/home/nursing-workbench/ed/triage',
	/** @deprecated Use MEDORA_HOME_NURSING_WORKBENCH_ED_TRAUMA_LOG; legacy paths redirect. */
	MEDORA_HOME_EMERGENCY_TRAUMA_LOG = '/medora/home/nursing-workbench/ed/trauma-log',
	MEDORA_HOME_EMERGENCY_ADMISSION = '/medora/home/emergency/admission',
	MEDORA_HOME_EMERGENCY_ADMISSION_NEW = '/medora/home/emergency/admission/new',
	MEDORA_HOME_EMERGENCY_ADMISSION_LIST = '/medora/home/emergency/admission/list',
	MEDORA_HOME_EMERGENCY_PURCHASE_ITEM = '/medora/home/emergency/purchase-item',
	MEDORA_HOME_BILLING_ER_BILLING = '/medora/home/billing/er-billing',
	MEDORA_HOME_ADMINISTRATION_ER_BILLING_SETUP = '/medora/home/administration/er-billing-setup'
}

/** Base path for a hospital's home (modules: administration, appointment, registration). hospitalId is UUID string. */
export function medoraHospitalHome(hospitalId: string): string {
	return `/medora/hospital/${hospitalId}/home`;
}

/**
 * Rewrite DB page URL (/medora/home/...) to hospital-scoped URL.
 */
export function medoraHospitalPageUrl(
	hospitalId: string,
	pageUrl: string | null
): string {
	if (!pageUrl || !pageUrl.startsWith('/medora/home'))
		return pageUrl ?? '';
	return `/medora/hospital/${hospitalId}/home${pageUrl.slice('/medora/home'.length) || ''}`;
}

/**
 * Convert request pathname under hospital home to DB page URL (/medora/home/...).
 * Returns null if pathname is not under /medora/hospital/{hospitalId}/home.
 */
export function requestPathToDbPageUrl(
	pathname: string,
	hospitalId: string
): string | null {
	const prefix = `/medora/hospital/${hospitalId}/home`;
	if (!pathname.startsWith(prefix)) return null;
	const suffix = pathname.slice(prefix.length) || '';
	const dbPath = '/medora/home' + (suffix === '/' ? '' : suffix);
	return dbPath.replace(/\/$/, '') || '/medora/home';
}

export enum ServerRoutesEnum {}
