export type NamedLookup = {
	id: number;
	name: string | null;
};

export type AuthUser = {
	id: string;
	email?: string | null;
	name?: string | null;
};

export type CountryLookup = {
	id: number;
	countryCode?: string | null;
	phoneCode?: string | null;
	name?: string | null;
};

export type PatientWithRelations = {
	id: string;
	hospitalId?: string | null;
	code?: string | null;
	firstName?: string | null;
	middleName?: string | null;
	lastName?: string | null;
	identityNo?: string | null;
	dateOfBirth?: string | null;
	phonePrimary?: string | null;
	phoneSecondary?: string | null;
	guardianName?: string | null;
	guardianPhone?: string | null;
	address?: string | null;
	photoPath?: string | null;
	nameMasking?: number | null;
	createdAt?: string | null;
	updatedAt?: string | null;

	user?: AuthUser | null;
	/** Present on some API/detail payloads (registration / appointment pickers). */
	titleId?: number | null;
	title?: NamedLookup | null;
	/** Father / guardian title (e.g. from registration relations). */
	fatherTitle?: NamedLookup | null;
	fatherName?: string | null;
	gender?: NamedLookup | null;
	identityType?: NamedLookup | null;
	status?: NamedLookup | null;

	phonePrimaryCountry?: CountryLookup | null;
	phoneSecondaryCountry?: CountryLookup | null;

	city?: NamedLookup | null;
	state?: NamedLookup | null;
	country?: NamedLookup | null;
};

