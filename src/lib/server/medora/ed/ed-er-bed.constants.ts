import { EdBoardColumnEnum } from '$lib/model/enum/perioperative.enum';

/** Board columns that require a physical ER bed before the patient can occupy them. */
export const ED_BOARD_COLUMNS_REQUIRING_ER_BED: ReadonlySet<string> =
	new Set([
		EdBoardColumnEnum.MAJORS,
		EdBoardColumnEnum.RESUS,
		EdBoardColumnEnum.AWAITING_ADMIT
	]);

export function edBoardColumnRequiresErBed(boardColumn: string): boolean {
	return ED_BOARD_COLUMNS_REQUIRING_ER_BED.has(boardColumn);
}
