<script lang="ts">
	import { onMount } from 'svelte';
	import DaisyUiModal from '$lib/component/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLoading from '$lib/component/daisyui/loading/DaisyUiLoading.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import {
		getPatientByIdWithRelations
	} from '$lib/tool/remote/table/information-table/patient.http.tool.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { getPatientPhotoDisplayUrl } from '$lib/util/staff-photo.util';

	type PatientWithRelations = any;

	let { patientId, onClose } = $props<{
		patientId: string;
		onClose: () => void;
	}>();

	const dateTimeUtil = new DateTimeUtil();

	let patient = $state<PatientWithRelations | null>(null);
	let isLoading = $state(true);
	let fetchError = $state<string | null>(null);

	onMount(() => {
		let cancelled = false;

		isLoading = true;
		fetchError = null;
		patient = null;

		(async () => {
			try {
				const data = await getPatientByIdWithRelations({ id: patientId });
				if (cancelled) return;
				patient = data as PatientWithRelations;
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

	const patientPhotoUrl = $derived.by(() => {
		if (!patient) return '';
		return getPatientPhotoDisplayUrl((patient as any).photoPath) ?? '';
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
	const dobDisplay = $derived(dateTimeUtil.formatDate(patient?.dateOfBirth));

	const phonePrimaryDisplay = $derived.by(() => {
		if (!patient?.phonePrimaryCountry || !patient?.phonePrimary) return '—';
		const v = StringUtil.fullPhoneNo(
			patient.phonePrimaryCountry,
			patient.phonePrimary
		);
		return v?.trim() ? v : '—';
	});

	const addressDisplay = $derived.by(() => {
		if (!patient) return '—';

		const parts: string[] = [];
		if (typeof patient.address === 'string' && patient.address.trim()) {
			parts.push(patient.address.trim());
		}
		if (patient.city?.name?.trim()) parts.push(patient.city.name.trim());
		if (patient.state?.name?.trim()) parts.push(patient.state.name.trim());
		if (patient.country?.name?.trim()) parts.push(patient.country.name.trim());

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

	function openPrintWindow() {
		if (!patient) return;

		const title = 'Patient card';
		const photoUrl = getPatientPhotoDisplayUrl(
			(patient as any).photoPath
		);
		const photoHtml = photoUrl
			? `<img class="photo" src="${escapeHtml(
					photoUrl
				)}" alt="Patient photo" />`
			: `<div class="photo-placeholder" aria-hidden="true">${escapeHtml(
					patientInitials
				)}</div>`;

		const html = `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${escapeHtml(title)}</title>
	<style>
		body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 24px; color: #111827; }
		.card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; max-width: 720px; margin: 0 auto; }
		h1 { font-size: 18px; margin: 0 0 16px; }
		.header { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
		.photo { width: 76px; height: 76px; border-radius: 9999px; object-fit: cover; border: 1px solid #e5e7eb; }
		.photo-placeholder { width: 76px; height: 76px; border-radius: 9999px; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; font-weight: 800; background: #f3f4f6; color: #111827; }
		.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
		.field .label { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #6b7280; font-weight: 700; margin-bottom: 2px; }
		.field .value { font-size: 14px; font-weight: 600; word-break: break-word; }
		.address { margin-top: 12px; }
		@media print { body { padding: 0; } .card { border: none; border-radius: 0; } }
	</style>
</head>
<body>
	<div class="card">
		<h1>${escapeHtml(title)}</h1>
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
	</div>
</body>
</html>`;

		// Blob URL is more reliable than document.write for printing.
		const w = window.open('', '_blank', 'noopener');
		if (!w) return;

		try {
			const blob = new Blob([html], { type: 'text/html' });
			const blobUrl = URL.createObjectURL(blob);

			const cleanup = () => {
				try {
					URL.revokeObjectURL(blobUrl);
				} catch {
					// ignore
				}
			};

			w.location.href = blobUrl;
			w.onload = () => {
				try {
					w.focus();
					w.print();
				} finally {
					cleanup();
				}
			};

			// Fallback print (some browsers don't reliably fire onload).
			setTimeout(() => {
				try {
					w.focus();
					w.print();
				} finally {
					cleanup();
				}
			}, 250);
		} catch (err) {
			console.error('[patient-card-print] failed', err);
		}
	}
</script>

<DaisyUiModal
	groupName="patient-card-print-modal"
	open={true}
	onClose={onClose}
>
	<div class="d-modal-box max-w-2xl" role="document">
		<div class="flex items-center justify-between border-b border-base-300 px-4 py-2">
			<h2 class="text-lg font-semibold">Patient card</h2>
			<DaisyUiButton
				className="d-btn-ghost d-btn-sm d-btn-circle"
				onClick={onClose}
			>
				<LucideX className="size-5" />
			</DaisyUiButton>
		</div>

		<div class="p-4">
			{#if isLoading}
				<div class="flex items-center justify-center py-10">
					<DaisyUiLoading className="d-loading-lg" />
				</div>
			{:else if fetchError}
				<p class="text-sm text-error">{fetchError}</p>
			{:else if !patient}
				<p class="text-sm text-base-content/70">Patient not found.</p>
			{:else}
				<DaisyUiCard animate={true}>
					<DaisyUiCardBody className="p-4">
							<div class="flex items-start gap-4">
								<div class="relative shrink-0">
									{#if patientPhotoUrl}
										<img
											src={patientPhotoUrl}
											alt="Patient profile"
											class="h-20 w-20 rounded-full border border-base-300 object-cover shadow-sm"
										/>
									{:else}
										<div
											class="h-20 w-20 rounded-full border border-base-300 bg-base-200 flex items-center justify-center shadow-sm"
										>
											<span class="text-sm font-bold text-base-content/70">
												{patientInitials}
											</span>
										</div>
									{/if}
								</div>

								<div class="flex flex-col gap-2">
									<DaisyUiCardBodyTitle className="text-base-content">
										{patientFullName}
									</DaisyUiCardBodyTitle>

									<p class="text-sm text-base-content/70">
										Patient code: <span class="font-semibold">{patientCode}</span>
									</p>

									<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
										<div class="field">
											<div class="label text-xs font-semibold uppercase tracking-wide text-base-content/60">
												Identity
											</div>
											<div class="value break-words text-sm font-semibold">
												{identityDisplay}
											</div>
										</div>
										<div class="field">
											<div class="label text-xs font-semibold uppercase tracking-wide text-base-content/60">
												Gender
											</div>
											<div class="value break-words text-sm font-semibold">
												{genderDisplay}
											</div>
										</div>
										<div class="field">
											<div class="label text-xs font-semibold uppercase tracking-wide text-base-content/60">
												Date of birth
											</div>
											<div class="value break-words text-sm font-semibold">
												{dobDisplay}
											</div>
										</div>
										<div class="field">
											<div class="label text-xs font-semibold uppercase tracking-wide text-base-content/60">
												Phone primary
											</div>
											<div class="value break-words text-sm font-semibold">
												{phonePrimaryDisplay}
											</div>
										</div>
									</div>

									<div class="mt-4">
										<div class="label text-xs font-semibold uppercase tracking-wide text-base-content/60">
											Address
										</div>
										<div class="value mt-1 break-words text-sm font-semibold">
											{addressDisplay}
										</div>
									</div>
								</div>
						</div>
					</DaisyUiCardBody>
				</DaisyUiCard>

				<div class="mt-4 flex justify-end gap-2">
					<DaisyUiButton
						type="button"
						className="d-btn-primary d-btn-sm gap-2"
						onClick={openPrintWindow}
					>
						<LucidePrinter className="size-5" />
						Print
					</DaisyUiButton>
				</div>
			{/if}
		</div>
	</div>
</DaisyUiModal>

