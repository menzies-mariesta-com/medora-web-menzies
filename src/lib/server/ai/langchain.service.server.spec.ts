import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HumanMessage } from '@langchain/core/messages';
import { invokeChat, toBaseMessages } from './langchain.service.server';

vi.mock('./llm.server.ts', () => ({
	getChatModel: vi.fn(() => ({
		invoke: vi.fn(async () => ({ content: 'mock reply' })),
		stream: vi.fn(async function* () {
			yield { content: 'x' };
		})
	}))
}));

describe('toBaseMessages', () => {
	it('maps simple user message to HumanMessage', () => {
		const msgs = toBaseMessages([{ role: 'user', content: 'hi' }]);
		expect(msgs).toHaveLength(1);
		expect(msgs[0]).toBeInstanceOf(HumanMessage);
	});

	it('maps system and assistant', () => {
		const msgs = toBaseMessages([
			{ role: 'system', content: 'You are helpful.' },
			{ role: 'assistant', content: 'Hello.' },
			{ role: 'user', content: 'Hi' }
		]);
		expect(msgs).toHaveLength(3);
	});
});

describe('invokeChat', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns content from mocked model', async () => {
		const { content } = await invokeChat({
			messages: [{ role: 'user', content: 'test' }]
		});
		expect(content).toBe('mock reply');
	});
});
