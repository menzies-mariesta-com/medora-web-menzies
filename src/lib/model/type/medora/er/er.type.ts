/** UI / API shapes for Emergency (ED) — not Drizzle schema. */

export type EdTriageLevelRow = {
	id: number;
	hospitalId: string;
	level: number;
	name: string;
	color: string;
	statusId: number;
};

/** ER bed status board row (`GET …/emergency/bed-status`). */
export type ErBedStatusBoardRow = {
	erBedId: number;
	erRoomId: number;
	erWardId: number;
	bedName: string;
	bedCode: string | null;
	bedStatus: number;
	roomName: string | null;
	wardName: string | null;
	visitId: string | null;
	visitNo: string | null;
	patientName: string | null;
	dischargedInBed: boolean;
};
