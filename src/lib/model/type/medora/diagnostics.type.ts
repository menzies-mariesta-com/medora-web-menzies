import type {
	LabAccessionStatusEnum,
	LabCriticalCallbackStatusEnum,
	LabSectionEnum
} from '$lib/model/enum/diagnostics.enum';

export type HospitalLabSettingRow = {
	id: number;
	hospitalId: string;
	accessionPrefix: string;
	criticalPolicy: string;
	autoNursingCompleteOnRelease: boolean;
	enabledSectionsJson: string[];
};

export type LabTestRow = {
	id: number;
	hospitalId: string | null;
	code: string;
	name: string;
	loincCode: string | null;
	section: LabSectionEnum | string;
	dataType: string;
	unit: string | null;
	refRangeLow: string | null;
	refRangeHigh: string | null;
	refRangeText: string | null;
	criticalLow: string | null;
	criticalHigh: string | null;
};

export type LabPanelRow = {
	id: number;
	hospitalId: string | null;
	code: string;
	name: string;
	section: string;
	memberTestIds?: number[];
};

export type LabServiceTestMapRow = {
	id: number;
	hospitalId: string;
	serviceItemId: number;
	targetType: 'test' | 'panel';
	targetId: number;
	serviceItemName?: string | null;
	targetName?: string | null;
};

export type LabOrderListRow = {
	id: number;
	visitId: string;
	patientId: string;
	patientName: string;
	visitNo: string | null;
	serviceOrderDetailId: number;
	serviceName: string | null;
	priority: string;
	orderStatus: string;
	isUrgent: boolean;
	createdAt: string | null;
};

export type LabAccessionListRow = {
	id: number;
	accessionNo: string;
	barcodePayload: string;
	section: string;
	accessionStatus: LabAccessionStatusEnum | string;
	patientName: string;
	visitNo: string | null;
	visitId: string;
	patientId: string;
	serviceName: string | null;
	priority: string;
	specimenId: number | null;
	specimenType: string | null;
	collectedAt: string | null;
	receivedAt: string | null;
	labOrderId: number;
};

export type LabResultObservationRow = {
	id: number;
	reportId: number;
	testId: number;
	testCode: string;
	testName: string;
	valueNumeric: string | null;
	valueText: string | null;
	unit: string | null;
	refRangeText: string | null;
	abnormalFlag: string | null;
	isCritical: boolean;
	observationStatus: string;
};

export type LabReleasedResultRow = {
	accessionId: number;
	accessionNo: string;
	releasedAt: string | null;
	section: string;
	serviceName: string | null;
	observations: LabResultObservationRow[];
};

export type LabCriticalCallbackRow = {
	id: number;
	observationId: number;
	visitId: string;
	patientId: string;
	patientName: string;
	testName: string;
	resultValue: string;
	callbackStatus: LabCriticalCallbackStatusEnum | string;
	calledParty: string | null;
	readBackText: string | null;
	calledAt: string | null;
	createdAt: string | null;
};

export type LabIntegrationHealthRow = {
	pendingCount: number;
	errorCount: number;
	lastReceivedAt: string | null;
};

export type LabDashboardStats = {
	pendingCollection: number;
	pendingReceive: number;
	inProcess: number;
	unverified: number;
	openCriticalCallbacks: number;
};
