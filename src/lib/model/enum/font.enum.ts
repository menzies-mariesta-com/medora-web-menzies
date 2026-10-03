/**
 * Menzies Design Wash UI typefaces
 * (@see https://design-menzies.netlify.app/ Assets → Fonts).
 *
 * Full Wash UI catalog: Fraunces + Maple Mono ship in
 * `@menzies-mariesta-com/menzies-design-wash-ui/styles.css`.
 */
export enum FontEnum {
	MAPLE_MONO = 'maple-mono',
	FRAUNCES = 'fraunces'
}

export type WashFontStyle = {
	id: FontEnum;
	label: string;
	note: string;
	/** CSS `font-family` stack for select option preview. */
	stack: string;
};

/** Full Wash UI face list (studio default: Maple Mono body + Fraunces display). */
export const WASH_FONT_STYLES: readonly WashFontStyle[] = [
	{
		id: FontEnum.MAPLE_MONO,
		label: 'Maple Mono',
		note: 'Body and monospace UI',
		stack: "'Maple Mono', ui-monospace, monospace"
	},
	{
		id: FontEnum.FRAUNCES,
		label: 'Fraunces',
		note: 'Display headings',
		stack: "'Fraunces', ui-serif, Georgia, serif"
	}
] as const;
