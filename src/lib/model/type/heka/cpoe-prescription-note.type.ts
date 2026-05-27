import type { StaffWithRelations } from './staff.type';

/** Row from GET `prescriptionNote.list` (visit-scoped CPOE prescription notes). */
export type CpoePrescriptionNoteListRow = {
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
