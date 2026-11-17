<script lang="ts">
	import { onMount } from 'svelte';
	import WashDialog from '$lib/component/wash/dialog/WashDialog.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import PrintPreview from '$lib/component/own/library/menzies/PrintPreview.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { getPatientPhotoDisplayUrl } from '$lib/util/staff-photo.util';
	import { buildPrintDocumentHtml } from '$lib/util/print-document-html.util';
	import { sanitizeDownloadFileBase } from '$lib/util/print-download-filename.util';
	import { printHtmlInIframe } from '$lib/util/document-master-print.util.svelte';
	import { page } from '$app/state';
	import type { PatientWithRelations } from '$lib/model/type/medora/patient.type';

	let { patientId, onClose } = $props<{
		patientId: string;
		onClose: () => void;
	}>();

	const dateTimeUtil = new DateTimeUtil();

	let patient = $state<PatientWithRelations | null>(null);
	let isLoading = $state(true);
	let fetchError = $state<string | null>(null);

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: undefined
	);

	function patientListApiBase(hospitalId: string) {
		return `/api/medora/hospital/${encodeURIComponent(
			hospitalId
		)}/home/registration/patient/list`;
	}

	onMount(() => {
		let cancelled = false;

		isLoading = true;
		fetchError = null;
		patient = null;

		(async () => {
			try {
				if (!hospitalId) throw new Error('Hospital is required');
				const res = await fetch(
					`${patientListApiBase(hospitalId)}?id=${encodeURIComponent(patientId)}&_t=${Date.now()}`
				);
				if (!res.ok)
					throw new Error(
						`Failed to load patient details (${res.status})`
					);
				const data =
					(await res.json()) as PatientWithRelations | null;
				if (cancelled) return;
				patient = data;
			} catch (err) {
				if (cancelled) return;
				fetchError =
					err instanceof Error
						? err.message
						: 'Failed to load patient details.';
			} finally {
				if (cancelled) return;
				isLoading = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	const patientCode = $derived(patient?.code ?? '—');

	const patientFullName = $derived.by(() => {
		if (!patient) return '—';
		const v = StringUtil.patientDisplayName(patient);
		return v?.trim() ? v : '—';
	});

	const patientInitials = $derived.by(() => {
		const name = patientFullName ?? '—';
		const parts = name
			.split(' ')
			.map((p) => p.trim())
			.filter(Boolean);
		const first = parts[0]?.[0] ?? '';
		const second = parts[1]?.[0] ?? '';
		const initials = `${first}${second}`.toUpperCase();
		return initials || 'P';
	});

	const identityDisplay = $derived.by(() => {
		if (!patient?.identityType || !patient?.identityNo) return '—';
		const v = StringUtil.fullIdentity(
			patient.identityType,
			patient.identityNo
		);
		return v?.trim() ? v : '—';
	});

	const genderDisplay = $derived(patient?.gender?.name ?? '—');
	const dobDisplay = $derived(
		dateTimeUtil.formatDate(patient?.dateOfBirth)
	);

	const phonePrimaryDisplay = $derived.by(() => {
		if (!patient?.phonePrimaryCountry || !patient?.phonePrimary)
			return '—';
		const v = StringUtil.fullPhoneNo(
			patient.phonePrimaryCountry,
			patient.phonePrimary
		);
		return v?.trim() ? v : '—';
	});

	const addressDisplay = $derived.by(() => {
		if (!patient) return '—';

		const parts: string[] = [];
		if (
			typeof patient.address === 'string' &&
			patient.address.trim()
		) {
			parts.push(patient.address.trim());
		}
		if (patient.city?.name?.trim())
			parts.push(patient.city.name.trim());
		if (patient.state?.name?.trim())
			parts.push(patient.state.name.trim());
		if (patient.country?.name?.trim())
			parts.push(patient.country.name.trim());

		return parts.length ? parts.join(', ') : '—';
	});

	function escapeHtml(value: unknown): string {
		const s = String(value ?? '');
		return s
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#039;');
	}

	function buildPatientCardBodyHtml(): string {
		if (!patient) return '';

		const photoUrl = getPatientPhotoDisplayUrl(patient.photoPath);
		const photoHtml = photoUrl
			? `<img class="photo" src="${escapeHtml(
					photoUrl
				)}" alt="Patient photo" />`
			: `<div class="photo-placeholder" aria-hidden="true">${escapeHtml(
					patientInitials
				)}</div>`;

		return `<style>
			.patient-card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; color: #111827; }
			.patient-card h1 { font-size: 18px; margin: 0 0 16px; }
			.patient-card .header { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
			.patient-card .photo,
			.patient-card .photo-placeholder { width: 76px; height: 76px; border-radius: 9999px; object-fit: cover; border: 1px solid #e5e7eb; }
			.patient-card .photo-placeholder { display: flex; align-items: center; justify-content: center; font-weight: 800; background: #f3f4f6; color: #111827; }
			.patient-card .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
			.patient-card .field .label { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #6b7280; font-weight: 700; margin-bottom: 2px; }
			.patient-card .field .value { font-size: 14px; font-weight: 600; word-break: break-word; }
			.patient-card .address { margin-top: 12px; }
		</style>
		<div class="patient-card">
			<h1>Patient card</h1>
			<div class="header">
				${photoHtml}
				<div>
					<div style="font-size:16px;font-weight:800;margin-bottom:2px;">${escapeHtml(patientFullName)}</div>
					<div style="color:#6b7280;font-size:13px;">Patient code: <span style="font-weight:700;">${escapeHtml(patientCode)}</span></div>
				</div>
			</div>
			<div class="grid">
				<div class="field"><div class="label">Patient code</div><div class="value">${escapeHtml(patientCode)}</div></div>
				<div class="field"><div class="label">Full patient name</div><div class="value">${escapeHtml(patientFullName)}</div></div>
				<div class="field"><div class="label">Identity</div><div class="value">${escapeHtml(identityDisplay)}</div></div>
				<div class="field"><div class="label">Gender</div><div class="value">${escapeHtml(genderDisplay)}</div></div>
				<div class="field"><div class="label">Date of birth</div><div class="value">${escapeHtml(dobDisplay)}</div></div>
				<div class="field"><div class="label">Phone primary</div><div class="value">${escapeHtml(phonePrimaryDisplay)}</div></div>
			</div>
			<div class="address field">
				<div class="label">Address</div>
				<div class="value">${escapeHtml(addressDisplay)}</div>
			</div>
		</div>`;
	}

	/**
	 * One HTML source for preview, print and PDF — same page spec as every
	 * other Document Master print document.
	 */
	const printHtml = $derived.by(() => {
		if (!patient) return '';
		const name = patientFullName !== '—' ? patientFullName : 'patient';
		return buildPrintDocumentHtml({
			documentHtml: buildPatientCardBodyHtml(),
			documentTitle: 'Patient card',
			downloadFileBase: sanitizeDownloadFileBase(
				`patient_card_${name}`
			),
			headerHtml: '',
			footerHtml: '',
			setting: {
				pageSize: 'A4',
				pageOrientation: 'portrait',
				marginTop: 15,
				marginBottom: 15,
				marginLeft: 15,
				marginRight: 15,
				paddingTop: 5,
				paddingBottom: 5,
				paddingLeft: 5,
				paddingRight: 5,
				showHeader: false,
				showFooter: false
			},
			variant: 'browser'
		});
	});

	let isPrinting = $state(false);

	async function printPatientCard() {
		if (!printHtml || isPrinting) return;
		isPrinting = true;
		try {
			await printHtmlInIframe(printHtml, {
				iframeId: 'patient-card-print-iframe'
			});
		} catch (err) {
			console.error('[patient-card-print] failed', err);
		} finally {
			isPrinting = false;
		}
	}
</script>

<WashDialog
	id="patient-card-print-modal"
	open={true}
	{onClose}
	title="Patient card"
	boxClassName="max-w-5xl"
>
	<div class="p-4">
		{#if isLoading}
			<div class="flex items-center justify-center py-10">
				<span class="loading loading-spinner loading-lg"></span>
			</div>
		{:else if fetchError}
			<p class="text-sm text-error">{fetchError}</p>
		{:else if !patient}
			<p class="text-sm text-base-content/70">Patient not found.</p>
		{:else}
			<PrintPreview
				html={printHtml}
				title="Patient card print preview"
				minHeight="min-h-[60vh]"
				showPrintButton={false}
			/>
		{/if}
	</div>
	{#snippet actions()}
		{#if patient && !isLoading && !fetchError}
			<WashButton
				type="button"
				className="btn-primary btn-sm gap-2"
				onClick={() => void printPatientCard()}
				loading={isPrinting}
				loadingText="Printing…"
			>
				<LucidePrinter className="size-5" />
				Print
			</WashButton>
		{/if}
		<WashButton variant="ghost" onClick={onClose}>Close</WashButton>
	{/snippet}
</WashDialog>
