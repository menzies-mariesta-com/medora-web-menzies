/**
 * ED triage outcome: submitted triage system + form values -> acuity, board
 * column, triage master level number.
 *
 * Keyed on the SUBMITTED system, never on key presence: switching ESI -> MTS
 * leaves a stale `mts_category` in the values bag, and a "first key found"
 * rule silently picked the wrong one.
 */
import {
	EdBoardColumnEnum,
	EdTriageSystemEnum
} from '$lib/model/enum/perioperative.enum';

export type EdTriageOutcome = {
	acuityLevel: string;
	boardColumn: EdBoardColumnEnum;
	triageLevel: number;
	fastTrack: boolean;
};

/** MTS category -> board column + triage master level (1-5, same as ESI). */
const MTS_OUTCOMES: Record<
	string,
	{ boardColumn: EdBoardColumnEnum; triageLevel: number }
> = {
	red: { boardColumn: EdBoardColumnEnum.RESUS, triageLevel: 1 },
	orange: { boardColumn: EdBoardColumnEnum.RESUS, triageLevel: 2 },
	yellow: {
		boardColumn: EdBoardColumnEnum.WAITING_CLINICIAN,
		triageLevel: 3
	},
	green: {
		boardColumn: EdBoardColumnEnum.FAST_TRACK,
		triageLevel: 4
	},
	blue: { boardColumn: EdBoardColumnEnum.FAST_TRACK, triageLevel: 5 }
};

/** ESI level (1-5) -> board column. */
const ESI_BOARD_COLUMN: Record<string, EdBoardColumnEnum> = {
	'1': EdBoardColumnEnum.RESUS,
	'2': EdBoardColumnEnum.RESUS,
	'3': EdBoardColumnEnum.WAITING_CLINICIAN,
	'4': EdBoardColumnEnum.FAST_TRACK,
	'5': EdBoardColumnEnum.FAST_TRACK
};

export class EdTriageOutcomeError extends Error {}

export function resolveEdTriageOutcome(input: {
	system: string;
	values: Record<string, unknown>;
}): EdTriageOutcome {
	const system = String(input.system ?? '')
		.trim()
		.toLowerCase();
	const values = input.values ?? {};

	let acuityLevel: string;
	let boardColumn: EdBoardColumnEnum;
	let triageLevel: number;

	if (system === EdTriageSystemEnum.ESI) {
		acuityLevel = String(values.esi_level ?? '').trim();
		boardColumn = ESI_BOARD_COLUMN[acuityLevel];
		triageLevel = Number(acuityLevel);
		if (!boardColumn) {
			throw new EdTriageOutcomeError(
				'ESI level must be 1, 2, 3, 4 or 5'
			);
		}
	} else if (system === EdTriageSystemEnum.MTS) {
		acuityLevel = String(values.mts_category ?? '')
			.trim()
			.toLowerCase();
		const rule = MTS_OUTCOMES[acuityLevel];
		if (!rule) {
			throw new EdTriageOutcomeError(
				'MTS category must be red, orange, yellow, green or blue'
			);
		}
		boardColumn = rule.boardColumn;
		triageLevel = rule.triageLevel;
	} else {
		throw new EdTriageOutcomeError(
			`Unknown triage system: ${input.system}`
		);
	}

	return {
		acuityLevel,
		boardColumn,
		triageLevel,
		fastTrack: boardColumn === EdBoardColumnEnum.FAST_TRACK
	};
}

export type EdTriageSavePlan =
	| { ok: true; sign: boolean }
	| { ok: false; status: 400 | 409; code?: string; message: string };

/** Guard order for one triage submission: override reason, then signed/amend, then acuity. */
export function planEdTriageSave(input: {
	action: 'triage' | 'draft' | 'amend';
	system: string;
	defaultSystem: string;
	overrideReason?: string | null;
	alreadySigned: boolean;
}): EdTriageSavePlan {
	if (
		input.system !== input.defaultSystem &&
		!input.overrideReason?.trim()
	) {
		return {
			ok: false,
			status: 400,
			message:
				'A reason is required to override the hospital triage system'
		};
	}
	if (input.alreadySigned && input.action !== 'amend') {
		return {
			ok: false,
			status: 409,
			code: 'ED_TRIAGE_ALREADY_SIGNED',
			message: 'Triage is already signed for this visit'
		};
	}
	return { ok: true, sign: input.action !== 'draft' };
}

/** Vitals that are present, as the decimal strings `patient_diagnosis` stores. */
export function triageVitalColumns(vitals: {
	pulse?: number | null;
	respiration?: number | null;
	bpSystolic?: number | null;
	bpDiastolic?: number | null;
	spO2?: number | null;
	temperature?: number | null;
}): {
	pulse: string | null;
	respiration: string | null;
	bpSystolic: string | null;
	bpDiastolic: string | null;
	spO2: string | null;
	temperature: string | null;
} {
	const dec = (v: number | null | undefined) =>
		v == null || !Number.isFinite(v) ? null : String(v);
	return {
		pulse: dec(vitals.pulse),
		respiration: dec(vitals.respiration),
		bpSystolic: dec(vitals.bpSystolic),
		bpDiastolic: dec(vitals.bpDiastolic),
		spO2: dec(vitals.spO2),
		temperature: dec(vitals.temperature)
	};
}

/** True when at least one triage vital was entered. */
export function hasTriageVitals(
	vitals: Record<string, unknown> | undefined
) {
	return Object.values(vitals ?? {}).some(
		(v) => v != null && Number.isFinite(Number(v))
	);
}
