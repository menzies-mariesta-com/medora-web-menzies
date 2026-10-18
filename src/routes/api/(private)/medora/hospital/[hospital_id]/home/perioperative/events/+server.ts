import type { RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	subscribePerioperativeEvents,
	type PerioperativeSsePayload
} from '$lib/server/medora/perioperative/perioperative-event-bus.server';

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);

	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();
			const send = (payload: PerioperativeSsePayload) => {
				controller.enqueue(
					encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
				);
			};
			send({
				type: 'connected',
				hospitalId,
				at: new Date().toISOString()
			});
			const unsubscribe = subscribePerioperativeEvents(
				hospitalId,
				send
			);
			const heartbeat = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': ping\n\n'));
				} catch {
					clearInterval(heartbeat);
				}
			}, 25000);

			event.request.signal.addEventListener('abort', () => {
				clearInterval(heartbeat);
				unsubscribe();
				try {
					controller.close();
				} catch {
					/* already closed */
				}
			});
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
}
