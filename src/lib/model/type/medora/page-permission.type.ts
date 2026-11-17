import type { PageActionEnum } from '$lib/model/enum/page-action.enum';

/** JSON contract for one page's grants (layout data → UI button gating). */
export type PagePermissionFlags = {
	pageUrl: string;
	actions: PageActionEnum[];
};

/** Save payload for the User Group access matrix. */
export type UserGroupPageGrantInput = {
	pageId: number;
	actions: PageActionEnum[];
};
