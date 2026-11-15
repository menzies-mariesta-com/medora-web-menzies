import { describe, expect, it } from 'vitest';
import {
	colorToHex,
	hexToHsl,
	hslToHex,
	hueFromPointer
} from './color-hsl.util';

const disc = { left: 0, top: 0, width: 100, height: 100 };

describe('color-hsl.util', () => {
	it('round-trips primary hues', () => {
		expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe('#ff0000');
		expect(hslToHex({ h: 120, s: 100, l: 50 })).toBe('#00ff00');
		expect(hslToHex({ h: 240, s: 100, l: 50 })).toBe('#0000ff');
		expect(hexToHsl('#ff0000')).toEqual({ h: 0, s: 100, l: 50 });
	});

	it('drops rgba alpha and expands short hex', () => {
		expect(colorToHex('rgba(255, 128, 0, 0.4)')).toBe('#ff8000');
		expect(colorToHex('#abc')).toBe('#aabbcc');
		expect(colorToHex('primary')).toBe('#570df8');
	});

	it('reads hue clockwise from the top of the disc', () => {
		expect(hueFromPointer(50, 0, disc)).toBe(0);
		expect(hueFromPointer(100, 50, disc)).toBe(90);
		expect(hueFromPointer(50, 100, disc)).toBe(180);
		expect(hueFromPointer(0, 50, disc)).toBe(270);
	});
});
