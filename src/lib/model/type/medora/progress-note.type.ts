import type { StaffWithRelations } from './staff.type';

/** Row from GET `progressNote.list` (visit-scoped progress notes + doctor). */
export type ProgressNoteListRow = {
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
