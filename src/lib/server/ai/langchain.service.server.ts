import {
	AIMessage,
	AIMessageChunk,
	type BaseMessage,
	HumanMessage,
	SystemMessage
} from '@langchain/core/messages';
import { log } from '$lib/logger';
import { getChatModel, type ChatModelOverrides } from './llm.server';

const scope = 'langchain.service';

export type ChatRole = 'system' | 'user' | 'assistant';

/** Simple role/content pairs; mapped to LangChain messages. */
export type SimpleChatMessage = { role: ChatRole; content: string };

export type InvokeChatInput = {
	messages: BaseMessage[] | SimpleChatMessage[];
} & ChatModelOverrides;

function isSimpleMessageList(
	messages: BaseMessage[] | SimpleChatMessage[]
): messages is SimpleChatMessage[] {
	if (messages.length === 0) return false;
	const first = messages[0];
	return (
		typeof first === 'object' &&
		first !== null &&
		'role' in first &&
		typeof (first as SimpleChatMessage).role === 'string' &&
		'content' in first
	);
}

/** Normalize simple or native LangChain messages to {@link BaseMessage}[]. */
export function toBaseMessages(
	messages: BaseMessage[] | SimpleChatMessage[]
): BaseMessage[] {
	if (messages.length === 0) {
		throw new Error('At least one message is required');
	}
	if (!isSimpleMessageList(messages)) {
		return messages as BaseMessage[];
	}
	return messages.map((m) => {
		switch (m.role) {
			case 'system':
				return new SystemMessage(m.content);
			case 'assistant':
				return new AIMessage(m.content);
			case 'user':
			default:
				return new HumanMessage(m.content);
		}
	});
}

function chunkContentToString(content: AIMessageChunk['content']): string {
	if (typeof content === 'string') return content;
	if (Array.isArray(content)) {
		return content
			.map((part) => {
				if (typeof part === 'string') return part;
				if (
					part &&
					typeof part === 'object' &&
					'text' in part &&
					typeof (part as { text: string }).text === 'string'
				) {
					return (part as { text: string }).text;
				}
				return '';
			})
			.join('');
	}
	if (content && typeof content === 'object') {
		return JSON.stringify(content);
	}
	return String(content ?? '');
}

export type InvokeChatResult = {
	/** Plain text extracted from the model message. */
	content: string;
	/** Raw LangChain message (for tool calls, metadata, etc.). */
	raw: AIMessageChunk;
};

/**
 * Non-streaming chat completion. Server-only.
 */
export async function invokeChat(
	input: InvokeChatInput
): Promise<InvokeChatResult> {
	const { messages, ...overrides } = input;
	const model = getChatModel(overrides);
	const baseMessages = toBaseMessages(messages);
	try {
		const raw = await model.invoke(baseMessages);
		const content = chunkContentToString(raw.content);
		return { content, raw };
	} catch (err) {
		log.error(
			'invokeChat failed',
			err instanceof Error ? err : new Error(String(err)),
			{ scope }
		);
		throw err;
	}
}

export type StreamChatInput = InvokeChatInput;

/**
 * Streaming chat completion. Yields {@link AIMessageChunk}s from the model.
 * Server-only. For HTTP, pipe chunks or aggregate in the route handler.
 */
export async function* streamChat(
	input: StreamChatInput
): AsyncGenerator<AIMessageChunk> {
	const { messages, ...overrides } = input;
	const model = getChatModel(overrides);
	const baseMessages = toBaseMessages(messages);
	try {
		const stream = await model.stream(baseMessages);
		for await (const chunk of stream) {
			yield chunk;
		}
	} catch (err) {
		log.error(
			'streamChat failed',
			err instanceof Error ? err : new Error(String(err)),
			{ scope }
		);
		throw err;
	}
}
