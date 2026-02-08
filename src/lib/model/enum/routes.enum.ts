export enum WebRoutesEnum {
	DEFAULT = '/',

	// public
	ONBOARDING = "/onboarding",
	LOGIN = "/auth/login",
	SIGNUP = "/auth/signup",
	RESET_PASSWORD = "/auth/reset-password",
	PLUGIN = "/plugin",

	// private
	HEKA = "/heka",
	HEKA_HOME = "/heka/home",
	HEKA_HOME_ADMINISTRATION = "/heka/home/administration",
	HEKA_HOME_ADMINISTRATION_STAFF = "/heka/home/administration/staff",
	HEKA_HOME_ADMINISTRATION_STAFF_REGISTRATION = "/heka/home/administration/staff/registration",
	HEKA_HOME_ADMINISTRATION_STAFF_LIST = "/heka/home/administration/staff/list",
	HEKA_HOME_PATIENT = "/heka/home/patient",
}

export enum ServerRoutesEnum {
}