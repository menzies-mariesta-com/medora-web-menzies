export enum WebRoutesEnum {
	DEFAULT = '/',

	// public
	ONBOARDING = '/onboarding',
	ONBOARDING_MARKETPLACE = "/onboarding/marketplace",
	LOGIN = '/auth/login',
	SIGNUP = '/auth/signup',
	RESET_PASSWORD = '/auth/reset-password',
	PLUGIN = '/plugin',

	// private - heka
	HEKA = '/heka',
	/** Hospital list / select (choose hospital before modules). */
	HEKA_HOSPITAL = '/heka/hospital',
	/** System admin: owner management (SYSTEM_ADMIN only). */
	HEKA_ADMIN_OWNERS = '/heka/admin/owners',

	// Legacy base paths (DB stores /heka/home/...; use hekaHospitalHome(hospitalId) + suffix for real URLs)
	HEKA_HOME = '/heka/home',
	HEKA_HOME_ADMINISTRATION = '/heka/home/administration',
	HEKA_HOME_ADMINISTRATION_STAFF = '/heka/home/administration/staff',
	HEKA_HOME_ADMINISTRATION_STAFF_REGISTRATION = '/heka/home/administration/staff/registration',
	HEKA_HOME_ADMINISTRATION_STAFF_LIST = '/heka/home/administration/staff/list',
	HEKA_HOME_ADMINISTRATION_BRANCHES = '/heka/home/administration/branches',
	HEKA_HOME_REGISTRATION = '/heka/home/registration',
	HEKA_HOME_REGISTRATION_PATIENT = '/heka/home/registration/patient',
	HEKA_HOME_REGISTRATION_PATIENT_REGISTRATION = '/heka/home/registration/patient/registration',
	HEKA_HOME_REGISTRATION_PATIENT_LIST = '/heka/home/registration/patient/list',
	HEKA_HOME_ACCOUNT = '/heka/home/account',
}

/** Base path for a hospital's home (modules: administration, appointment, registration). hospitalId is UUID string. */
export function hekaHospitalHome(hospitalId: string): string {
	return `/heka/hospital/${hospitalId}/home`;
}

/**
 * Rewrite DB page URL (/heka/home/...) to hospital-scoped URL.
 */
export function hekaHospitalPageUrl(hospitalId: string, pageUrl: string | null): string {
	if (!pageUrl || !pageUrl.startsWith('/heka/home')) return pageUrl ?? '';
	return `/heka/hospital/${hospitalId}/home${pageUrl.slice('/heka/home'.length) || ''}`;
}

/**
 * Convert request pathname under hospital home to DB page URL (/heka/home/...).
 * Returns null if pathname is not under /heka/hospital/{hospitalId}/home.
 */
export function requestPathToDbPageUrl(pathname: string, hospitalId: string): string | null {
	const prefix = `/heka/hospital/${hospitalId}/home`;
	if (!pathname.startsWith(prefix)) return null;
	const suffix = pathname.slice(prefix.length) || '';
	const dbPath = '/heka/home' + (suffix === '/' ? '' : suffix);
	return dbPath.replace(/\/$/, '') || '/heka/home';
}

export enum ServerRoutesEnum {
}