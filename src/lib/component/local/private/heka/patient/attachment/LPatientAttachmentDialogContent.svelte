<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { PatientAttachmentDialogState } from '$lib/state/patient-attachment.dialog.state.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTextarea from '$lib/component/library/daisyui/textarea/DaisyUiTextarea.svelte';
	import LucideX from '$lib/component/library/lucide/LucideX.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { createPatientAttachment } from '$lib/remote/table/information-table/patient-attachment.remote';

	let { cancel }: DialogSlotProps = $props();

	const payload = $derived(PatientAttachmentDialogState.pending);
	const toastService = new ToastService();

	let attachmentFile: File | null = $state(null);
	let attachmentInputEl: HTMLInputElement | undefined = $state();
	let description = $state('');
	let isSubmitting = $state(false);

	function handleFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		attachmentFile = input.files?.[0] ?? null;
	}

	async function handleOnSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!payload) return;
		if (!attachmentFile) {
			toastService.addToast('Please choose a file to upload.', StatusColorEnum.ERROR);
			return;
		}

		isSubmitting = true;
		try {
			const fd = new FormData();
			fd.set('photo', attachmentFile);
			const res = await fetch('/api/upload/staff-photo', {
				method: 'POST',
				body: fd
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || !data.url) {
				toastService.addToast(
					data.error ?? 'File upload failed.',
					StatusColorEnum.ERROR
				);
				isSubmitting = false;
				return;
			}

			await createPatientAttachment({
				patientId: payload.patientId,
				fileUrl: data.url,
				description: description.trim() || undefined
			});
			toastService.addToast('Attachment saved successfully.', StatusColorEnum.SUCCESS);
			attachmentFile = null;
			if (attachmentInputEl) attachmentInputEl.value = '';
			description = '';
		} catch (error: unknown) {
			let message: string | null = null;
			if (error && typeof error === 'object') {
				const err = error as { message?: string; body?: { message?: string } };
				if (err.body && typeof err.body.message === 'string') {
					message = err.body.message;
				} else if (typeof err.message === 'string') {
					message = err.message;
				}
			}
			toastService.addToast(
				message ?? 'Failed to save attachment. Please try again.',
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}
</script>

{#if payload}
	<div class="flex h-full min-h-0 flex-col">
		<div class="flex shrink-0 items-center justify-between border-b border-base-300 px-4 py-2">
			<h2 class="text-lg font-semibold">
				Attachments{#if payload.patientName}&nbsp;– {payload.patientName}{/if}
			</h2>
			<DaisyUiButton
				type="button"
				className="d-btn-ghost d-btn-sm d-btn-circle"
				onClick={cancel}
				aria-label="Close"
			>
				<LucideX className="size-5" />
			</DaisyUiButton>
		</div>
		<div class="flex-1 min-h-0 overflow-y-auto p-4">
			<form onsubmit={handleOnSubmit} class="max-w-2xl">
				<div class="flex flex-col gap-4">
					<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
						<DaisyUiLabel className="shrink-0 sm:w-36">Patient</DaisyUiLabel>
						<div class="max-w-80 flex-1">
							<p class="truncate text-sm font-medium">
								{payload.patientName || payload.patientId}
							</p>
						</div>
					</div>

					<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
						<DaisyUiLabel forText="attachment-file" className="shrink-0 sm:w-36"
							>File attachment</DaisyUiLabel
						>
						<div class="max-w-80 flex-1">
							<input
								id="attachment-file"
								type="file"
								class="file-input file-input-bordered w-full max-w-xs"
								bind:this={attachmentInputEl}
								onchange={handleFileChange}
							/>
							{#if attachmentFile}
								<span class="mt-1 block text-xs opacity-80">
									Selected: {attachmentFile.name}
								</span>
							{/if}
						</div>
					</div>

					<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
						<DaisyUiLabel
							forText="attachment-description"
							className="shrink-0 sm:w-36 pt-1"
							>Description</DaisyUiLabel
						>
						<div class="max-w-80 flex-1">
							<DaisyUiTextarea
								id="attachment-description"
								bind:value={description}
								placeholder="Optional description"
								className="w-full min-h-24 resize-y"
							/>
						</div>
					</div>
				</div>

				<div class="mt-6">
					<DaisyUiButton
						type="submit"
						className="d-btn-primary d-btn-wide"
						disabled={isSubmitting}
					>
						{isSubmitting ? 'Saving...' : 'Save'}
					</DaisyUiButton>
				</div>
			</form>
		</div>
	</div>
{/if}
