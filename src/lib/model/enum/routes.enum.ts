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
	PLUGIN = '/plugin',

	// private - medora
	MEDORA = '/medora',
	/** Hospital list / select (choose hospital before modules). */
	MEDORA_HOSPITAL = '/medora/hospital',
	/** System admin: owner management (SYSTEM_ADMIN only). */
	MEDORA_ADMIN_OWNERS = '/medora/admin/owners',

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

	// Nursing Workbench module (navbar auto-hides; sub-pages: Vital, Diagnosis)
	MEDORA_HOME_NURSING_WORKBENCH = '/medora/home/nursing-workbench',
	MEDORA_HOME_NURSING_WORKBENCH_EMR = '/medora/home/nursing-workbench/emr',
	MEDORA_HOME_NURSING_WORKBENCH_EMR_PATIENT_VISIT_HISTORY_DASHBOARD = '/medora/home/nursing-workbench/emr/patient-visit-history-dashboard',
	MEDORA_HOME_NURSING_WORKBENCH_EMR_VITAL = '/medora/home/nursing-workbench/emr/vital',
	MEDORA_HOME_NURSING_WORKBENCH_EMR_DIAGNOSIS = '/medora/home/nursing-workbench/emr/diagnosis',

	// Consultation module (navbar auto-hides like nursing EMR)
	MEDORA_HOME_CONSULTATION = '/medora/home/consultation',
	MEDORA_HOME_CONSULTATION_EMR = '/medora/home/consultation/emr',
	MEDORA_HOME_CONSULTATION_CPOE = '/medora/home/consultation/cpoe',
	MEDORA_HOME_CONSULTATION_CPOE_ORDER = '/medora/home/consultation/cpoe/order',
	MEDORA_HOME_CONSULTATION_CPOE_PRESCRIPTION = '/medora/home/consultation/cpoe/prescription',
	MEDORA_HOME_CONSULTATION_CPOE_REFER = '/medora/home/consultation/cpoe/refer',

	// Billing module (navbar auto-hides like nursing EMR)
	MEDORA_HOME_BILLING = '/medora/home/billing',
	MEDORA_HOME_BILLING_OP_BILLING = '/medora/home/billing/op-billing',

	// Medication Order module (navbar auto-hides like nursing EMR)
	MEDORA_HOME_MEDICATION_ORDER = '/medora/home/medication-order',
	MEDORA_HOME_MEDICATION_ORDER_INTERNAL_SALES = '/medora/home/medication-order/internal-sales',
	MEDORA_HOME_MEDICATION_ORDER_EXTERNAL_SALES = '/medora/home/medication-order/external-sales',

	// Serice Item
	MEDORA_HOME_SERVICE_ITEM = '/medora/home/service-item',
	MEDORA_HOME_SERVICE_ITEM_SERVICE = '/medora/home/service-item/service',
	MEDORA_HOME_SERVICE_ITEM_CREATE = '/medora/home/service-item/service/create',
	MEDORA_HOME_SERVICE_ITEM_TAGGING = '/medora/home/service-item/service/tagging'
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
