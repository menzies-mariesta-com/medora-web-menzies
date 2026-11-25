/** Wire shape of one MLC record returned by the mlc-documentation API. */
import type { ClinicalFormTemplateSchema } from './clinical-form.type';

export type MlcCaseRow = {
	id: number;
	formNumber: string | null;
	parentInstanceId: number | null;
	statusTaggingId: number | null;
	signedAt: string | null;
	signedBy: string | null;
	templateCode: string | null;
	/** The record's own template; a legacy row must render against its own fields. */
	schemaJson?: ClinicalFormTemplateSchema | null;
	valuesJson: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
};

/** `GET ?mode=bootstrap` payload for the MLC documentation tab. */
export type MlcBootstrap = {
	templateCode: string;
	schemaJson: ClinicalFormTemplateSchema | null;
	cases: MlcCaseRow[];
	encounterIsMlc: boolean;
	staffName: string | null;
};

/** Tagging ids on `clinical_form_instance` that mean "signed legal record". */
export const MLC_SIGNED_STATUS_TAGGING_ID = 80;
export const MLC_AMENDED_STATUS_TAGGING_ID = 81;
