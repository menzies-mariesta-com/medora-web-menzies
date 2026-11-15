import { daisyUiTokenToHex } from '$lib/tool/color/color-daisyui-default.util';
import { normalizeColorInput } from '$lib/tool/color/validate-color.util';

export type Hsl = {
	h: number;
	s: number;
	l: number;
};

const RGBA_HEAD =
	/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i;

function clamp(n: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, n));
}

function rgbToHex(r: number, g: number, b: number): string {
	return (
		'#' +
		[r, g, b]
			.map((n) =>
				clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
			)
			.join('')
	);
}

/** #RRGGBB. Daisy tokens resolve. shortcut: rgba alpha is dropped, add an opacity slider if stored alpha must round-trip. */
export function colorToHex(raw: string): string {
	const token = daisyUiTokenToHex(raw).trim();
	if (token.startsWith('#')) {
		const norm = normalizeColorInput(token);
		if (!norm) return '#3d4451';
		return norm.length === 9 ? norm.slice(0, 7) : norm;
	}
	const match = token.match(RGBA_HEAD);
	if (match) {
		return rgbToHex(
			Number(match[1]),
			Number(match[2]),
			Number(match[3])
		);
	}
	return '#3d4451';
}

export function hexToHsl(raw: string): Hsl {
	const hex = colorToHex(raw);
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h = 0;
	if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
	else if (max === g) h = (b - r) / d + 2;
	else h = (r - g) / d + 4;
	return {
		h: Math.round(h * 60) % 360,
		s: Math.round(s * 100),
		l: Math.round(l * 100)
	};
}

export function hslToHex(hsl: Hsl): string {
	const h = ((hsl.h % 360) + 360) % 360;
	const s = clamp(hsl.s, 0, 100) / 100;
	const l = clamp(hsl.l, 0, 100) / 100;
	if (s === 0) {
		const v = Math.round(l * 255);
		return rgbToHex(v, v, v);
	}
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const hp = h / 60;
	const x = c * (1 - Math.abs((hp % 2) - 1));
	let r = 0;
	let g = 0;
	let b = 0;
	if (hp < 1) {
		r = c;
		g = x;
	} else if (hp < 2) {
		r = x;
		g = c;
	} else if (hp < 3) {
		g = c;
		b = x;
	} else if (hp < 4) {
		g = x;
		b = c;
	} else if (hp < 5) {
		r = x;
		b = c;
	} else {
		r = c;
		b = x;
	}
	const m = l - c / 2;
	return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** Hue 0 is the top of a CSS conic-gradient disc, increasing clockwise. */
export function hueFromPointer(
	clientX: number,
	clientY: number,
	rect: { left: number; top: number; width: number; height: number }
): number {
	const dx = clientX - (rect.left + rect.width / 2);
	const dy = clientY - (rect.top + rect.height / 2);
	const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
	return Math.round((deg + 90 + 360) % 360);
}

export function hueIndicatorPercent(h: number): {
	left: string;
	top: string;
} {
	const rad = ((((h % 360) + 360) % 360) - 90) * (Math.PI / 180);
	const radius = 34;
	return {
		left: `${50 + radius * Math.cos(rad)}%`,
		top: `${50 + radius * Math.sin(rad)}%`
	};
}

export function contrastText(hex: string): string {
	return hexToHsl(hex).l > 62 ? '#1f2937' : '#ffffff';
}
