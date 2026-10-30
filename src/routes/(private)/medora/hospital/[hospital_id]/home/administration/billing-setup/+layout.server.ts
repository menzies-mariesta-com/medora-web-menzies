import type { LayoutServerLoad } from './$types';

/** Expose branch scope from hospital home layout to OP / IP / ED sub-pages. */
export const load: LayoutServerLoad = async ({ parent }) => {
	const parentData = await parent();
	return {
		allowedBranches: parentData.allowedBranches ?? []
	};
};
