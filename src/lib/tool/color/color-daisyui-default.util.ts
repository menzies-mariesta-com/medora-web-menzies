/** Approximate default daisyUI theme hex (fallback when hospital has no override). */
export const DAISYUI_DEFAULT_HEX = {
	primary: '#570df8',
	secondary: '#f000b8',
	accent: '#37cdbe',
	neutral: '#3d4451',
	info: '#3abff8',
	success: '#36d399',
	warning: '#fbbd23',
	error: '#f87272',
	base100: '#ffffff',
	base200: '#f2f2f2',
	base300: '#e5e6e6'
} as const;

const TOKEN_TO_HEX: Record<string, string> = {
	primary: DAISYUI_DEFAULT_HEX.primary,
	secondary: DAISYUI_DEFAULT_HEX.secondary,
	accent: DAISYUI_DEFAULT_HEX.accent,
	neutral: DAISYUI_DEFAULT_HEX.neutral,
	info: DAISYUI_DEFAULT_HEX.info,
	success: DAISYUI_DEFAULT_HEX.success,
	warning: DAISYUI_DEFAULT_HEX.warning,
	error: DAISYUI_DEFAULT_HEX.error,
	'base-100': DAISYUI_DEFAULT_HEX.base100,
	'base-200': DAISYUI_DEFAULT_HEX.base200,
	'base-300': DAISYUI_DEFAULT_HEX.base300
};

export function daisyUiTokenToHex(token: string | null | undefined): string {
	const t = token?.trim().toLowerCase() ?? '';
	if (!t) return DAISYUI_DEFAULT_HEX.neutral;
	if (t.startsWith('#') || t.startsWith('rgb')) return token!.trim();
	return TOKEN_TO_HEX[t] ?? DAISYUI_DEFAULT_HEX.neutral;
}