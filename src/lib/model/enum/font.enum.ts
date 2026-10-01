/**
 * Menzies Design Wash UI typefaces
 * (@see https://design-menzies.netlify.app/ — Assets → Fonts).
 *
 * Fraunces + Maple Mono ship in `@menzies-mariesta-com/menzies-design-wash-ui/styles.css`.
 */
export enum FontEnum {
	MAPLE_MONO = 'maple-mono',
	FRAUNCES = 'fraunces'
}

export type WashFontStyle = {
	id: FontEnum;
	label: string;
	note: string;
};

/** Wash UI faces only (studio default: Maple Mono body + Fraunces display). */
export const WASH_FONT_STYLES: readonly WashFontStyle[] = [
	{
		id: FontEnum.MAPLE_MONO,
		label: 'Maple Mono',
		note: 'Body and monospace UI'
	},
	{
		id: FontEnum.FRAUNCES,
		label: 'Fraunces',
		note: 'Display headings'
	}
] as const;
