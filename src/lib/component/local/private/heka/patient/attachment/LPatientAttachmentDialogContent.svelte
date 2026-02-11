<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { PatientAttachmentDialogState } from '$lib/state/patient-attachment.dialog.state.svelte';
	import DaisyUiAlert from '$lib/component/library/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiBadge from '$lib/component/library/daisyui/badge/DaisyUiBadge.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiDivider from '$lib/component/library/daisyui/divider/DaisyUiDivider.svelte';
	import DaisyUiFileInput from '$lib/component/library/daisyui/fileinput/DaisyUiFileInput.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiList from '$lib/component/library/daisyui/list/DaisyUiList.svelte';
	import DaisyUiListRow from '$lib/component/library/daisyui/list/row/DaisyUiListRow.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiTextarea from '$lib/component/library/daisyui/textarea/DaisyUiTextarea.svelte';
	import LucideX from '$lib/component/library/lucide/LucideX.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import {
		createPatientAttachment,
		getPatientAttachmentByPatientId,
		deletePatientAttachmentComplete
	} from '$lib/remote/table/information-table/patient-attachment.remote';
	import type { PatientAttachmentSchema } from '$lib/server/db/schema-type';
	import { getPatientAttachmentDisplayUrl } from '$lib/util/staff-photo.util';
	import LucideEye from '$lib/component/library/lucide/LucideEye.svelte';

	/** Allowed MIME types for patient attachments (must match API). */
	const ACCEPT_ATTACHMENT_TYPES =
		'image/jpeg,image/png,image/webp,image/gif,application/pdf';

	const ALLOWED_ATTACHMENT_MIMES = [
		'image/jpeg',
		'image/png',
		'image/webp',
		'image/gif',
		'application/pdf'
	];

	/** Max file size in bytes (10MB, must match API). */
	const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
	const MAX_ATTACHMENT_SIZE_LABEL = '10MB';

	let { cancel }: DialogSlotProps = $props();

	const payload = $derived(PatientAttachmentDialogState.pending);
	const stagedAttachments = $derived(PatientAttachmentDialogState.stagedAttachments);
	const viewOnly = $derived(PatientAttachmentDialogState.viewOnly);
	const isStaging = $derived(
		payload !== null && 'mode' in payload && payload.mode === 'staging'
	);
	const isExistingPatient = $derived(
		payload !== null && 'patientId' in payload
	);

	const toastService = new ToastService();

	let attachmentFiles: File[] = $state([]);
	let attachmentInputEl: HTMLInputElement | undefined = $state();
	let description = $state('');
	let isSubmitting = $state(false);
	let existingAttachments: PatientAttachmentSchema[] = $state([]);
	let isLoadingExisting = $state(false);
	let deletingId: number | null = $state(null);

	function handleFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const fileList = input.files;
		if (!fileList) {
			attachmentFiles = [];
			return;
		}
		const all = Array.from(fileList);
		const byType = all.filter((f) =>
			f.type && ALLOWED_ATTACHMENT_MIMES.includes(f.type.toLowerCase())
		);
		const typeRejected = all.length - byType.length;
		const allowed = byType.filter((f) => f.size <= MAX_ATTACHMENT_SIZE_BYTES);
		const sizeRejected = byType.length - allowed.length;
		if (typeRejected > 0) {
			toastService.addToast(
				`${typeRejected} file(s) removed. Only JPEG, PNG, WebP, GIF and PDF are allowed.`,
				StatusColorEnum.WARNING
			);
		}
		if (sizeRejected > 0) {
			toastService.addToast(
				`${sizeRejected} file(s) removed. Maximum size per file is ${MAX_ATTACHMENT_SIZE_LABEL}.`,
				StatusColorEnum.WARNING
			);
		}
		attachmentFiles = allowed;
		if (typeRejected > 0 || sizeRejected > 0) {
			input.value = '';
		}
	}

	async function loadExisting(patientId: string) {
		isLoadingExisting = true;
		try {
			existingAttachments = await getPatientAttachmentByPatientId({ patientId });
		} finally {
			isLoadingExisting = false;
		}
	}

	$effect(() => {
		if (isExistingPatient && payload && 'patientId' in payload) {
			loadExisting(payload.patientId);
		}
	});

	function addStaged() {
		if (attachmentFiles.length === 0) {
			toastService.addToast('Please choose one or more files to add.', StatusColorEnum.ERROR);
			return;
		}
		const desc = description.trim();
		const next = [
			...PatientAttachmentDialogState.stagedAttachments,
			...attachmentFiles.map((file) => ({ file, description: desc }))
		];
		PatientAttachmentDialogState.stagedAttachments = next;
		toastService.addToast(
			`Added ${attachmentFiles.length} file(s). They will be saved when you register the patient.`,
			StatusColorEnum.SUCCESS
		);
		attachmentFiles = [];
		description = '';
		if (attachmentInputEl) attachmentInputEl.value = '';
	}

	function removeStaged(index: number) {
		PatientAttachmentDialogState.stagedAttachments =
			PatientAttachmentDialogState.stagedAttachments.filter((_, i) => i !== index);
	}

	async function handleOnSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!payload || !('patientId' in payload)) return;
		if (attachmentFiles.length === 0) {
			toastService.addToast('Please choose one or more files to upload.', StatusColorEnum.ERROR);
			return;
		}

		isSubmitting = true;
		const patientId = payload.patientId;
		const desc = description.trim() || undefined;
		const created: PatientAttachmentSchema[] = [];
		try {
			for (const file of attachmentFiles) {
				const fd = new FormData();
				fd.set('file', file);
				const res = await fetch('/api/upload/patient-attachment', {
					method: 'POST',
					body: fd
				});
				const data = await res.json().catch(() => ({}));
				if (!res.ok || !data.url) {
					toastService.addToast(
						data.error ?? `Upload failed for ${file.name}.`,
						StatusColorEnum.ERROR
					);
					continue;
				}
				const row = await createPatientAttachment({
					patientId,
					fileUrl: data.url,
					description: desc
				});
				created.push(row);
			}
			if (created.length > 0) {
				existingAttachments = [...existingAttachments, ...created];
				toastService.addToast(
					created.length === attachmentFiles.length
						? `${created.length} attachment(s) saved successfully.`
						: `${created.length} of ${attachmentFiles.length} attachment(s) saved.`,
					StatusColorEnum.SUCCESS
				);
				attachmentFiles = [];
				description = '';
				if (attachmentInputEl) attachmentInputEl.value = '';
			}
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
				message ?? 'Failed to save attachment(s). Please try again.',
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}

	async function removeExisting(att: PatientAttachmentSchema) {
		deletingId = att.id;
		try {
			await deletePatientAttachmentComplete({ id: att.id });
			existingAttachments = existingAttachments.filter((a) => a.id !== att.id);
			toastService.addToast('Attachment removed.', StatusColorEnum.SUCCESS);
		} catch {
			toastService.addToast('Failed to remove attachment.', StatusColorEnum.ERROR);
		} finally {
			deletingId = null;
		}
	}

	function handleStagingSubmit(e: SubmitEvent) {
		e.preventDefault();
		addStaged();
	}

	function fileNameFromUrl(url: string | null): string {
		if (!url) return 'File';
		try {
			const p = new URL(url, 'http://_').pathname;
			return p.split('/').pop() ?? 'File';
		} catch {
			return 'File';
		}
	}
