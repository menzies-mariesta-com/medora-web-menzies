import { resolvePrintByName } from '$lib/util/print-by.util';

type PageDataForPrint = {
	printByName?: string;
	staff?: Parameters<typeof resolvePrintByName>[0];
	user?: Parameters<typeof resolvePrintByName>[1];
};

/** Resolved `printBy` for every hospital client Document Master print. */
export function printByFromPageData(data: PageDataForPrint | undefined): string {
	const fromLayout =
		typeof data?.printByName === 'string' ? data.printByName.trim() : '';
	if (fromLayout) return fromLayout;
	return resolvePrintByName(data?.staff, data?.user);
}

export function printByFromPage(page: {
	data?: PageDataForPrint;
}): string {
	return printByFromPageData(page.data);
}