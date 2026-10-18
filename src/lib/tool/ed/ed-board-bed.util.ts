import { EdBoardColumnEnum } from '$lib/model/enum/perioperative.enum';

export const ED_BOARD_COLUMNS_REQUIRING_ER_BED = new Set<string>([
	EdBoardColumnEnum.MAJORS,
	EdBoardColumnEnum.RESUS,
	EdBoardColumnEnum.AWAITING_ADMIT
]);

export function edBoardColumnRequiresErBed(boardColumn: string): boolean {
	return ED_BOARD_COLUMNS_REQUIRING_ER_BED.has(boardColumn);
}
