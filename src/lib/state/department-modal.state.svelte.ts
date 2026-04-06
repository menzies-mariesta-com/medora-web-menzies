import type { DepartmentSchema } from '$lib/server/db/schema-type';

/** Set before opening Create/Edit department modal. */
export const DepartmentModalState = $state<{
	mode: 'create' | 'edit';
	editDepartment: DepartmentSchema | null;
}>({
	mode: 'create',
	editDepartment: null
});
