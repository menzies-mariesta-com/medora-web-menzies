import type { CategorySchema, SubCategorySchema } from '$lib/server/db/schema-type';

/** Set before opening Create/Edit sub-category modal. */
export const SubCategoryModalState = $state<{
	mode: 'create' | 'edit';
	editRow: SubCategorySchema | null;
	/** Default category id when opening create (e.g. from filter). */
	defaultCategoryId: number | null;
	/** Options for category dropdown (create mode). */
	categoryOptions: CategorySchema[];
}>({
	mode: 'create',
	editRow: null,
	defaultCategoryId: null,
	categoryOptions: []
});
