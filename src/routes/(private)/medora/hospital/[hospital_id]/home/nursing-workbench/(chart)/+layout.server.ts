import type { LayoutServerLoad } from './$types';
import { staffPrintByName } from '$lib/server/medora/staff-print-by.server';

export const load: LayoutServerLoad = async ({ locals }) => ({
	printByName: staffPrintByName(locals)
});
