export enum EdBoardColumnEnum {
	WAITING_TRIAGE = 'waiting_triage',
	TRIAGE = 'triage',
	FAST_TRACK = 'fast_track',
	MAJORS = 'majors',
	RESUS = 'resus',
	AWAITING_ADMIT = 'awaiting_admit',
	DISCHARGED = 'discharged'
}

export enum EdTriageSystemEnum {
	ESI = 'esi',
	MTS = 'mts'
}

export enum SurgicalCasePriorityEnum {
	ELECTIVE = 'elective',
	URGENT = 'urgent',
	EMERGENCY = 'emergency'
}

export enum SurgicalCaseTypeEnum {
	GENERAL = 'general',
	C_SECTION = 'c_section',
	CATH_LAB = 'cath_lab',
	ENDOSCOPY = 'endoscopy',
	TRAUMA = 'trauma'
}

export enum ClinicalFormContextTypeEnum {
	TRIAGE = 'triage',
	WHO_CHECKLIST = 'who_checklist',
	ANESTHESIA = 'anesthesia',
	PACU = 'pacu',
	PARTOGRAM = 'partogram',
	DELIVERY = 'delivery',
	PROCEDURE_LOG = 'procedure_log',
	TRAUMA = 'trauma',
	PRE_OP = 'pre_op'
}

export enum LdBoardColumnEnum {
	ACTIVE_LABOR = 'active_labor',
	DELIVERY = 'delivery',
	POSTPARTUM = 'postpartum'
}

export enum PerioperativeSseEventTypeEnum {
	CASE_SCHEDULED = 'case_scheduled',
	CASE_BUMPED = 'case_bumped',
	CASE_STATUS = 'case_status',
	TRAUMA_ACTIVATED = 'trauma_activated',
	BOARD_REFRESH = 'board_refresh',
	ED_BOARD = 'ed_board'
}
