/** Menzies product tile on the in-app ecosystem hub (subscription wiring TBD). */
export type MenziesEcosystemProductId =
	| 'nextup'
	| 'medora_patients'
	| 'medora_doctors';

export type MenziesEcosystemProduct = {
	id: MenziesEcosystemProductId;
	/** When true, `externalUrl` opens in a new tab (placeholder until billing integration). */
	purchased: boolean;
	externalUrl: string | null;
};
