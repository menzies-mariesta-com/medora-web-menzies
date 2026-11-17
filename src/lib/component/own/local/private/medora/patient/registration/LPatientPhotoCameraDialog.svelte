<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import LucideCamera from '$lib/component/own/library/lucide/LucideCamera.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { captureFrameSize } from '$lib/util/patient-photo-capture.util';
	import { paraglideMsg } from '$lib/util/paraglide-msg.util';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { onDestroy, onMount } from 'svelte';

	type PatientPhotoCameraDialogProps = DialogSlotProps & {
		hospitalId: string;
	};

	let { confirm, cancel, hospitalId }: PatientPhotoCameraDialogProps =
		$props();

	/** Longest edge kept: enough for an avatar, small enough to stay well under 5MB. */
	const MAX_CAPTURE_SIZE = 1280;
	const JPEG_QUALITY = 0.9;

	let videoEl: HTMLVideoElement | null = $state(null);
	let stream: MediaStream | null = null;
	let phase: 'starting' | 'live' | 'captured' | 'error' =
		$state('starting');
	let errorMessage = $state('');
	let capturePreviewUrl = $state('');
	let previewBlob: File | null = null;
	let uploading = $state(false);

	const msg = (key: string, fallback: string) =>
		paraglideMsg(key, fallback);

	function stopStream() {
		stream?.getTracks().forEach((track) => track.stop());
		stream = null;
	}

	function clearPreview() {
		if (capturePreviewUrl) URL.revokeObjectURL(capturePreviewUrl);
		capturePreviewUrl = '';
		previewBlob = null;
	}

	function cameraErrorMessage(err: unknown): string {
		const name = err instanceof Error ? err.name : '';
		if (name === 'NotAllowedError' || name === 'SecurityError') {
			return msg(
				'patient_photo_camera_denied',
				'Camera permission was blocked. Allow camera access for this site, or choose a photo instead.'
			);
		}
		if (name === 'NotReadableError' || name === 'AbortError') {
			return msg(
				'patient_photo_camera_busy',
				'The camera is already in use by another app. Close it and try again, or choose a photo instead.'
			);
		}
		return msg(
			'patient_photo_camera_unavailable',
			'No camera is available on this device. Choose a photo instead.'
		);
	}

	async function startCamera() {
		clearPreview();
		errorMessage = '';
		phase = 'starting';

		if (
			!window.isSecureContext ||
			!navigator.mediaDevices?.getUserMedia
		) {
			phase = 'error';
			errorMessage = window.isSecureContext
				? msg(
						'patient_photo_camera_unavailable',
						'No camera is available on this device. Choose a photo instead.'
					)
				: msg(
						'patient_photo_camera_insecure',
						'The camera only works over HTTPS. Open this page with https, or choose a photo instead.'
					);
			return;
		}

		try {
			const next = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'user',
					width: { ideal: 1280 },
					height: { ideal: 1280 }
				},
				audio: false
			});
			stopStream();
			stream = next;
			phase = 'live';
			// iOS Safari needs the explicit play() call, not just autoplay.
			await attachStream();
		} catch (err) {
			phase = 'error';
			errorMessage = cameraErrorMessage(err);
		}
	}

	async function attachStream() {
		const el = videoEl;
		if (!el || !stream) return;
		el.srcObject = stream;
		try {
			await el.play();
		} catch {
			// Autoplay refusal still shows the frame once muted playback starts.
		}
	}

	function captureFrame() {
		const el = videoEl;
		if (!el || !el.videoWidth || !el.videoHeight) {
			errorMessage = msg(
				'patient_photo_camera_starting',
				'Starting camera…'
			);
			return;
		}
		const { size, x, y } = captureFrameSize(
			el.videoWidth,
			el.videoHeight,
			MAX_CAPTURE_SIZE
		);
		if (!size) {
			errorMessage = msg(
				'patient_photo_capture_failed',
				'Could not capture the photo. Please try again.'
			);
			return;
		}

		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.drawImage(el, x, y, size, size, 0, 0, size, size);

		canvas.toBlob(
			(blob) => {
				if (!blob) {
					errorMessage = msg(
						'patient_photo_capture_failed',
						'Could not capture the photo. Please try again.'
					);
					return;
				}
				errorMessage = '';
				previewBlob = new File([blob], 'patient-photo.jpg', {
					type: 'image/jpeg'
				});
				capturePreviewUrl = URL.createObjectURL(blob);
				// Release the camera while the user reviews the shot.
				stopStream();
				phase = 'captured';
			},
			'image/jpeg',
			JPEG_QUALITY
		);
	}

	async function usePhoto() {
		const file = previewBlob;
		if (!file) return;
		uploading = true;
		errorMessage = '';
		try {
			const fd = new FormData();
			fd.set('hospitalId', hospitalId);
			fd.set('photo', file);
			const res = await fetch('/api/upload/patient-photo', {
				method: 'POST',
				body: fd
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			const data = (await res.json().catch(() => ({}))) as {
				url?: string;
			};
			if (!data.url) throw new Error('Upload failed.');
			// Preview is revoked here; the caller re-creates one from `file`.
			clearPreview();
			await confirm({ url: data.url, file });
		} catch (err) {
			errorMessage =
				err instanceof Error
					? err.message
					: 'Photo upload failed. Please try again.';
		} finally {
			uploading = false;
		}
	}

	function closeDialog() {
		stopStream();
		clearPreview();
		cancel();
	}

	$effect(() => {
		if (phase === 'live') void attachStream();
	});

	onMount(() => {
		void startCamera();
	});

	onDestroy(() => {
		stopStream();
		clearPreview();
	});
</script>

<div
	class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
>
	{#if errorMessage}
		<WashAlert type={StatusColorEnum.ERROR} message={errorMessage} />
	{/if}

	<div
		class="rounded-box mx-auto flex aspect-square w-full max-w-sm items-center justify-center overflow-hidden bg-base-300"
	>
		{#if phase === 'captured' && capturePreviewUrl}
			<img
				src={capturePreviewUrl}
				alt="Captured preview"
				class="size-full object-cover"
			/>
		{:else if phase === 'error'}
			<div class="flex flex-col items-center gap-2 p-6 text-center">
				<LucideCamera className="size-8 opacity-60" />
				<p class="text-sm text-base-content/70">
					{msg(
						'patient_photo_camera_unavailable',
						'No camera is available on this device. Choose a photo instead.'
					)}
				</p>
			</div>
		{:else}
			<!-- muted + playsinline: required for iOS Safari inline playback -->
			<video
				bind:this={videoEl}
				class="size-full object-cover"
				autoplay
				muted
				playsinline
				aria-label="Live camera preview"
			></video>
		{/if}
	</div>

	{#if phase === 'live'}
		<p class="text-center text-xs text-base-content/70">
			{msg(
				'patient_photo_camera_hint',
				'Look at the camera and capture when you are ready. You can retake as often as you like.'
			)}
		</p>
	{:else if phase === 'starting'}
		<p class="text-center text-xs text-base-content/70">
			{msg('patient_photo_camera_starting', 'Starting camera…')}
		</p>
	{/if}
</div>

<WashDialogFooter className="gap-2">
	{#if phase === 'captured'}
		<WashButton
			type="button"
			className="btn-primary"
			loading={uploading}
			onClick={usePhoto}
		>
			{msg('patient_photo_use', 'Use photo')}
		</WashButton>
		<WashButton
			type="button"
			className="btn-ghost"
			disabled={uploading}
			onClick={startCamera}
		>
			{msg('patient_photo_retake', 'Retake')}
		</WashButton>
	{:else if phase === 'error'}
		<WashButton
			type="button"
			className="btn-ghost"
			onClick={closeDialog}
		>
			{msg('close', 'Close')}
		</WashButton>
	{:else}
		<WashButton
			type="button"
			className="btn-primary"
			disabled={phase !== 'live'}
			onClick={captureFrame}
		>
			<span class="inline-flex items-center gap-2">
				<LucideCamera className="size-4" />
				{msg('patient_photo_capture', 'Capture')}
			</span>
		</WashButton>
		<WashButton
			type="button"
			className="btn-ghost"
			onClick={closeDialog}
		>
			{msg('cancel', 'Cancel')}
		</WashButton>
	{/if}
</WashDialogFooter>
