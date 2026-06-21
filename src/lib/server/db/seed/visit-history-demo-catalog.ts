/** Marker on demo patients / detectable via visit_no prefix VH- */
export const VH_DEMO_MARKER = '[heka-vh-demo]';

export const MIN_DEMO_PATIENTS = 10;
export const MIN_VISITS_PER_DEMO_PATIENT = 3;

export const FORM_NAME_CHIEF_COMPLAINT_ID = 1;
export const FORM_NAME_PATIENT_CONDITION_ID = 2;

export const VISIT_TYPE_OPD = 1;
export const VISIT_TYPE_IPD = 2;
export const VISIT_TYPE_ED = 3;
export const VISIT_TYPE_DAYCARE = 4;
export const VISIT_TYPE_PACKAGE = 5;

export const VISIT_TYPE_CODES = ['O', 'I', 'E', 'DC', 'PK'] as const;

/** Visit workflow status_tagging: open=5, vital=6, seen=7, closed=8 */
export const VISIT_STATUS_OPEN = 5;
export const VISIT_STATUS_SEEN = 7;
export const VISIT_STATUS_CLOSED = 8;

export type VisitScenarioDepth = 'light' | 'medium' | 'full';

export type VisitDiagnosisDef = {
	diagnosisTypeId: number;
	description: string;
};

export type VisitScenarioDef = {
	depth: VisitScenarioDepth;
	visitTypeId: number;
	visitTypeCode: (typeof VISIT_TYPE_CODES)[number];
	daysAgo: number;
	statusTaggingId: number;
	diagnosisNotes: string;
	chiefComplaint: string;
	patientCondition: string;
	diagnoses: VisitDiagnosisDef[];
	symptoms: string[];
	serviceOrderLineCount: number;
	medicationLineCount: number;
	prescriptionNote: string;
};

export type DemoPatientDef = {
	seq: number;
	code: string;
	firstName: string;
	lastName: string;
	visits: VisitScenarioDef[];
};

export const PHARMACY_GENERIC_DEFS: Array<{
	code: string;
	name: string;
	itemName: string;
	itemCode: string;
}> = [
	{
		code: 'VH-PAR',
		name: 'Paracetamol',
		itemName: 'Paracetamol 500mg Tab',
		itemCode: 'VH-IM-PAR500'
	},
	{
		code: 'VH-AMX',
		name: 'Amoxicillin',
		itemName: 'Amoxicillin 500mg Cap',
		itemCode: 'VH-IM-AMX500'
	},
	{
		code: 'VH-IBU',
		name: 'Ibuprofen',
		itemName: 'Ibuprofen 400mg Tab',
		itemCode: 'VH-IM-IBU400'
	},
	{
		code: 'VH-MET',
		name: 'Metformin',
		itemName: 'Metformin 500mg Tab',
		itemCode: 'VH-IM-MET500'
	},
	{
		code: 'VH-AML',
		name: 'Amlodipine',
		itemName: 'Amlodipine 5mg Tab',
		itemCode: 'VH-IM-AML5'
	},
	{
		code: 'VH-OME',
		name: 'Omeprazole',
		itemName: 'Omeprazole 20mg Cap',
		itemCode: 'VH-IM-OME20'
	},
	{
		code: 'VH-CET',
		name: 'Cetirizine',
		itemName: 'Cetirizine 10mg Tab',
		itemCode: 'VH-IM-CET10'
	},
	{
		code: 'VH-SAL',
		name: 'Salbutamol',
		itemName: 'Salbutamol 2mg Tab',
		itemCode: 'VH-IM-SAL2'
	},
	{
		code: 'VH-DEX',
		name: 'Dexamethasone',
		itemName: 'Dexamethasone 4mg Tab',
		itemCode: 'VH-IM-DEX4'
	},
	{
		code: 'VH-ORS',
		name: 'ORS',
		itemName: 'Oral Rehydration Salts Sachet',
		itemCode: 'VH-IM-ORS'
	}
];

function patientVisits(
	seq: number,
	theme: {
		complaint: string;
		condition: string;
		dx1: string;
		dx2: string;
		symptom1: string;
		symptom2: string;
	}
): VisitScenarioDef[] {
	const pad = String(seq).padStart(2, '0');
	return [
		{
			depth: 'light',
			visitTypeId: VISIT_TYPE_OPD,
			visitTypeCode: 'O',
			daysAgo: 90,
			statusTaggingId: VISIT_STATUS_CLOSED,
			diagnosisNotes: `Initial assessment — ${theme.complaint}`,
			chiefComplaint: theme.complaint,
			patientCondition: '',
			diagnoses: [
				{ diagnosisTypeId: 1, description: theme.dx1 }
			],
			symptoms: [],
			serviceOrderLineCount: 0,
			medicationLineCount: 0,
			prescriptionNote: ''
		},
		{
			depth: 'medium',
			visitTypeId: VISIT_TYPE_OPD,
			visitTypeCode: 'O',
			daysAgo: 30,
			statusTaggingId: VISIT_STATUS_SEEN,
			diagnosisNotes: `Follow-up — improving ${theme.complaint.toLowerCase()}`,
			chiefComplaint: `Follow-up: ${theme.complaint}`,
			patientCondition: theme.condition,
			diagnoses: [
				{ diagnosisTypeId: 2, description: theme.dx2 }
			],
			symptoms: [theme.symptom1],
			serviceOrderLineCount: 2,
			medicationLineCount: 0,
			prescriptionNote: ''
		},
		{
			depth: 'full',
			visitTypeId:
				seq % 5 === 0
					? VISIT_TYPE_PACKAGE
					: seq % 3 === 0
						? VISIT_TYPE_ED
						: VISIT_TYPE_OPD,
			visitTypeCode:
				seq % 5 === 0 ? 'PK' : seq % 3 === 0 ? 'E' : 'O',
			daysAgo: 2,
			statusTaggingId: VISIT_STATUS_OPEN,
			diagnosisNotes: `Current visit — comprehensive review (${pad})`,
			chiefComplaint: theme.complaint,
			patientCondition: theme.condition,
			diagnoses: [
				{ diagnosisTypeId: 1, description: theme.dx1 },
				{ diagnosisTypeId: 3, description: theme.dx2 }
			],
			symptoms: [theme.symptom1, theme.symptom2],
			serviceOrderLineCount: 4,
			medicationLineCount: 2,
			prescriptionNote:
				'Continue medications as prescribed. Return if symptoms worsen. Follow diet advice.'
		}
	];
}

