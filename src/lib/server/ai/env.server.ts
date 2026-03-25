import { env } from '$env/dynamic/private';

export type OpenAiConfig = {
	apiKey: string;
	model: string;
	baseUrl?: string;
};

const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Reads OpenAI-related env. Call only on the server (e.g. from routes or remotes).
 * @throws Error if `OPENAI_API_KEY` is missing or blank.
 */
export function getOpenAiConfig(): OpenAiConfig {
	const apiKey = env.OPENAI_API_KEY?.trim();
	if (!apiKey) {
		throw new Error(
			'OPENAI_API_KEY is not set. Add it to your environment to use the AI service.'
		);
	}
	const model = env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
	const baseUrl = env.OPENAI_BASE_URL?.trim() || undefined;
	return { apiKey, model, baseUrl };
}
