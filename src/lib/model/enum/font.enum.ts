/**
 * Menzies Design studio typefaces
 * (@see https://design-menzies.netlify.app/ — Assets → Fonts).
 *
 * - Maple Mono / Fraunces: bundled in Wash UI `styles.css`
 * - Adwaita Sans / Mono: Design asset catalog (local woff2 under `$lib/asset/font`)
 */
export enum FontEnum {
	MAPLE_MONO = 'maple-mono',
	FRAUNCES = 'fraunces',
	ADWAITA_SANS = 'adwaita-sans',
	ADWAITA_MONO = 'adwaita-mono'
}

export type WashFontStyle = {
	id: FontEnum;
	label: string;
	note: string;
};

/** Design Fonts catalog order: hero Maple/Fraunces, then Adwaita plates. */
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
	},
	{
		id: FontEnum.ADWAITA_SANS,
		label: 'Adwaita Sans',
		note: 'GNOME UI sans-serif'
	},
	{
		id: FontEnum.ADWAITA_MONO,
		label: 'Adwaita Mono',
		note: 'GNOME UI monospace'
	}
] as const;
