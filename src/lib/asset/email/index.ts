/**
 * Email templates and renderers.
 * Add new templates in this folder and re-export here for use in mailing.
 */
export {
	applyEmailBrandPlaceholders,
	EMAIL_BRAND_NAME,
	EMAIL_LOGO_CID,
	EMAIL_LOGO_PATH,
	emailLogoSrcForSend,
	resolveEmailAppOrigin,
	resolveEmailLogoUrl
} from './email-brand';
export {
	renderOtpVerificationEmail,
	type OtpVerificationEmailParams
} from './otp-verification';
export {
	renderResetPasswordEmail,
	type ResetPasswordEmailParams
} from './reset-password';
export {
	renderStockAlertEmail,
	type StockAlertEmailParams
} from './stock-alert';
export {
	buildMedoraEmailDocument,
	EMAIL_SUPPORT_EMAIL
} from './email-layout';
export { renderSupportTicketNotifyEmail } from './support-ticket-notify';
