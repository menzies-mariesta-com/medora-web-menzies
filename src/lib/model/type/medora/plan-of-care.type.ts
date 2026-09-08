import type { StaffWithRelations } from './staff.type';

/** Row from GET `planOfCare.list` (visit-scoped plan of care + doctor). */
export type PlanOfCareListRow = {
	id: number;
	visitId: number;
	note: string | null;
	deleteRemark: string | null;
	statusId: number | null;
	doctorId: string | null;
	sequenceNo: number | null;
	createdAt?: string | null;
	updatedAt?: string | null;
	doctor?: StaffWithRelations | null;
};
