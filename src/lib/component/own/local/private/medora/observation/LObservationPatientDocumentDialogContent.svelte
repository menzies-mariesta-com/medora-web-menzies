<script lang="ts">
	import { page } from '$app/state';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ObservationPatientDocumentDialogState } from '$lib/state/observation-patient-document-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	const toastService = new ToastService();

	let { confirm, cancel }: DialogSlotProps = $props();

	const hospitalId = $derived(page.params.hospital_id ?? '');

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

	type DocumentWithRelations = {
		id: number;
		code: string | null;
		documentNumber: string | null;
		documentType?: { documentType?: string | null } | null;
	};

	type PatientDocRow = {
		id: number;
		documentId: number | null;
		statusId: number | null;
	};

	async function apiGet<T>(
		mode: string,
		params?: Record<string, string>
	) {
		const hid = hospitalId;
		if (!hid) throw new Error('Hospital is required');
		const url = new URL(
			`/api/medora/hospital/${hid}/home/consultation/emr`,
			location.origin
		);
		url.searchParams.set('mode', mode);
		if (params) {
			for (const [k, v] of Object.entries(params)) {
				url.searchParams.set(k, v);
			}
		}
		const res = await fetch(url.toString());
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as T;
	}

	async function apiPost<T>(mode: string, payload: unknown) {
		const hid = hospitalId;
		if (!hid) throw new Error('Hospital is required');
		const res = await fetch(
			`/api/medora/hospital/${hid}/home/consultation/emr`,
			{
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode,
					...(payload as Record<string, unknown>)
				})
			}
		);
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as T;
	}

	let cachedDocuments: DocumentWithRelations[] | null = null;
	let documentsPromise: Promise<DocumentWithRelations[]> | null =
		null;
	async function getAllDocuments(): Promise<DocumentWithRelations[]> {
		if (cachedDocuments) return cachedDocuments;
		if (!documentsPromise) {
			documentsPromise = apiGet<DocumentWithRelations[]>(
				'documentMaster.list'
			).then((rows) => {
				cachedDocuments = rows;
				return rows;
			});
		}
		return documentsPromise;
	}

	const statusOptions = [
		{ value: String(StatusEnum.ACTIVE), label: 'Active' },
		{ value: String(StatusEnum.INACTIVE), label: 'Inactive' }
	];

	async function searchDocuments(
		query: string
	): Promise<{ label: string; value: string }[]> {
		const q = query.trim().toLowerCase();
		const all = await getAllDocuments();
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
		const all = await getAllDocuments();
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
			const row = await apiGet<PatientDocRow | null>(
				'patientDocument.get',
				{ id: String(pid) }
			);
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
				await apiPost('patientDocument.update', {
					payload: {
						id: patientDocumentId,
						documentId: docId,
						statusId
					}
				});
			} else {
				await apiPost('patientDocument.create', {
					payload: { visitId, patientId, documentId: docId, statusId }
				});
			}
			const title = isEdit
				? m.observation_emr_edit_document_link()
				: m.observation_emr_add_document_link();
			toastSuccess(
				toastService,
				title,
				isEdit ? m.toast_action_updated() : m.toast_action_created()
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
		<label for="obs-doc-pick" class="text-sm">
			{m.observation_emr_document_master()}
		</label>
		<SearchSelect
			className="w-full"
			bind:value={documentIdInput}
			searchFn={searchDocuments}
			getLabelForValue={getDocumentLabelForValue}
			placeholder={m.observation_emr_search_documents()}
		/>
	</div>
	<div class="flex flex-col gap-1">
		<label for="obs-doc-status" class="text-sm">
			{m.observation_emr_status()}
		</label>
		<WashSelect
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
		</WashSelect>
	</div>
	<div class="flex flex-wrap justify-end gap-2">
		<WashButton
			className="btn-ghost"
			onClick={() => {
				if (isSubmitting) return;
				cancel();
			}}
			disabled={isSubmitting}
		>
			{m.observation_emr_cancel()}
		</WashButton>
		<WashButton
			className="btn-primary"
			disabled={isSubmitting}
			loading={isSubmitting}
			onClick={handleSave}
		>
			{m.observation_emr_save()}
		</WashButton>
	</div>
</div>
