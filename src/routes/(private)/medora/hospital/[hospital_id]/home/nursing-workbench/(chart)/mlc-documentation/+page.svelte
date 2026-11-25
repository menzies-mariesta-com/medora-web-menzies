<script lang="ts">
	import { page } from '$app/state';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import ClinicalFormRenderer from '$lib/component/own/local/private/medora/clinical-form/ClinicalFormRenderer.svelte';
	import type { ClinicalFormTemplateSchema } from '$lib/model/type/medora/clinical-form.type';
	import {
		MLC_AMENDED_STATUS_TAGGING_ID,
		MLC_SIGNED_STATUS_TAGGING_ID,
		type MlcCaseRow
	} from '$lib/model/type/medora/mlc-documentation.type';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { PageActionEnum } from '$lib/model/enum/page-action.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { parseUuid } from '$lib/util/id.util';
	import { formatMenziesTableDateTime } from '$lib/util/menzies-table-datetime.util';
	import { buildMlcPrintHtml } from '$lib/util/clinical-form-print.util.svelte';
	import { printHtmlInIframe } from '$lib/util/document-master-print.util.svelte';
	import {
		htmlStringToPdfBlob,
		uploadPatientAttachmentPdf
	} from '$lib/util/html-to-pdf.util';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';
	import { printByFromPage } from '$lib/tool/emr/document-master-client-print.util';
	import { can } from '$lib/state/page-permission.state.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();
	const toastService = new ToastService();
	const printLock = createActionLock();

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(
		parseUuid(page.url.searchParams.get('visitId') ?? '') ?? ''
	);
	const printByName = $derived(printByFromPage(page));
	const mlcApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/mlc-documentation`
			: ''
	);

	const SIGNED_STATUS = MLC_SIGNED_STATUS_TAGGING_ID;
	const AMENDED_STATUS = MLC_AMENDED_STATUS_TAGGING_ID;

	let loading = $state(true);
	let loadError = $state(false);
	/** Template for a new draft. */
	let schema = $state<ClinicalFormTemplateSchema | null>(null);
	/** Template the opened record was actually filled against. */
	let openSchema = $state<ClinicalFormTemplateSchema | null>(null);
	let cases = $state<MlcCaseRow[]>([]);
	let encounterIsMlc = $state(false);
	let staffName = $state<string | null>(null);

	/** Draft being written, or the signed record being viewed. */
	let editingId = $state<number | null>(null);
	let values = $state<Record<string, unknown>>({});
	let addendumParentId = $state<number | null>(null);
	let addendumReason = $state('');

	let submitting = $state(false);
	let printing = $state(false);

	const signedCase = $derived(
		editingId != null
			? (cases.find((c) => c.id === editingId) ?? null)
			: null
	);
	const isSignedView = $derived(
		signedCase != null &&
			(signedCase.statusTaggingId === SIGNED_STATUS ||
				signedCase.statusTaggingId === AMENDED_STATUS)
	);
	const readOnly = $derived(
		isSignedView || !can(PageActionEnum.EDIT)
	);
	const canWrite = $derived(
		can(PageActionEnum.CREATE) && !isSignedView
	);
	const addendumParent = $derived(
		addendumParentId != null
			? (cases.find((c) => c.id === addendumParentId) ?? null)
			: null
	);

	/** A legacy record must render with the fields it was filled against. */
	const activeSchema = $derived(signedCase?.schemaJson ?? openSchema ?? schema);

	const orderedCases = $derived.by(() => {
		// Addenda render under the record they amend, newest parent first.
		const roots = cases.filter((c) => c.parentInstanceId == null);
		const byParent = new Map<number, MlcCaseRow[]>();
		for (const c of cases) {
			if (c.parentInstanceId == null) continue;
			const list = byParent.get(c.parentInstanceId) ?? [];
			list.push(c);
			byParent.set(c.parentInstanceId, list);
		}
		return roots.map((root) => ({
			root,
			addenda: (byParent.get(root.id) ?? []).sort((a, b) =>
				a.createdAt.localeCompare(b.createdAt)
			)
		}));
	});

	function statusLabel(row: MlcCaseRow): string {
		if (row.parentInstanceId != null) {
			return msg.mlc_status_addendum?.() ?? 'Addendum';
		}
		if (row.statusTaggingId === SIGNED_STATUS) {
			return msg.mlc_status_signed?.() ?? 'Signed';
		}
		return msg.mlc_status_draft?.() ?? 'Draft';
	}

	function statusBadgeClass(row: MlcCaseRow): string {
		if (row.statusTaggingId === SIGNED_STATUS) return 'badge-success';
		if (row.parentInstanceId != null) return 'badge-info';
		return 'badge-warning';
	}

	function caseLabel(row: MlcCaseRow): string {
		const number = row.formNumber?.trim();
		if (number) return number;
		return row.parentInstanceId != null
			? (msg.mlc_status_addendum?.() ?? 'Addendum')
			: `#${row.id}`;
	}

	async function load(signal?: AbortSignal) {
		if (!mlcApi || !visitId) return;
		loadError = false;
		loading = true;
		try {
			const res = await fetch(
				`${mlcApi}?mode=bootstrap&visitId=${encodeURIComponent(visitId)}`,
				{ credentials: 'include', signal }
			);
			if (!res.ok) await throwUserFacingHttpError(res);
			const data = (await res.json()) as {
				schemaJson: ClinicalFormTemplateSchema | null;
				cases: MlcCaseRow[];
				encounterIsMlc: boolean;
				staffName: string | null;
			};
			schema = data.schemaJson;
			cases = data.cases ?? [];
			encounterIsMlc = Boolean(data.encounterIsMlc);
			staffName = data.staffName;

			// Keep the record in view if it still exists after a reload.
			const current =
				editingId != null
					? (cases.find((c) => c.id === editingId) ?? null)
					: null;
			if (current) {
				openSchema = current.schemaJson ?? null;
				values = { ...(current.valuesJson ?? {}) };
			} else if (editingId != null) {
				startNewDraft();
			}
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError')
				return;
			loadError = true;
			toastService.addErrorToast(
				msg.mlc_load_failed?.() ??
					'Failed to load MLC documentation.',
				e
			);
		} finally {
			loading = false;
		}
	}

	function startNewDraft() {
		editingId = null;
		openSchema = null;
		values = {};
		addendumParentId = null;
		addendumReason = '';
	}

	function openCase(row: MlcCaseRow) {
		editingId = row.id;
		openSchema = row.schemaJson ?? null;
		addendumParentId = null;
		addendumReason = '';
		values = { ...(row.valuesJson ?? {}) };
	}

	function startAddendum(row: MlcCaseRow) {
		editingId = null;
		// The addendum continues the signed record's own field set.
		openSchema = row.schemaJson ?? null;
		addendumParentId = row.id;
		addendumReason = '';
		// Copy the signed values forward so the doctor edits rather than retypes.
		values = { ...(row.valuesJson ?? {}) };
	}

	async function postMlc(payload: Record<string, unknown>) {
		if (!mlcApi) return null;
		const res = await fetch(mlcApi, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ visitId, ...payload })
		});
		if (!res.ok) await throwUserFacingHttpError(res);
		return (await res.json()) as MlcCaseRow;
	}

	async function saveDraft() {
		if (submitting || addendumParentId != null) return;
		submitting = true;
		try {
			const row = await postMlc({
				action: 'draft',
				id: editingId ?? undefined,
				valuesJson: values
			});
			if (row) {
				editingId = row.id;
				await load();
				toastService.addSuccessToast(
					msg.mlc_draft_saved?.() ?? 'MLC draft saved.'
				);
			}
		} catch (e) {
			toastService.addErrorToast(
				msg.mlc_save_failed?.() ?? 'Failed to save the MLC record.',
				e
			);
		} finally {
			submitting = false;
		}
	}

	async function signRecord() {
		if (submitting || addendumParentId != null) return;
		submitting = true;
		try {
			const row = await postMlc({
				action: 'sign',
				id: editingId ?? undefined,
				valuesJson: values
			});
			if (row) {
				editingId = row.id;
				await load();
				toastService.addSuccessToast(
					msg.mlc_sign_saved?.() ?? 'MLC record signed.'
				);
			}
		} catch (e) {
			toastService.addErrorToast(
				msg.mlc_sign_failed?.() ?? 'Failed to sign the MLC record.',
				e
			);
		} finally {
			submitting = false;
		}
	}

	async function saveAddendum() {
		if (submitting || addendumParentId == null) return;
		if (!addendumReason.trim()) {
			toastService.addErrorToast(
				msg.mlc_addendum_reason_required?.() ??
					'Enter a reason for the addendum.'
			);
			return;
		}
		submitting = true;
		try {
			const row = await postMlc({
				action: 'addendum',
				parentInstanceId: addendumParentId,
				valuesJson: {
					...values,
					addendum_reason: addendumReason.trim()
				}
			});
			if (row) {
				startNewDraft();
				await load();
				toastService.addSuccessToast(
					msg.mlc_addendum_saved?.() ?? 'MLC addendum saved.'
				);
			}
		} catch (e) {
			toastService.addErrorToast(
				msg.mlc_addendum_failed?.() ?? 'Failed to save the addendum.',
				e
			);
		} finally {
			submitting = false;
		}
	}

	function currentPrintHtml(variant: 'browser' | 'pdfRaster') {
		if (!activeSchema) return '';
		return buildMlcPrintHtml({
			formNumber: signedCase?.formNumber ?? null,
			title: msg.mlc_title?.() ?? 'MLC documentation',
			schema: activeSchema,
			values,
			signedAt: signedCase?.signedAt ?? null,
			printBy: printByName,
			variant
		});
	}

	async function printRecord() {
		if (printing) return;
		await printLock.run(async () => {
			printing = true;
			try {
				await printHtmlInIframe(currentPrintHtml('browser'), {
					iframeId: 'mlc-print-iframe'
				});
			} catch (e) {
				toastService.addErrorToast(
					msg.mlc_print_failed?.() ??
						'Failed to prepare the MLC printout.',
					e
				);
			} finally {
				printing = false;
			}
		});
	}

	async function savePdfCopy() {
		if (printing || !hospitalId || !visitId) return;
		await printLock.run(async () => {
			printing = true;
			try {
				// MLC has no document-master row, so the copy is attached to the
				// patient directly without a patient_document link.
				const basicsRes = await fetch(
					`/api/medora/hospital/${hospitalId}/home/nursing-workbench/emr/patient-attachment?action=visitBasics&visitId=${encodeURIComponent(visitId)}`,
					{ credentials: 'include' }
				);
				if (!basicsRes.ok) await throwUserFacingHttpError(basicsRes);
				const basics = (await basicsRes.json()) as {
					data?: { patientId?: string } | null;
				};
				const patientId = basics.data?.patientId;
				if (!patientId) {
					throw new Error('Patient not found for this visit');
				}

				const html = currentPrintHtml('pdfRaster');
				const blob = await htmlStringToPdfBlob(html);
				const base = (signedCase?.formNumber ?? `mlc-${visitId}`)
					.replace(/[^\w.-]+/g, '_')
					.slice(0, 60);
				const url = await uploadPatientAttachmentPdf(
					blob,
					`${base}-${Date.now()}.pdf`
				);

				const attachRes = await fetch(
					`/api/medora/hospital/${hospitalId}/home/nursing-workbench/emr/patient-attachment`,
					{
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						credentials: 'include',
						body: JSON.stringify({
							patientId,
							fileUrl: url,
							description:
								`MLC ${signedCase?.formNumber ?? ''} (visit ${visitId})`.trim()
						})
					}
				);
				if (!attachRes.ok) await throwUserFacingHttpError(attachRes);

				toastService.addSuccessToast(
					msg.mlc_pdf_saved?.() ??
						'MLC copy saved to patient attachments.'
				);
			} catch (e) {
				toastService.addErrorToast(
					msg.mlc_pdf_failed?.() ??
						'Failed to save the MLC copy to patient attachments.',
					e
				);
			} finally {
				printing = false;
			}
		});
	}

	lifeCycle.onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>{msg.mlc_title?.() ?? 'MLC documentation'}</title>
