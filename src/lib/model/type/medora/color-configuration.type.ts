import type { ColorCatalogEntry } from '$lib/model/const/color-purpose.const';

export type HospitalColorConfigRow = {
	id: number;
	category: string;
	entityKey: string;
	color: string;
};

export type ColorConfigurationPayload = {
	configured: HospitalColorConfigRow[];
	/** Resolved map: `category:entityKey` → color */
	resolvedMap: Record<string, string>;
	catalog: ColorCatalogEntry[];
	dynamicTriage: {
		level: number;
		name: string;
		entityKey: string;
	}[];
	dynamicTrauma: {
		code: string;
		name: string;
		entityKey: string;
	}[];
};

export type VisitBarColorHints = {
	visitTypeBorderColor: string | null;
	edTriageRibbonColor: string | null;
	edTriageLevelName: string | null;
};