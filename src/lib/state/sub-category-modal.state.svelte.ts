import type {
	CategoryListRow,
	SubCategoryListRow
} from '$lib/model/type/heka/ui-rows.type';

/** Set before opening Create/Edit sub-category modal. */
export const SubCategoryModalState = $state<{
	mode: 'create' | 'edit';
	editRow: SubCategoryListRow | null;
	/** Default category id when opening create (e.g. from filter). */
	defaultCategoryId: number | null;
	/** Options for category dropdown (create mode). */
	categoryOptions: CategoryListRow[];
}>({
	mode: 'create',
	editRow: null,
	defaultCategoryId: null,
	categoryOptions: []
});
