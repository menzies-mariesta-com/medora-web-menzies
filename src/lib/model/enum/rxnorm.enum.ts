export enum DrugInteractionSourceEnum {
	DDINTER = 'DDINTER',
	OPENFDA = 'OPENFDA'
}

export enum RxnormImportSourceEnum {
	NLM_RXNORM_FULL = 'NLM_RXNORM_FULL'
}

/** Term types kept for prescribe/mapping search (RxNorm). */
export const RXNORM_PRESCRIBE_TTYS = [
	'IN',
	'PIN',
	'SCD',
	'GP',
	'SCDF',
	'BN'
] as const;

export const RXNORM_INGREDIENT_RELAS = [
	'has_ingredient',
	'consists_of',
	'tradename_of',
	'has_tradename'
] as const;
