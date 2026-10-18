import { PerioperativeSseEventTypeEnum } from '$lib/model/enum/perioperative.enum';
import type { PerioperativeSsePayload } from '$lib/model/type/medora/perioperative-sse.type';

export type { PerioperativeSsePayload };

type Subscriber = {
	hospitalId: string;
	send: (payload: PerioperativeSsePayload) => void;
};

const subscribers = new Set<Subscriber>();

export function subscribePerioperativeEvents(
	hospitalId: string,
	send: (payload: PerioperativeSsePayload) => void
): () => void {
	const sub: Subscriber = { hospitalId, send };
	subscribers.add(sub);
	return () => {
		subscribers.delete(sub);
	};
}

export function publishPerioperativeEvent(
	payload: Omit<PerioperativeSsePayload, 'at'> & { at?: string }
) {
	const full: PerioperativeSsePayload = {
		...payload,
		at: payload.at ?? new Date().toISOString()
	};
	for (const sub of subscribers) {
		if (sub.hospitalId === full.hospitalId) {
			try {
				sub.send(full);
			} catch {
				subscribers.delete(sub);
			}
		}
	}
}

export { PerioperativeSseEventTypeEnum };
