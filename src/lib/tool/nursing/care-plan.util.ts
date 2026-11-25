import type {
	CarePlanContent,
	CarePlanTemplateSchema
} from '$lib/model/type/medora/clinical-platform.type';

/** The four fields every care plan carries, in display order. */
export function carePlanSections(): CarePlanTemplateSchema {
	return {
		sections: [
			{
				id: 'problem',
				type: 'textarea',
				label: 'Problem',
				required: true
			},
			{
				id: 'goal',
				type: 'textarea',
				label: 'Goal / expected outcome',
				required: true
			},
			{
				id: 'interventions',
				type: 'textarea',
				label: 'Interventions (one per line)'
			},
			{
				id: 'evaluation',
				type: 'textarea',
				label: 'Evaluation'
			}
		]
	};
}

/** Interventions are stored as one per line; blank lines are dropped. */
export function parseInterventionLines(
	text: string | undefined | null
): string[] {
	if (!text) return [];
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

/** Template prefill for a new plan; the user's own values always win. */
export function mergeCarePlanDefaults(
	schema: CarePlanTemplateSchema | null | undefined,
	values: CarePlanContent = {}
): CarePlanContent {
	const merged: CarePlanContent = { ...(schema?.defaults ?? {}) };
	for (const [key, value] of Object.entries(values)) {
		if (typeof value === 'string' && value.trim() !== '') {
			merged[key as keyof CarePlanContent] = value;
		}
	}
	return merged;
}

const CARE_PLAN_FIELDS = [
	'problem',
	'goal',
	'interventions',
	'evaluation'
] as const satisfies readonly (keyof CarePlanContent)[];

/**
 * Only the four known fields survive: an arbitrary client payload must never be
 * stored, so unknown keys are dropped rather than echoed into `content_json`.
 */
export function readCarePlanContent(
	raw: unknown
): { ok: true; content: CarePlanContent } | { ok: false } {
	if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
		return { ok: false };
	}
	const content: CarePlanContent = {};
	for (const key of CARE_PLAN_FIELDS) {
		const value = (raw as Record<string, unknown>)[key];
		if (typeof value === 'string') content[key] = value;
	}
	return { ok: true, content };
}
