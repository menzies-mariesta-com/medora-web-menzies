<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ObservationPatientDocumentDialogState } from '$lib/state/observation-patient-document-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import {
		getDocumentsWithRelations,
		type DocumentWithRelations
	} from '$lib/remote/table/information-table/document.remote';
	import {
		createPatientDocument,
		updatePatientDocument,
		getPatientDocumentById
	} from '$lib/remote/table/information-table/patient-document.remote';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiSearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import { m } from '$lib/paraglide/messages';

	const toastService = new ToastService();

	let { confirm, cancel }: DialogSlotProps = $props();

	const visitId = $derived(
		ObservationPatientDocumentDialogState.visitId
	);
	const patientId = $derived(
		ObservationPatientDocumentDialogState.patientId
	);
	const patientDocumentId = $derived(
		ObservationPatientDocumentDialogState.patientDocumentId
	);
	const isEdit = $derived(patientDocumentId != null);

	let documentIdInput = $state('');
	let statusIdStr = $state(String(StatusEnum.ACTIVE));
	let isSubmitting = $state(false);
	let loadSeq = $state(0);

	const statusOptions = [
		{ value: String(StatusEnum.ACTIVE), label: 'Active' },
		{ value: String(StatusEnum.INACTIVE), label: 'Inactive' }
	];

	async function searchDocuments(
		query: string
	): Promise<{ label: string; value: string }[]> {
		const q = query.trim().toLowerCase();
		const all = await getDocumentsWithRelations();
		return all
			.filter((d: DocumentWithRelations) => {
				if (!q) return true;
				const code = (d.code ?? '').toLowerCase();
				const num = (d.documentNumber ?? '').toLowerCase();
				const type = (
					d.documentType?.documentType ?? ''
				).toLowerCase();
				return (
					code.includes(q) ||
					num.includes(q) ||
					type.includes(q) ||
					String(d.id).includes(q)
				);
			})
			.slice(0, 40)
			.map((d: DocumentWithRelations) => ({
				value: String(d.id),
				label:
					[d.code, d.documentNumber, d.documentType?.documentType]
						.filter(Boolean)
						.join(' · ') || `Document ${d.id}`
			}));
	}

	async function getDocumentLabelForValue(
		id: string
	): Promise<string> {
		const all = await getDocumentsWithRelations();
		const d = all.find(
			(x: DocumentWithRelations) => String(x.id) === id
		);
		if (!d) return '';
		return (
			[d.code, d.documentNumber, d.documentType?.documentType]
				.filter(Boolean)
				.join(' · ') || `Document ${d.id}`
		);
	}

	$effect(() => {
		const pid = patientDocumentId;
		if (pid == null) {
			documentIdInput = '';
			statusIdStr = String(StatusEnum.ACTIVE);
			return;
		}
		const seq = ++loadSeq;
		(async () => {
			const row = await getPatientDocumentById({ id: pid });
			if (seq !== loadSeq || !row) return;
			documentIdInput = String(row.documentId);
			statusIdStr = String(row.statusId ?? StatusEnum.ACTIVE);
		})();
	});

	async function handleSave() {
		if (visitId == null || patientId == null) return;
		const docId = Number(documentIdInput);
		if (!Number.isFinite(docId) || docId < 1) {
			toastService.addToast(
				m.observation_emr_document_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const statusId = Number(statusIdStr);
		if (!Number.isFinite(statusId)) {
			toastService.addToast(
				m.observation_emr_invalid_status(),
				StatusColorEnum.ERROR
			);
			return;
		}
		isSubmitting = true;
		try {
			if (isEdit && patientDocumentId != null) {
				await updatePatientDocument({
					id: patientDocumentId,
					documentId: docId,
					statusId
				});
			} else {
				await createPatientDocument({
					visitId,
					patientId,
					documentId: docId,
					statusId
				});
			}
			toastService.addToast(
				m.observation_emr_saved(),
				StatusColorEnum.SUCCESS
			);
			ObservationPatientDocumentDialogState.onSaved?.();
			await confirm({ saved: true });
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: m.observation_emr_save_failed()) as string,
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<p class="text-sm font-medium">
		{isEdit
			? m.observation_emr_edit_document_link()
			: m.observation_emr_add_document_link()}
	</p>
	<div class="flex flex-col gap-1">
		<DaisyUiLabel forText="obs-doc-pick" className="text-sm">
			{m.observation_emr_document_master()}
		</DaisyUiLabel>
		<DaisyUiSearchSelect
			className="w-full"
			bind:value={documentIdInput}
			searchFn={searchDocuments}
			getLabelForValue={getDocumentLabelForValue}
			placeholder={m.observation_emr_search_documents()}
		/>
	</div>
	<div class="flex flex-col gap-1">
		<DaisyUiLabel forText="obs-doc-status" className="text-sm">
			{m.observation_emr_status()}
		</DaisyUiLabel>
		<DaisyUiSelect
			name="obs-doc-status"
			className="w-full"
			bind:value={statusIdStr}
		>
			{#each statusOptions as opt}
				{#if opt.value === statusIdStr}
					<option value={opt.value} selected>{opt.label}</option>
				{:else}
					<option value={opt.value}>{opt.label}</option>
				{/if}
			{/each}
		</DaisyUiSelect>
	</div>
	<div class="flex flex-wrap justify-end gap-2">
		<DaisyUiButton
			className="d-btn-ghost"
			onClick={() => {
				if (isSubmitting) return;
				cancel();
			}}
			disabled={isSubmitting}
		>
			{m.observation_emr_cancel()}
		</DaisyUiButton>
		<DaisyUiButton
			className="d-btn-primary"
			disabled={isSubmitting}
			loading={isSubmitting}
			onClick={handleSave}
		>
			{m.observation_emr_save()}
		</DaisyUiButton>
	</div>
</div>
