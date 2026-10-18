/** UI / API shapes for ER bed master (not Drizzle schema). */

export type EdTriageLevelRow = {
	id: number;
	hospitalId: string;
	level: number;
	name: string;
	color: string;
	statusId: number;
};

export type ErWardCategoryRow = {
	id: number;
	hospitalId: string;
	name: string;
	code: string | null;
	wardMarkup: string;
	statusId: number;
};

export type ErRoomCategoryRow = {
	id: number;
	hospitalId: string;
	name: string;
	code: string | null;
	roomMarkup: string;
	statusId: number;
};

export type ErWardRow = {
	id: number;
	hospitalId: string;
	branchId: string;
	erWardCategoryId: number;
	name: string;
	code: string | null;
	statusId: number;
	branchName?: string | null;
	wardCategoryName?: string | null;
	wardMarkup?: string | null;
};

export type ErRoomRow = {
	id: number;
	hospitalId: string;
	erWardId: number;
	erRoomCategoryId: number;
	name: string;
	code: string | null;
	capacity: number;
	amenities: string | null;
	statusId: number;
	wardName?: string | null;
	wardCode?: string | null;
	roomCategoryName?: string | null;
	roomMarkup?: string | null;
	bedCount?: number;
};

export type ErBedRow = {
	id: number;
	erRoomId: number;
	hospitalId: string;
	name: string;
	code: string | null;
	basePrice: string;
	bedStatus: number;
	statusId: number;
	roomName?: string | null;
	roomCode?: string | null;
	erWardId?: number | null;
	wardName?: string | null;
	wardCode?: string | null;
	dailyTariff?: string | null;
};

export type ErBedStatusBoardRow = {
	erBedId: number;
	erRoomId: number;
	erWardId: number;
	bedName: string | null;
	bedCode: string | null;
	bedStatus: number;
	roomName: string | null;
	wardName: string | null;
	visitId: string | null;
	visitNo: string | null;
	patientName: string | null;
	/** Patient discharged clinically but bed still held occupied. */
	dischargedInBed?: boolean;
};
