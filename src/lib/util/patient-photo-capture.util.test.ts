import { describe, expect, it } from 'vitest';
import { captureFrameSize } from './patient-photo-capture.util';

describe('captureFrameSize', () => {
	it('crops the centred square of a landscape frame', () => {
		expect(captureFrameSize(1920, 1080, 1280)).toEqual({
			size: 1080,
			x: 420,
			y: 0
		});
	});

	it('crops the centred square of a portrait frame', () => {
		expect(captureFrameSize(720, 1280, 1280)).toEqual({
			size: 720,
			x: 0,
			y: 280
		});
	});

	it('caps the size on a large square frame', () => {
		expect(captureFrameSize(4000, 4000, 1280)).toEqual({
			size: 1280,
			x: 1360,
			y: 1360
		});
	});

	it('never upscales a small frame', () => {
		expect(captureFrameSize(240, 320, 1280)).toEqual({
			size: 240,
			x: 0,
			y: 40
		});
	});

	it('returns an empty box for unusable dimensions', () => {
		expect(captureFrameSize(0, 0, 1280)).toEqual({
			size: 0,
			x: 0,
			y: 0
		});
		expect(captureFrameSize(Number.NaN, 480, 1280)).toEqual({
			size: 0,
			x: 0,
			y: 0
		});
	});
});
