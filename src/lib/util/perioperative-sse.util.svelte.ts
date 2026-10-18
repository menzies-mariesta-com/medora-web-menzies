import type { PerioperativeSsePayload } from '$lib/model/type/medora/perioperative-sse.type';

export function connectPerioperativeSse(input: {
	hospitalId: string;
	onEvent: (payload: PerioperativeSsePayload) => void;
	onError?: () => void;
}): () => void {
	if (typeof EventSource === 'undefined') {
		return () => {};
	}
	const url = `/api/medora/hospital/${input.hospitalId}/home/perioperative/events`;
	const es = new EventSource(url);
	es.onmessage = (ev) => {
		try {
			const payload = JSON.parse(ev.data) as PerioperativeSsePayload;
			input.onEvent(payload);
		} catch {
			/* ignore malformed */
		}
	};
	es.onerror = () => {
		input.onError?.();
	};
	return () => {
		es.close();
	};
}
