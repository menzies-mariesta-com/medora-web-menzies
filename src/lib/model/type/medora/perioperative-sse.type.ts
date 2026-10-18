export type PerioperativeSsePayload = {
	type: string;
	hospitalId: string;
	data?: Record<string, unknown>;
	at: string;
};