</svelte:head>

<div class="flex flex-col gap-4 p-2">
	<h1 class="text-xl font-bold text-primary">
		{msg.mlc_title?.() ?? 'MLC documentation'}
	</h1>

	{#if !visitId}
		<WashAlert
			type={StatusColorEnum.INFO}
			message={msg.mlc_visit_required?.() ??
				'Select an ED visit from the bar above to document a medico-legal case.'}
		/>
	{:else if loading}
		<p class="text-sm">{m.loading?.() ?? 'Loading…'}</p>
	{:else if loadError}
		<WashAlert
			type={StatusColorEnum.ERROR}
			message={msg.mlc_load_failed?.() ??
				'Failed to load MLC documentation.'}
		>
			{#snippet trailing()}
				<WashButton
					type="button"
					variant="secondary"
					size="sm"
					onClick={() => void load()}
				>
					{m.visit_gate_retry?.() ?? 'Retry'}
				</WashButton>
			{/snippet}
		</WashAlert>
	{:else if !activeSchema}
		<WashAlert
			type={StatusColorEnum.WARNING}
			message={msg.mlc_template_missing?.() ??
				'MLC template not available.'}
		/>
	{:else}
		<WashAlert
			type={encounterIsMlc
				? StatusColorEnum.SUCCESS
				: StatusColorEnum.INFO}
			message={encounterIsMlc
				? (msg.mlc_encounter_flag?.() ??
					'This encounter was registered as an MLC case.')
				: (msg.mlc_encounter_flag_missing?.() ??
					'This encounter was not registered as an MLC case.')}
		/>

		<div
			class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
		>
			<WashCard>
				<WashCardBody className="gap-4">
					<WashCardBodyTitle>
						{addendumParent
							? `${msg.mlc_add_addendum?.() ?? 'Add addendum'} — ${caseLabel(addendumParent)}`
							: (msg.mlc_current_title?.() ?? 'MLC record')}
					</WashCardBodyTitle>

					<div class="flex flex-wrap items-center gap-2 text-xs">
						{#if signedCase?.formNumber}
							<span class="badge badge-outline">
								{msg.mlc_no_label?.() ?? 'MLC no'}: {signedCase.formNumber}
							</span>
						{/if}
						{#if signedCase}
							<span class="badge {statusBadgeClass(signedCase)}">
								{statusLabel(signedCase)}
							</span>
						{/if}
						{#if staffName}
							<span class="opacity-70">{staffName}</span>
						{/if}
					</div>

					{#if isSignedView}
						<WashAlert
							type={StatusColorEnum.INFO}
							message={msg.mlc_readonly_signed?.() ??
								'This record is signed. Corrections are made through an addendum.'}
						/>
					{/if}

					{#key `${visitId}:${editingId ?? 'new'}:${addendumParentId ?? ''}`}
						<ClinicalFormRenderer
							schema={activeSchema}
							bind:values
							{readOnly}
							className="grid grid-cols-1 gap-4 md:grid-cols-2"
						/>
					{/key}

					{#if addendumParentId != null}
						<div class="flex max-w-md flex-col gap-1">
							<label
								class="label-ink text-sm"
								for="mlc-addendum-reason"
							>
								{msg.mlc_addendum_reason?.() ?? 'Reason for addendum'}
								<span
									class="align-top text-sm leading-none text-error"
									aria-hidden="true">*</span
								>
							</label>
							<WashInputField
								id="mlc-addendum-reason"
								className="input-sm"
								value={addendumReason}
								oninput={(e) =>
									(addendumReason = (
										e.currentTarget as HTMLInputElement
									).value)}
							/>
						</div>
					{/if}

					<div class="flex flex-wrap items-center gap-2">
						{#if addendumParentId != null}
							<WashButton
								className="btn btn-primary cursor-pointer"
								loading={submitting}
								disabled={submitting}
								onClick={() => void saveAddendum()}
							>
								{msg.mlc_add_addendum?.() ?? 'Add addendum'}
							</WashButton>
						{:else if !isSignedView}
							<WashButton
								className="btn btn-outline cursor-pointer"
								loading={submitting}
								disabled={submitting || !canWrite}
								onClick={() => void saveDraft()}
							>
								{msg.mlc_save_draft?.() ?? 'Save draft'}
							</WashButton>
							<WashButton
								className="btn btn-primary cursor-pointer"
								loading={submitting}
								disabled={submitting || !canWrite}
								onClick={() => void signRecord()}
							>
								{msg.mlc_sign?.() ?? 'Sign'}
							</WashButton>
						{/if}

						<WashButton
							className="btn btn-ghost cursor-pointer"
							loading={printing}
							disabled={printing || !can(PageActionEnum.PRINT)}
							onClick={() => void printRecord()}
						>
							{msg.mlc_print?.() ?? 'Print'}
						</WashButton>

						<WashButton
							className="btn btn-ghost cursor-pointer"
							loading={printing}
							disabled={printing || !can(PageActionEnum.PRINT)}
							onClick={() => void savePdfCopy()}
						>
							{msg.mlc_save_pdf?.() ?? 'Save PDF'}
						</WashButton>

						{#if isSignedView}
							<WashButton
								className="btn btn-outline cursor-pointer"
								disabled={printing || !canWrite}
								onClick={() =>
									signedCase && startAddendum(signedCase)}
							>
								{msg.mlc_add_addendum?.() ?? 'Add addendum'}
							</WashButton>
						{/if}
					</div>

					{#if !isSignedView && addendumParentId == null}
						<p class="text-xs opacity-70">
							{msg.mlc_signing_hint?.() ??
								'Doctor and witness signatures with timestamps are required before signing.'}
						</p>
					{/if}
				</WashCardBody>
			</WashCard>

			<WashCard>
				<WashCardBody className="gap-3">
					<WashCardBodyTitle>
						{msg.mlc_list_title?.() ?? 'MLC cases for this visit'}
					</WashCardBodyTitle>

					{#if canWrite}
						<WashButton
							className="btn btn-secondary btn-sm cursor-pointer self-start"
							disabled={editingId == null && addendumParentId == null}
							onClick={startNewDraft}
						>
							{msg.mlc_new_record?.() ?? 'New MLC record'}
						</WashButton>
					{/if}

					{#if orderedCases.length === 0}
						<p class="text-sm opacity-70">
							{msg.mlc_list_empty?.() ??
								'No MLC record for this visit yet.'}
						</p>
					{:else}
						<ul class="flex flex-col gap-2">
							{#each orderedCases as group (group.root.id)}
								{@const row = group.root}
								<li class="rounded-box border border-base-300 p-2">
									<button
										type="button"
										class="flex w-full cursor-pointer items-center justify-between gap-2 text-start"
										onclick={() => openCase(row)}
									>
										<span class="flex flex-col">
											<span class="font-semibold"
												>{caseLabel(row)}</span
											>
											<span class="text-xs opacity-70">
												{msg.mlc_col_created?.() ?? 'Opened'}:
												{formatMenziesTableDateTime(row.createdAt)}
											</span>
										</span>
										<span class="badge {statusBadgeClass(row)}">
											{statusLabel(row)}
										</span>
									</button>

									{#if group.addenda.length > 0}
										<ul
											class="mt-2 flex flex-col gap-1 border-l border-base-300 pl-3"
										>
											{#each group.addenda as addendum (addendum.id)}
												<li>
													<button
														type="button"
														class="flex w-full cursor-pointer items-center justify-between gap-2 text-start text-xs"
														onclick={() => openCase(addendum)}
													>
														<span>
															{msg.mlc_status_addendum?.() ??
																'Addendum'}
															· {formatMenziesTableDateTime(
																addendum.createdAt
															)}
														</span>
														<span class="badge badge-info badge-xs">
															{statusLabel(addendum)}
														</span>
													</button>
												</li>
											{/each}
										</ul>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</WashCardBody>
			</WashCard>
		</div>
	{/if}
</div>
