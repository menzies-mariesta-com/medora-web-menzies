import { carePlanSections } from '$lib/tool/nursing/care-plan.util';
import type { CarePlanContent } from '$lib/model/type/medora/clinical-platform.type';

/**
 * Starter NANDA care plans seeded per hospital on first load. Interventions are
 * one per line; `defaults` prefill the nurse's form so only the patient-specific
 * parts need typing.
 */
export const STARTER_CARE_PLAN_TEMPLATES: {
	title: string;
	nandaLabel: string;
	defaults: CarePlanContent;
}[] = [
	{
		title: 'Risk for falls',
		nandaLabel: '00055 Risk for falls',
		defaults: {
			problem:
				'Risk for increased susceptibility to falls from bed, chair, or while walking.',
			goal: 'Patient remains free of falls throughout the admission.',
			interventions:
				'Assess fall risk every shift\nKeep bed in lowest position, brakes locked\nCall bell within reach and answered promptly\nNon-slip footwear when mobilising\nAssist to toilet at least every 2 hours\nNight light on, clear pathway'
		}
	},
	{
		title: 'Risk for pressure injury',
		nandaLabel: '00047 Risk for pressure injury',
		defaults: {
			problem:
				'Risk for localized damage to skin and underlying tissue due to prolonged pressure.',
			goal: 'Skin stays intact with no new pressure injury.',
			interventions:
				'Full skin inspection every shift\nReposition at least every 2 hours\nBraden score every shift\nKeep skin clean and dry, barrier cream as needed\nPressure-redistributing mattress in use\nNutrition and hydration review'
		}
	},
	{
		title: 'Acute pain',
		nandaLabel: '00132 Acute pain',
		defaults: {
			problem:
				'Unpleasant sensory and emotional experience from an actual or potential injury.',
			goal: 'Patient reports pain at or below 3/10 within 1 hour of intervention.',
			interventions:
				'Assess pain score, site, and character every 4 hours and after analgesia\nGive prescribed analgesia and reassess in 1 hour\nSupport positioning and comfort measures\nEncourage distraction and breathing techniques\nNotify prescriber if pain unrelieved or escalating'
		}
	},
	{
		title: 'Ineffective airway clearance',
		nandaLabel: '00031 Ineffective airway clearance',
		defaults: {
			problem:
				'Inability to clear secretions or obstruction from the respiratory tract.',
			goal: 'Airway stays clear with unlaboured breathing and SpO2 within target range.',
			interventions:
				'Assess respirations, lung sounds, and SpO2 every 4 hours\nElevate head of bed 30-45 degrees\nEncourage coughing and deep breathing every 2 hours\nSuction as needed\nMaintain hydration\nEscalate to prescriber if respiratory distress'
		}
	},
	{
		title: 'Imbalanced nutrition less than body requirements',
		nandaLabel:
			'00002 Imbalanced nutrition: less than body requirements',
		defaults: {
			problem: 'Intake insufficient to meet metabolic needs.',
			goal: 'Patient tolerates prescribed intake with stable weight.',
			interventions:
				'Weigh daily and record intake and output\nDietitian review and diet per prescription\nSit upright for meals, provide oral hygiene before meals\nRecord percentage of each meal eaten\nOffer small frequent high-protein snacks'
		}
	},
	{
		title: 'Deficient fluid volume',
		nandaLabel: '00027 Deficient fluid volume',
		defaults: {
			problem:
				'Decreased intravascular, interstitial, or intracellular fluid.',
			goal: 'Fluid balance restored with stable observations and adequate urine output.',
			interventions:
				'Strict intake and output record\nVital signs including postural blood pressure every 4 hours\nAssess mucous membranes, skin turgor, and capillary refill\nGive fluids and prescribed intravenous therapy\nMonitor electrolytes as prescribed'
		}
	},
	{
		title: 'Impaired skin integrity',
		nandaLabel: '00046 Impaired skin integrity',
		defaults: {
			problem:
				'Altered epidermis or dermis, including device-related damage.',
			goal: 'Skin lesion heals without infection or further breakdown.',
			interventions:
				'Assess wound and surrounding skin every shift, measure and document\nDressing change per prescription using aseptic technique\nKeep surrounding skin clean and dry\nReposition every 2 hours\nReport signs of infection to prescriber'
		}
	},
	{
		title: 'Anxiety',
		nandaLabel: '00146 Anxiety',
		defaults: {
			problem:
				'Vague, uneasy feeling arising from an unspecified or unknown threat.',
			goal: 'Patient reports reduced anxiety and displays calm behaviour.',
			interventions:
				'Assess level of anxiety and coping every shift\nProvide clear explanations of procedures and plan of care\nAllow time for questions and concerns\nInvolve family per patient wishes\nTeach relaxation and breathing techniques'
		}
	}
];

/** `sections_json` for one starter template: the shared form plus its prefill. */
export function starterCarePlanSchema(
	defaults: CarePlanContent
): ReturnType<typeof carePlanSections> {
	return { ...carePlanSections(), defaults };
}
