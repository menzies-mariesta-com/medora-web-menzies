import type { StaffRegDepartmentRow } from '$lib/model/type/heka/staff-reg-ui.type';

/** Set before opening Create/Edit department modal. */
export const DepartmentModalState = $state<{
	mode: 'create' | 'edit';
	editDepartment: StaffRegDepartmentRow | null;
}>({
	mode: 'create',
	editDepartment: null
});