export const DEMO_PATIENTS: DemoPatientDef[] = [
	{
		seq: 1,
		code: 'VH-DEMO-01',
		firstName: 'Demo',
		lastName: 'Patient Alpha',
		visits: patientVisits(1, {
			complaint: 'Intermittent cough for 5 days',
			condition: 'Alert, mild respiratory distress',
			dx1: 'Acute bronchitis',
			dx2: 'Upper respiratory tract infection',
			symptom1: 'Cough',
			symptom2: 'Low-grade fever'
		})
	},
	{
		seq: 2,
		code: 'VH-DEMO-02',
		firstName: 'Demo',
		lastName: 'Patient Beta',
		visits: patientVisits(2, {
			complaint: 'Abdominal pain after meals',
			condition: 'Stable vitals, tender epigastrium',
			dx1: 'Gastritis',
			dx2: 'Functional dyspepsia',
			symptom1: 'Epigastric pain',
			symptom2: 'Nausea'
		})
	},
	{
		seq: 3,
		code: 'VH-DEMO-03',
		firstName: 'Demo',
		lastName: 'Patient Gamma',
		visits: patientVisits(3, {
			complaint: 'Routine diabetes follow-up',
			condition: 'Well oriented, no acute distress',
			dx1: 'Type 2 diabetes mellitus',
			dx2: 'Hypertension — controlled',
			symptom1: 'Polyuria',
			symptom2: 'Fatigue'
		})
	},
	{
		seq: 4,
		code: 'VH-DEMO-04',
		firstName: 'Demo',
		lastName: 'Patient Delta',
		visits: patientVisits(4, {
			complaint: 'Headache and dizziness',
			condition: 'Ambulatory, GCS 15',
			dx1: 'Tension headache',
			dx2: 'Benign positional vertigo',
			symptom1: 'Headache',
			symptom2: 'Dizziness'
		})
	},
	{
		seq: 5,
		code: 'VH-DEMO-05',
		firstName: 'Demo',
		lastName: 'Patient Epsilon',
		visits: patientVisits(5, {
			complaint: 'Annual health screening package',
			condition: 'Asymptomatic on examination',
			dx1: 'Routine physical examination',
			dx2: 'Health maintenance visit',
			symptom1: 'None reported',
			symptom2: 'Mild anxiety'
		})
	},
	{
		seq: 6,
		code: 'VH-DEMO-06',
		firstName: 'Demo',
		lastName: 'Patient Zeta',
		visits: patientVisits(6, {
			complaint: 'Shortness of breath on exertion',
			condition: 'Mild wheeze on auscultation',
			dx1: 'Asthma exacerbation — mild',
			dx2: 'Allergic rhinitis',
			symptom1: 'Dyspnea',
			symptom2: 'Wheezing'
		})
	},
	{
		seq: 7,
		code: 'VH-DEMO-07',
		firstName: 'Demo',
		lastName: 'Patient Eta',
		visits: patientVisits(7, {
			complaint: 'Lower back pain after lifting',
			condition: 'Limited lumbar flexion',
			dx1: 'Mechanical low back pain',
			dx2: 'Muscle strain',
			symptom1: 'Back pain',
			symptom2: 'Stiffness'
		})
	},
	{
		seq: 8,
		code: 'VH-DEMO-08',
		firstName: 'Demo',
		lastName: 'Patient Theta',
		visits: patientVisits(8, {
			complaint: 'Skin rash on arms',
			condition: 'Erythematous maculopapular rash',
			dx1: 'Allergic dermatitis',
			dx2: 'Contact urticaria',
			symptom1: 'Pruritus',
			symptom2: 'Rash'
		})
	},
	{
		seq: 9,
		code: 'VH-DEMO-09',
		firstName: 'Demo',
		lastName: 'Patient Iota',
		visits: patientVisits(9, {
			complaint: 'Fever and sore throat',
			condition: 'Febrile, pharyngeal erythema',
			dx1: 'Acute pharyngitis',
			dx2: 'Viral syndrome',
			symptom1: 'Fever',
			symptom2: 'Sore throat'
		})
	},
	{
		seq: 10,
		code: 'VH-DEMO-10',
		firstName: 'Demo',
		lastName: 'Patient Kappa',
		visits: patientVisits(10, {
			complaint: 'Chest discomfort — rule out cardiac cause',
			condition: 'Hemodynamically stable',
			dx1: 'Atypical chest pain',
			dx2: 'Anxiety-related symptoms',
			symptom1: 'Chest tightness',
			symptom2: 'Palpitations'
		})
	}
];

/** Hero patient for demo URL logging (VH-DEMO-03). */
export const HERO_DEMO_PATIENT_SEQ = 3;

export function demoVisitNo(
	patientSeq: number,
	visitTypeCode: string,
	visitIndex: number
): string {
	return `VH-${visitTypeCode}-${String(patientSeq).padStart(2, '0')}${visitIndex}`;
}
