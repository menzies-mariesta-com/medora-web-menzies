<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { PatientAttachmentDialogState } from '$lib/state/patient-attachment.dialog.state.svelte';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashDivider from '$lib/component/wash/divider/WashDivider.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashFileInput from '$lib/component/wash/fileinput/WashFileInput.svelte';
	import WashList from '$lib/component/wash/list/WashList.svelte';
	import WashListRow from '$lib/component/wash/list/row/WashListRow.svelte';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { PatientAttachmentListRow } from '$lib/model/type/medora/ui-rows.type';
	import { getPatientAttachmentDisplayUrl } from '$lib/util/staff-photo.util';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { browser } from '$app/environment';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';

	const dateTimeUtil = new DateTimeUtil();
	function formatAttachmentDateTime(
		value: string | Date | null | undefined
	): string {
		if (value == null) return '';
		const date =
			typeof value === 'string'
				? dateTimeUtil.parseDate(value)
				: value;
		return date
			? dateTimeUtil.formatDateTime(date, 'en-US', {
					dateStyle: 'short',
					timeStyle: 'short'
				})
			: '';
	}

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

	type PatientAttachmentDialogProps = DialogSlotProps & {
		/** When true, renders without dialog chrome (no close button). */
		embedded?: boolean;
	};

	let { cancel, embedded = false }: PatientAttachmentDialogProps =
		$props();

	const payload = $derived(PatientAttachmentDialogState.pending);
	const stagedAttachments = $derived(
		PatientAttachmentDialogState.stagedAttachments
	);
	const viewOnly = $derived(PatientAttachmentDialogState.viewOnly);
	const isStaging = $derived(
		payload !== null &&
			'mode' in payload &&
			payload.mode === 'staging'
	);
	const isExistingPatient = $derived(
		payload !== null && 'patientId' in payload
	);

	const toastService = new ToastService();

	let attachmentFiles: File[] = $state([]);
	let attachmentInputEl: HTMLInputElement | undefined = $state();
	let description = $state('');
	let isAddingToList = $state(false);
	let isSubmitting = $state(false);
	let existingAttachments: PatientAttachmentListRow[] = $state([]);
	let isLoadingExisting = $state(false);
	let deletingId: number | null = $state(null);
	let patientLabel: string = $state('');
	let isLoadingPatient = $state(false);

	function apiBase(): string {
		return payload && 'hospitalId' in payload && payload.hospitalId
			? `/api/medora/hospital/${payload.hospitalId}/home/nursing-workbench/emr/patient-attachment`
			: '';
	}

	async function apiGet<T>(url: string): Promise<T> {
		const res = await fetch(url);
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(text || res.statusText);
		}
		return (await res.json()) as T;
	}

	function handleFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const fileList = input.files;
		if (!fileList) {
			attachmentFiles = [];
			return;
		}
		const all = Array.from(fileList);
		const byType = all.filter(
			(f) =>
				f.type &&
				ALLOWED_ATTACHMENT_MIMES.includes(f.type.toLowerCase())
		);
		const typeRejected = all.length - byType.length;
		const allowed = byType.filter(
			(f) => f.size <= MAX_ATTACHMENT_SIZE_BYTES
		);
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
			const base = apiBase();
			if (!base) {
				existingAttachments = [];
				return;
			}
			const res = await apiGet<{ data: PatientAttachmentListRow[] }>(
				`${base}?patientId=${encodeURIComponent(patientId)}`
			);
			existingAttachments = res.data ?? [];
		} finally {
			isLoadingExisting = false;
		}
	}

	async function loadPatientLabel(patientId: string) {
		isLoadingPatient = true;
		try {
			const base = apiBase();
			if (!base) {
				patientLabel = patientId;
				return;
			}
			const res = await apiGet<{ data: { label: string } | null }>(
				`${base}?action=patientLabel&patientId=${encodeURIComponent(patientId)}`
			);
			patientLabel = res.data?.label ?? patientId;
		} finally {
			isLoadingPatient = false;
		}
	}

	$effect(() => {
		if (
			isExistingPatient &&
			payload &&
			'patientId' in payload &&
			'hospitalId' in payload
		) {
			loadExisting(payload.patientId);
			loadPatientLabel(payload.patientId);
		} else {
			patientLabel = '';
		}
		console.log(payload);
	});

	function addStaged() {
		if (attachmentFiles.length === 0) {
			toastService.addToast(
				'Please choose one or more files to add.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const desc = description.trim();
		const next = [
			...PatientAttachmentDialogState.stagedAttachments,
			...attachmentFiles.map((file) => ({ file, description: desc }))
		];
		PatientAttachmentDialogState.stagedAttachments = next;
		toastService.addToast(
			`Added ${attachmentFiles.length} file(s).`,
			StatusColorEnum.SUCCESS
		);
		attachmentFiles = [];
		description = '';
		if (attachmentInputEl) attachmentInputEl.value = '';
	}

	function removeStaged(index: number) {
		PatientAttachmentDialogState.stagedAttachments =
			PatientAttachmentDialogState.stagedAttachments.filter(
				(_, i) => i !== index
			);
	}

	async function handleOnSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!browser) return;
		if (
			!payload ||
			!('patientId' in payload) ||
			!('hospitalId' in payload)
		)
			return;
		const base = apiBase();
		if (!base) return;
		if (attachmentFiles.length === 0) {
			toastService.addToast(
				'Please choose one or more files to upload.',
				StatusColorEnum.ERROR
			);
			return;
		}

		isSubmitting = true;
		const patientId = payload.patientId;
		const desc = description.trim() || undefined;
		const created: PatientAttachmentListRow[] = [];
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
				const createRes = await fetch(base, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						patientId,
						fileUrl: data.url,
						description: desc
					})
				});
				const createData = await createRes
					.json()
					.catch(() => ({}) as any);
				if (!createRes.ok || !createData?.data) {
					toastService.addToast(
						createData?.error ?? `Save failed for ${file.name}.`,
						StatusColorEnum.ERROR
					);
					continue;
				}
				created.push(createData.data as PatientAttachmentListRow);
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
				const err = error as {
					message?: string;
					body?: { message?: string };
				};
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

	async function removeExisting(att: PatientAttachmentListRow) {
		deletingId = att.id;
		try {
			const base = apiBase();
			if (!base) throw new Error('Missing hospital context');
			const res = await fetch(`${base}?id=${att.id}`, {
				method: 'DELETE'
			});
			if (!res.ok)
				throw new Error(await res.text().catch(() => res.statusText));
			existingAttachments = existingAttachments.filter(
				(a) => a.id !== att.id
			);
			toastService.addToast(
				'Attachment removed.',
				StatusColorEnum.SUCCESS
			);
		} catch {
			toastService.addToast(
				'Failed to remove attachment.',
				StatusColorEnum.ERROR
			);
		} finally {
			deletingId = null;
		}
	}

	async function handleStagingSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isAddingToList) return;
		isAddingToList = true;
		try {
			addStaged();
			await new Promise((r) => setTimeout(r, 0));
		} finally {
			isAddingToList = false;
		}
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
		{#if embedded}
			<div
				class="flex shrink-0 items-center justify-between border-b border-base-300 bg-base-200/50 px-4 py-2"
			>
				<WashCardBodyTitle className="text-lg m-0">
					{#if isStaging}
						Attachments – New patient
					{:else if isExistingPatient}
						Attachments – {patientLabel || 'Patient'}
					{:else}
						Attachments
					{/if}
				</WashCardBodyTitle>
			</div>
		{:else}
			<p class="shrink-0 px-4 pt-2 text-sm text-ink-muted">
				{#if isStaging}
					New patient — files save when registration completes.
				{:else if isExistingPatient}
					{patientLabel || 'Patient'}
				{/if}
			</p>
		{/if}
		<div class="min-h-0 flex-1 overflow-y-auto p-4">
			{#if isStaging}
				{#if viewOnly}
					<WashAlert
						type={StatusColorEnum.INFO}
						message="View only – no attachments to manage for new patient."
						className="mb-4"
					/>
				{:else}
					<WashAlert
						type={StatusColorEnum.INFO}
						message="Add one or more files below. They will be saved when you complete patient registration."
						className="mb-4"
					/>

					<WashDivider className="my-4 text-xs">Add Files</WashDivider>
					<WashCard className="w-full shadow-sm">
						<WashCardBody className="p-4 w-full">
							<form
								onsubmit={handleStagingSubmit}
								class="flex flex-1 flex-col gap-4"
							>
								<div
									class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
								>
									<label for="attachment-files" class="shrink-0 sm:w-1/3">
										File(s)
										<span class="font-normal text-base-content/60">
											(JPEG, PNG, WebP, GIF, PDF, max {MAX_ATTACHMENT_SIZE_LABEL})</span
										>
									</label>
									<div class="w-full sm:w-2/3">
										<WashFileInput
											id="attachment-files"
											className="file-input file-input-bordered w-full"
											accept={ACCEPT_ATTACHMENT_TYPES}
											multiple
											bind:inputEl={attachmentInputEl}
											onchange={handleFileChange}
										/>
										{#if attachmentFiles.length > 0}
											<div class="badge badge-sm badge-outline mt-1">
												Selected: {attachmentFiles.length} file(s)
											</div>
										{/if}
									</div>
								</div>
								<div
									class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
								>
									<label for="attachment-description" class="shrink-0 sm:w-1/3 pt-1">Description (optional, for all)</label>
									<div class="w-full sm:w-2/3">
										<WashTextarea
											id="attachment-description"
											bind:value={description}
											placeholder="Optional description for all selected files"
											className="w-full min-h-24 resize-y"
										/>
									</div>
								</div>
								<div class="mt-2 flex flex-row justify-end">
									<WashButton
										type="submit"
										className="btn-primary btn-wide"
										loading={isAddingToList}
									>
										Add to List
									</WashButton>
								</div>
							</form>
						</WashCardBody>
					</WashCard>
					{#if stagedAttachments.length > 0}
						<WashDivider className="my-4 text-xs">Listed Files</WashDivider>
						<WashCard className="mb-4 shadow-sm">
							<WashCardBody className="p-4">
								<div class="mb-3 flex items-center gap-2">
									<WashCardBodyTitle className="text-base m-0"
										>Staged</WashCardBodyTitle
									>
									<div class="badge badge-sm badge-primary">
										{stagedAttachments.length}
									</div>
								</div>
								<WashList className="gap-1">
									{#each stagedAttachments as item, i (i)}
										<WashListRow
											className="flex items-center justify-between gap-2"
										>
											<span
												class="min-w-0 truncate text-sm"
												title={item.file.name}
											>
												{item.file.name}
												{#if item.description}
													<span class="text-base-content/70">
														– {item.description}</span
													>
												{/if}
											</span>
											<WashButton
												type="button"
												className="btn-ghost btn-xs btn-circle"
												onClick={() => removeStaged(i)}
											>
												<LucideX className="size-4" />
											</WashButton>
										</WashListRow>
									{/each}
								</WashList>
							</WashCardBody>
						</WashCard>
					{/if}
				{/if}
			{:else if isExistingPatient}
				{#if !viewOnly}
					<WashCard className="w-full shadow-sm">
						<WashCardBody className="p-4">
							<form
								onsubmit={handleOnSubmit}
								class="flex flex-col gap-4"
							>
								<div
									class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
								>
									<label class="shrink-0 sm:w-36">Patient</label>
									<div class="flex-1">
										<p class="truncate text-sm font-medium">
											{patientLabel || 'Patient'}
										</p>
									</div>
								</div>
								<div
									class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
								>
									<label for="attachment-files-existing" class="shrink-0 sm:w-36">
										File(s)
										<span class="font-normal text-base-content/60">
											(JPEG, PNG, WebP, GIF, PDF, max {MAX_ATTACHMENT_SIZE_LABEL})</span
										>
									</label>
									<div class="flex-1">
										<WashFileInput
											id="attachment-files-existing"
											className="file-input file-input-bordered w-full"
											accept={ACCEPT_ATTACHMENT_TYPES}
											multiple
											bind:inputEl={attachmentInputEl}
											onchange={handleFileChange}
										/>
										{#if attachmentFiles.length > 0}
											<div class="badge badge-sm badge-outline mt-1">
												Selected: {attachmentFiles.length} file(s)
											</div>
										{/if}
									</div>
								</div>
								<div
									class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
								>
									<label for="attachment-description-existing" class="shrink-0 sm:w-36 pt-1">Description (optional, for all)</label>
									<div class="flex-1">
										<WashTextarea
											id="attachment-description-existing"
											bind:value={description}
											placeholder="Optional description for all selected files"
											className="w-full min-h-24 resize-y"
										/>
									</div>
								</div>
								<div class="mt-2">
									<WashButton
										type="submit"
										className="btn-primary btn-wide"
										loading={isSubmitting}
										disabled={attachmentFiles.length === 0}
										loadingText="Uploading..."
									>
										Add attachment(s)
									</WashButton>
								</div>
							</form>
						</WashCardBody>
					</WashCard>
				{/if}
				{#if isLoadingExisting}
					<div class="flex items-center gap-3 py-6">
						<span class="loading loading-spinner loading-md text-primary"></span>
						<span class="text-sm text-base-content/80"
							>Loading attachments…</span
						>
					</div>
				{:else if existingAttachments.length === 0 && viewOnly}
					<WashAlert
						type={StatusColorEnum.INFO}
						message="No attachments."
						className="mb-4"
					/>
				{:else if existingAttachments.length > 0}
					<WashDivider className="my-4 text-xs">Existing Lists</WashDivider>
					<WashCard className="mb-4 shadow-sm">
						<WashCardBody className="p-4">
							<div class="mb-3 flex items-center gap-2">
								<WashCardBodyTitle className="text-base m-0"
									>Existing</WashCardBodyTitle
								>
								<div class="badge badge-sm badge-neutral">
									{existingAttachments.length}
								</div>
							</div>
							<WashList className="gap-1">
								{#each existingAttachments as att (att.id)}
									<WashListRow
										className="flex items-center justify-between gap-2"
									>
										<span
											class="min-w-0 flex-1 truncate text-sm"
											title={att.fileUrl ?? ''}
										>
											{fileNameFromUrl(att.fileUrl)}
											{#if att.description}
												<span class="text-base-content/70">
													– {att.description}</span
												>
											{/if}
											{#if att.createdAt}
												<span class="text-base-content/70">
													– {formatAttachmentDateTime(
														att.createdAt
													)}</span
												>
											{/if}
										</span>
										<div class="flex shrink-0 items-center gap-1">
											{#if att.fileUrl}
												{@const rawHref =
													getPatientAttachmentDisplayUrl(
														att.fileUrl
													) ?? att.fileUrl}
												<a
													href={rawHref}
													target="_blank"
													rel="noopener noreferrer"
													class="btn btn-circle btn-ghost btn-xs"
													title="View file"
													aria-label="View file"
												>
													<LucideEye className="size-4" />
												</a>
											{/if}
											{#if !viewOnly}
												<WashButton
													type="button"
													className="btn-ghost btn-xs btn-circle"
													onClick={() => removeExisting(att)}
													disabled={deletingId === att.id}
												>
													<LucideX className="size-4" />
												</WashButton>
											{/if}
										</div>
									</WashListRow>
								{/each}
							</WashList>
						</WashCardBody>
					</WashCard>
				{/if}
			{/if}
		</div>
		{#if !embedded}
			<div class="modal-action shrink-0 border-t border-base-300 px-4 py-3">
				<WashButton variant="ghost" onClick={cancel}>Close</WashButton>
			</div>
		{/if}
	</div>
{/if}
