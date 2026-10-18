/** Session / API shape used to prefill Account settings (self staff edit). */
export type AccountProfileSeed = {
	firstName?: string | null;
	middleName?: string | null;
	lastName?: string | null;
	photoUrl?: string | null;
	phonePrimary?: string | null;
	address?: string | null;
	/** ISO date or YYYY-MM-DD; Date may appear from page.data devalue revival. */
	dateOfBirth?: string | Date | null;
	genderId?: number | null;
	licenseNo?: string | null;
	licenseExpiryDate?: string | Date | null;
	signatureImageUrl?: string | null;
	signatureText?: string | null;
};

export type AccountSettingsApiRow = AccountProfileSeed & {
	email?: string | null;
	staffId?: string;
};
