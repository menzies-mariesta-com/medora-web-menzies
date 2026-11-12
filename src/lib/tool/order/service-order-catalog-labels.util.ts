import type { ServiceItemListRow } from '$lib/model/type/medora/ui-rows.type';

export function serviceCatalogLabelsForService(
	svc: ServiceItemListRow | undefined | null,
	subCategoryNameById: Map<number, string>,
	subCategoryIdToCategoryId: Map<number, number>,
	categoryNameById: Map<number, string>
): { subCategoryName: string; categoryName: string } {
	if (!svc) {
		return { subCategoryName: '–', categoryName: '–' };
	}
	const subId = Number(svc.subCategoryId);
	const subCategoryName = subCategoryNameById.get(subId) ?? '–';
	const catId = subCategoryIdToCategoryId.get(subId);
	const categoryName =
		catId != null ? (categoryNameById.get(catId) ?? '–') : '–';
	return { subCategoryName, categoryName };
}

export function serviceCatalogLabelsForServiceId(
	serviceId: number,
	branchServices: ServiceItemListRow[],
	subCategoryNameById: Map<number, string>,
	subCategoryIdToCategoryId: Map<number, number>,
	categoryNameById: Map<number, string>
): { subCategoryName: string; categoryName: string } {
	const svc = branchServices.find((s) => s.id === serviceId);
	return serviceCatalogLabelsForService(
		svc,
		subCategoryNameById,
		subCategoryIdToCategoryId,
		categoryNameById
	);
}
