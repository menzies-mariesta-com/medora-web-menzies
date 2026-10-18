/** Machine-readable API error codes returned in JSON bodies. */
export enum ApiErrorCodeEnum {
	/** SYSTEM_ADMIN / OWNER mutation blocked until 2FA is enabled. */
	TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED',
	/** ED board column requires an assigned ER bed. */
	ER_BED_REQUIRED = 'ER_BED_REQUIRED'
}
