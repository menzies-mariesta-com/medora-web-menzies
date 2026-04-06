import { CategoryEnum } from '$lib/model/enum/db-link';

/**
 * Category master rows reserved for Item Master (`category` ids 11–13).
 * Names: General Supply, Pharmacy Supply, Medical Supply.
 */
export const ITEM_MASTER_CATEGORY_IDS: readonly number[] = [
	CategoryEnum.GENERAL_SUPPLY,
	CategoryEnum.PHARMACY_SUPPLY,
	CategoryEnum.MEDICAL_SUPPLY
];

export function isItemMasterCategoryId(id: number): boolean {
	return ITEM_MASTER_CATEGORY_IDS.includes(id);
}
