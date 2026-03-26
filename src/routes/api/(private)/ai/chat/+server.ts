import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/auth/server';
import {
	invokeChat,
	type InvokeChatInput
} from '$lib/server/ai/langchain.service.server';
import { apiLogger } from '$lib/logger';

/**
 * Authenticated JSON chat endpoint. Body: `{ messages: SimpleChatMessage[] }`.
 * Returns `{ text: string }` with the assistant reply text.
 */
export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({
		headers: request.headers
	});
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const messages = (body as { messages?: unknown })?.messages;
	if (!Array.isArray(messages) || messages.length === 0) {
		throw error(400, 'Expected non-empty `messages` array');
	}

	try {
		const { content } = await invokeChat({
			messages: messages as InvokeChatInput['messages']
		});
		return json({ text: content });
	} catch (err) {
		const message =
			err instanceof Error ? err.message : 'AI request failed';
		apiLogger.error(
			'api/ai/chat failed',
			err instanceof Error ? err : new Error(String(err))
		);
		throw error(502, message);
	}
};