</script>

{#if payload}
	<div class="flex h-full min-h-0 flex-col">
		<div class="flex shrink-0 items-center justify-between border-b border-base-300 px-4 py-2 bg-base-200/50">
			<DaisyUiCardBodyTitle className="text-lg m-0">
				{#if isStaging}
					Attachments – New patient
				{:else if isExistingPatient}
					Attachments – {payload.patientName ?? payload.patientId}
				{:else}
					Attachments
				{/if}
			</DaisyUiCardBodyTitle>
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
			{#if isStaging}
				{#if viewOnly}
					<DaisyUiAlert
						type={StatusColorEnum.INFO}
						message="View only – no attachments to manage for new patient."
						className="mb-4"
					/>
				{:else}
					<DaisyUiAlert
						type={StatusColorEnum.INFO}
						message="Add one or more files below. They will be saved when you complete patient registration."
						className="mb-4"
					/>
					{#if stagedAttachments.length > 0}
						<DaisyUiCard className="mb-4 shadow-sm">
							<DaisyUiCardBody className="p-4">
								<div class="flex items-center gap-2 mb-3">
									<DaisyUiCardBodyTitle className="text-base m-0">Staged</DaisyUiCardBodyTitle>
									<DaisyUiBadge className="d-badge-sm d-badge-primary">
										{stagedAttachments.length}
									</DaisyUiBadge>
								</div>
								<DaisyUiList className="gap-1">
									{#each stagedAttachments as item, i}
										<DaisyUiListRow className="flex items-center justify-between gap-2">
											<span class="min-w-0 truncate text-sm" title={item.file.name}>
												{item.file.name}
												{#if item.description}
													<span class="text-base-content/70"> – {item.description}</span>
												{/if}
											</span>
											<DaisyUiButton
												type="button"
												className="d-btn-ghost d-btn-xs d-btn-circle"
												onClick={() => removeStaged(i)}
												aria-label="Remove"
											>
												<LucideX className="size-4" />
											</DaisyUiButton>
										</DaisyUiListRow>
									{/each}
								</DaisyUiList>
							</DaisyUiCardBody>
						</DaisyUiCard>
					{/if}
					<DaisyUiDivider position="horizontal" className="my-4 text-xs">
						Add files
					</DaisyUiDivider>
					<DaisyUiCard className="max-w-2xl shadow-sm">
						<DaisyUiCardBody className="p-4">
							<form onsubmit={handleStagingSubmit} class="flex flex-col gap-4">
								<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
									<DaisyUiLabel forText="attachment-files" className="shrink-0 sm:w-36">
										File(s)
										<span class="text-base-content/60 font-normal"> (JPEG, PNG, WebP, GIF, PDF, max {MAX_ATTACHMENT_SIZE_LABEL})</span>
									</DaisyUiLabel>
									<div class="max-w-80 flex-1">
										<DaisyUiFileInput
											id="attachment-files"
											className="file-input file-input-bordered w-full max-w-xs"
											accept={ACCEPT_ATTACHMENT_TYPES}
											multiple
											bind:inputEl={attachmentInputEl}
											onchange={handleFileChange}
										/>
										{#if attachmentFiles.length > 0}
											<DaisyUiBadge className="d-badge-sm d-badge-outline mt-1">
												Selected: {attachmentFiles.length} file(s)
											</DaisyUiBadge>
										{/if}
									</div>
								</div>
								<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
									<DaisyUiLabel
										forText="attachment-description"
										className="shrink-0 sm:w-36 pt-1"
										>Description (optional, for all)</DaisyUiLabel
									>
									<div class="max-w-80 flex-1">
										<DaisyUiTextarea
											id="attachment-description"
											bind:value={description}
											placeholder="Optional description for all selected files"
											className="w-full min-h-24 resize-y"
										/>
									</div>
								</div>
								<div class="mt-2">
									<DaisyUiButton type="submit" className="d-btn-primary d-btn-wide">
										Add to list
									</DaisyUiButton>
								</div>
							</form>
						</DaisyUiCardBody>
					</DaisyUiCard>
				{/if}
			{:else if isExistingPatient}
				{#if isLoadingExisting}
					<div class="flex items-center gap-3 py-6">
						<DaisyUiLoading className="d-loading-md text-primary" />
						<span class="text-sm text-base-content/80">Loading attachments…</span>
					</div>
				{:else if existingAttachments.length === 0 && viewOnly}
					<DaisyUiAlert
						type={StatusColorEnum.INFO}
						message="No attachments."
						className="mb-4"
					/>
				{:else if existingAttachments.length > 0}
					<DaisyUiCard className="mb-4 shadow-sm">
						<DaisyUiCardBody className="p-4">
							<div class="flex items-center gap-2 mb-3">
								<DaisyUiCardBodyTitle className="text-base m-0">Existing</DaisyUiCardBodyTitle>
								<DaisyUiBadge className="d-badge-sm d-badge-neutral">
									{existingAttachments.length}
								</DaisyUiBadge>
							</div>
							<DaisyUiList className="gap-1">
								{#each existingAttachments as att (att.id)}
									<DaisyUiListRow className="flex items-center justify-between gap-2">
										<span class="min-w-0 flex-1 truncate text-sm" title={att.fileUrl ?? ''}>
											{fileNameFromUrl(att.fileUrl)}
											{#if att.description}
												<span class="text-base-content/70"> – {att.description}</span>
											{/if}
										</span>
										<div class="flex shrink-0 items-center gap-1">
											{#if att.fileUrl}
												<a
													href={getPatientAttachmentDisplayUrl(att.fileUrl) ?? att.fileUrl}
													target="_blank"
													rel="noopener noreferrer"
													class="d-btn d-btn-ghost d-btn-xs d-btn-circle"
													title="View file"
													aria-label="View file"
												>
													<LucideEye className="size-4" />
												</a>
											{/if}
											{#if !viewOnly}
												<DaisyUiButton
													type="button"
													className="d-btn-ghost d-btn-xs d-btn-circle"
													onClick={() => removeExisting(att)}
													disabled={deletingId === att.id}
													aria-label="Remove"
												>
													<LucideX className="size-4" />
												</DaisyUiButton>
											{/if}
										</div>
									</DaisyUiListRow>
								{/each}
							</DaisyUiList>
						</DaisyUiCardBody>
					</DaisyUiCard>
				{/if}
				{#if !viewOnly}
					<DaisyUiDivider position="horizontal" className="my-4 text-xs">
						Upload new
					</DaisyUiDivider>
					<DaisyUiCard className="max-w-2xl shadow-sm">
						<DaisyUiCardBody className="p-4">
							<form onsubmit={handleOnSubmit} class="flex flex-col gap-4">
								<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
									<DaisyUiLabel className="shrink-0 sm:w-36">Patient</DaisyUiLabel>
									<div class="max-w-80 flex-1">
										<p class="truncate text-sm font-medium">
											{payload.patientName || payload.patientId}
										</p>
									</div>
								</div>
								<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
									<DaisyUiLabel forText="attachment-files-existing" className="shrink-0 sm:w-36">
										File(s)
										<span class="text-base-content/60 font-normal"> (JPEG, PNG, WebP, GIF, PDF, max {MAX_ATTACHMENT_SIZE_LABEL})</span>
									</DaisyUiLabel>
									<div class="max-w-80 flex-1">
										<DaisyUiFileInput
											id="attachment-files-existing"
											className="file-input file-input-bordered w-full max-w-xs"
											accept={ACCEPT_ATTACHMENT_TYPES}
											multiple
											bind:inputEl={attachmentInputEl}
											onchange={handleFileChange}
										/>
										{#if attachmentFiles.length > 0}
											<DaisyUiBadge className="d-badge-sm d-badge-outline mt-1">
												Selected: {attachmentFiles.length} file(s)
											</DaisyUiBadge>
										{/if}
									</div>
								</div>
								<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
									<DaisyUiLabel
										forText="attachment-description-existing"
										className="shrink-0 sm:w-36 pt-1"
										>Description (optional, for all)</DaisyUiLabel
									>
									<div class="max-w-80 flex-1">
										<DaisyUiTextarea
											id="attachment-description-existing"
											bind:value={description}
											placeholder="Optional description for all selected files"
											className="w-full min-h-24 resize-y"
										/>
									</div>
								</div>
								<div class="mt-2">
									<DaisyUiButton
										type="submit"
										className="d-btn-primary d-btn-wide"
										disabled={isSubmitting || attachmentFiles.length === 0}
									>
										{#if isSubmitting}
											<DaisyUiLoading className="d-loading-sm mr-2" />
										{/if}
										{isSubmitting ? 'Uploading...' : 'Add attachment(s)'}
									</DaisyUiButton>
								</div>
							</form>
						</DaisyUiCardBody>
					</DaisyUiCard>
				{/if}
			{/if}
		</div>
	</div>
{/if}
