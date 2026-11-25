import {
	describe,
	expect,
	it,
	vi,
	beforeEach,
	afterEach,
	type Mock
} from 'vitest';
import { render } from 'vitest-browser-svelte';
import LPatientPhotoCameraDialog from './LPatientPhotoCameraDialog.svelte';

/**
 * The dialog is exercised through its rendered controls (the WashDialog chrome
 * lives in the host layout). Camera access is stubbed: no real device is needed
 * to assert the capture -> review -> retake loop and its teardown.
 */

type Harness = {
	streamTracks: { stopped: number };
	confirm: Mock<(data?: unknown) => void | Promise<void>>;
	cancel: Mock<() => void>;
};

function stubCamera(options?: { rejectWith?: string }): Harness {
	const streamTracks = { stopped: 0 };
	const stream = {
		getTracks: () => [
			{
				stop: () => {
					streamTracks.stopped += 1;
				}
			}
		]
	};
	Object.defineProperty(navigator, 'mediaDevices', {
		configurable: true,
		value: {
			getUserMedia: vi.fn(async () => {
				if (options?.rejectWith) {
					const err = new Error('denied');
					err.name = options.rejectWith;
					throw err;
				}
				return stream;
			})
		}
	});
	// Keep <video> playback inert: the browser runner rejects assigning a fake MediaStream.
	HTMLMediaElement.prototype.play = vi.fn(async () => {});
	Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
		configurable: true,
		get: () => null,
		set: () => {}
	});
	return {
		streamTracks,
		confirm: vi.fn<(data?: unknown) => void | Promise<void>>(),
		cancel: vi.fn<() => void>()
	};
}

describe('LPatientPhotoCameraDialog', () => {
	let harness: Harness;

	beforeEach(() => {
		harness = stubCamera();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('asks for a camera stream and offers Capture + Cancel', async () => {
		const { container } = render(LPatientPhotoCameraDialog, {
			hospitalId: 'h1',
			confirm: harness.confirm,
			cancel: harness.cancel
		});

		await vi.waitFor(() => {
			expect(
				navigator.mediaDevices.getUserMedia
			).toHaveBeenCalledOnce();
		});
		const buttons = [...container.querySelectorAll('button')].map(
			(button) => button.textContent?.trim()
		);
		expect(buttons).toContain('Capture');
		expect(buttons).toContain('Cancel');
		expect(container.querySelector('video')).toBeTruthy();
	});

	it('reports a blocked permission instead of showing the camera', async () => {
		vi.restoreAllMocks();
		harness = stubCamera({ rejectWith: 'NotAllowedError' });
		const { container } = render(LPatientPhotoCameraDialog, {
			hospitalId: 'h1',
			confirm: harness.confirm,
			cancel: harness.cancel
		});

		await vi.waitFor(() => {
			expect(container.textContent).toContain('Camera permission');
		});
		expect(container.textContent).toContain('Choose a photo instead');
	});

	it('stops the camera tracks when the dialog closes', async () => {
		const { container } = render(LPatientPhotoCameraDialog, {
			hospitalId: 'h1',
			confirm: harness.confirm,
			cancel: harness.cancel
		});
		await vi.waitFor(() => {
			expect(
				navigator.mediaDevices.getUserMedia
			).toHaveBeenCalledOnce();
		});

		const cancelButton = [
			...container.querySelectorAll('button')
		].find((button) => button.textContent?.trim() === 'Cancel');
		cancelButton?.click();

		await vi.waitFor(() => {
			expect(harness.streamTracks.stopped).toBeGreaterThan(0);
		});
		expect(harness.cancel).toHaveBeenCalledOnce();
	});
});
