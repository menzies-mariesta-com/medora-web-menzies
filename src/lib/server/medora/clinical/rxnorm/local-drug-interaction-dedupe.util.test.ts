import { describe, expect, it } from 'vitest';
import {
	interactionPairKey,
	mergeInteractionSeverity
} from './local-drug-interaction-dedupe.util';
import { PrescribingAlertSeverityEnum } from '$lib/model/enum/clinical-platform.enum';

describe('interaction dedupe', () => {
	it('merges severity to max', () => {
		expect(
			mergeInteractionSeverity(
				PrescribingAlertSeverityEnum.MODERATE,
				PrescribingAlertSeverityEnum.SEVERE
			)
		).toBe(PrescribingAlertSeverityEnum.SEVERE);
	});

	it('builds stable pair keys', () => {
		expect(interactionPairKey('1', '2', 'DDINTER')).toBe(
			interactionPairKey('2', '1', 'DDINTER')
		);
	});
});
