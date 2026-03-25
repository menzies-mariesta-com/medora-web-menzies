import { ChatOpenAI } from '@langchain/openai';
import { getOpenAiConfig } from './env.server';

export type ChatModelOverrides = {
	model?: string;
	temperature?: number;
	maxTokens?: number;
};

/**
 * Factory for a {@link ChatOpenAI} instance using app env + optional overrides.
 * Server-only.
 */
export function getChatModel(overrides?: ChatModelOverrides): ChatOpenAI {
	const cfg = getOpenAiConfig();
	return new ChatOpenAI({
		apiKey: cfg.apiKey,
		model: overrides?.model ?? cfg.model,
		temperature: overrides?.temperature ?? 0.7,
		maxTokens: overrides?.maxTokens,
		configuration: cfg.baseUrl ? { baseURL: cfg.baseUrl } : undefined
	});
}
