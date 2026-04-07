import type { PatientRegMasterTimestamps } from './heka/patient-reg-master.type';

export type DocumentTypeRow = PatientRegMasterTimestamps & {
	id: number;
	documentType: string | null;
	statusId: number;
};

export type DocumentSettingRow = PatientRegMasterTimestamps & {
	id: number;
	name: string;
	documentTypeId: number | null;
	hospitalId: string | null;
	marginTop: number | null;
	marginBottom: number | null;
	marginLeft: number | null;
	marginRight: number | null;
	paddingTop: number | null;
	paddingBottom: number | null;
	paddingLeft: number | null;
	paddingRight: number | null;
	pageSize: string | null;
	pageOrientation: string | null;
	headerHtml: string | null;
	footerHtml: string | null;
	showHeader: boolean | null;
	showFooter: boolean | null;
	description: string | null;
	statusId: number;
};

export type DocumentHospitalRelationRow = PatientRegMasterTimestamps & {
	id: string;
	name: string | null;
	code: string | null;
};

export type DocumentStatusRelationRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
};

export type DocumentSettingWithRelations = DocumentSettingRow & {
	documentType?: DocumentTypeRow | null;
	hospital?: DocumentHospitalRelationRow | null;
	status?: DocumentStatusRelationRow | null;
};
