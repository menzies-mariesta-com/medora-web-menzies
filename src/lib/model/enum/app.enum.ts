export enum AppEnum {
	PAGE_SIZE_FOR_SEARCH_SELECT = 5,
	DEFAULT_PAGE_SIZE_FOR_TABLE = 25,

	/** Maximum session lifetime from login or extend (Better Auth `expiresIn`). */
	MAX_SESSION_SECONDS = 60 * 60 * 12,
	/** Each password extend grants up to this many seconds from confirm time. */
	SESSION_EXTEND_BUMP_SECONDS = 60 * 60 * 12,
	/** Show expiry warning modal when remaining time is at or below this threshold. */
	SESSION_EXPIRY_WARN_SECONDS = 15 * 60
}
