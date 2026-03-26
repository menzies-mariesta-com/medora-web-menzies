<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { VitalRecordDialogState } from '$lib/state/vital-record-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { UnitEnum } from '$lib/model/enum/db-link';
	import {
		createPatientVital,
		getPatientVitalById,
		updatePatientVital
	} from '$lib/remote/table/information-table/patient-vital.remote';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiDivider from '$lib/component/daisyui/divider/DaisyUiDivider.svelte';
	import {
		getVitalPlaceholder,
		vitalInputClass
	} from '$lib/config/vital.config';

	const toastService = new ToastService();

	let { confirm, cancel }: DialogSlotProps = $props();

	const patientId = $derived(VitalRecordDialogState.patientId);
	const hospitalId = $derived(VitalRecordDialogState.hospitalId);
	const visitId = $derived(VitalRecordDialogState.visitId);
	const vitalId = $derived(VitalRecordDialogState.vitalId);
	const isEditMode = $derived(!!vitalId);

	let isSubmitting = $state(false);
	let height = $state('');
	let weight = $state('');
	let bpSystolic = $state('');
	let bpDiastolic = $state('');
	let pulse = $state('');
	let temperature = $state('');
	let spO2 = $state('');
	let respiration = $state('');
	let rbs = $state('');
	let vitalDateTime = $state('');
	let symptom = $state('');
	let description = $state('');
	let remark = $state('');

	function parseDecimal(v: string): string | null {
		const s = v.trim();
		if (!s) return null;
		const n = Number(s);
		if (Number.isNaN(n)) return null;
		return String(n);
	}

	function asStr(v: unknown): string {
		return v != null ? String(v) : '';
	}

	/** Format ISO/date string to datetime-local input value (YYYY-MM-DDTHH:mm). */
	function formatVitalDateTimeForInput(v: unknown): string {
		if (v == null || v === '') return '';
		try {
			const d = new Date(String(v));
			if (isNaN(d.getTime())) return '';
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, '0');
			const day = String(d.getDate()).padStart(2, '0');
			const h = String(d.getHours()).padStart(2, '0');
			const min = String(d.getMinutes()).padStart(2, '0');
			return `${y}-${m}-${day}T${h}:${min}`;
		} catch {
			return '';
		}
	}

	/** Parse datetime-local value to ISO string for API. */
	function parseVitalDateTime(s: string): string | undefined {
		const t = s.trim();
		if (!t) return undefined;
		try {
			const d = new Date(t);
			if (isNaN(d.getTime())) return undefined;
			return d.toISOString();
		} catch {
			return undefined;
		}
	}

	$effect(() => {
		const vid = vitalId;
		if (vid) {
			getPatientVitalById({ id: vid }).then((v) => {
				if (v) {
					height = asStr(v.height);
					weight = asStr(v.weight);
					bpSystolic = asStr(v.bpSystolic);
					bpDiastolic = asStr(v.bpDiastolic);
					pulse = asStr(v.pulse);
					temperature = asStr(v.temperature);
					spO2 = asStr(v.spO2);
					respiration = asStr(v.respiration);
					rbs = asStr(v.rbs);
					vitalDateTime = formatVitalDateTimeForInput(
						v.vitalDateTime ?? v.createdAt
					);
					symptom = asStr(v.symptom);
					description = asStr(v.description);
					remark = asStr(v.remark);
				}
			});
		} else if (!vitalDateTime.trim()) {
			vitalDateTime = formatVitalDateTimeForInput(
				new Date().toISOString()
			);
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!patientId || !hospitalId || !visitId) {
			toastService.addToast(
				'No visit selected.',
				StatusColorEnum.ERROR
			);
			return;
		}

		const hasAny =
			asStr(height).trim() ||
			asStr(weight).trim() ||
			asStr(bpSystolic).trim() ||
			asStr(bpDiastolic).trim() ||
			asStr(pulse).trim() ||
			asStr(temperature).trim() ||
			asStr(spO2).trim() ||
			asStr(respiration).trim() ||
			asStr(rbs).trim() ||
			asStr(symptom).trim() ||
			asStr(description).trim() ||
			asStr(remark).trim();

		if (!hasAny) {
			toastService.addToast(
				'Enter at least one vital sign or note.',
				StatusColorEnum.ERROR
			);
			return;
		}

		isSubmitting = true;
		const vitalPayload = {
			height: parseDecimal(asStr(height)) ?? undefined,
			heightUnitId: asStr(height).trim() ? UnitEnum.CM : undefined,
			weight: parseDecimal(asStr(weight)) ?? undefined,
			weightUnitId: asStr(weight).trim() ? UnitEnum.KG : undefined,
			bpSystolic: parseDecimal(asStr(bpSystolic)) ?? undefined,
			bpDiastolic: parseDecimal(asStr(bpDiastolic)) ?? undefined,
			bpUnitId:
				asStr(bpSystolic).trim() || asStr(bpDiastolic).trim()
					? UnitEnum.MMHG
					: undefined,
			pulse: parseDecimal(asStr(pulse)) ?? undefined,
			pulseUnitId: asStr(pulse).trim() ? UnitEnum.BPM : undefined,
			temperature: parseDecimal(asStr(temperature)) ?? undefined,
			temperatureUnitId: asStr(temperature).trim()
				? UnitEnum.CELSIUS
				: undefined,
			spO2: parseDecimal(asStr(spO2)) ?? undefined,
			spO2UnitId: asStr(spO2).trim() ? UnitEnum.PERCENT : undefined,
			respiration: parseDecimal(asStr(respiration)) ?? undefined,
			respirationUnitId: asStr(respiration).trim()
				? UnitEnum.PER_MIN
				: undefined,
			rbs: parseDecimal(asStr(rbs)) ?? undefined,
			rbsUnitId: asStr(rbs).trim() ? UnitEnum.MG_DL : undefined,
			symptom: asStr(symptom).trim() || undefined,
			description: asStr(description).trim() || undefined,
			remark: asStr(remark).trim() || undefined,
			vitalDateTime: parseVitalDateTime(vitalDateTime)
		};
		try {
			if (isEditMode && vitalId) {
				await updatePatientVital({ id: vitalId, ...vitalPayload });
				toastService.addToast(
					'Vitals updated.',
					StatusColorEnum.SUCCESS
				);
			} else {
				await createPatientVital({
					patientId: patientId!,
					hospitalId: hospitalId!,
					visitId: visitId!,
					...vitalPayload
				});
				toastService.addToast(
					'Vitals saved.',
					StatusColorEnum.SUCCESS
				);
			}
			confirm({ saved: true });
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: 'Failed to save vitals.') as string,
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
	<div
		class="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3"
	>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 md:col-span-2 xl:col-span-3"
		>
			<DaisyUiLabel
				forText="vital-datetime"
				className="shrink-0 sm:w-36">Vital Date & Time</DaisyUiLabel
			>
			<div class="max-w-80 flex-1">
				<DaisyUiInputField
					id="vital-datetime"
					bind:value={vitalDateTime}
					inputType="datetime-local"
					inputPlaceholderText="Select date and time"
					className="w-full"
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel
				forText="vital-height"
				className="shrink-0 sm:w-36">Height (cm)</DaisyUiLabel
			>
			<div class="max-w-80 flex-1">
				<DaisyUiInputField
					id="vital-height"
					bind:value={height}
					inputType="number"
					inputPlaceholderText="e.g. 170"
					min="0"
					step="any"
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel
				forText="vital-weight"
				className="shrink-0 sm:w-36">Weight (kg)</DaisyUiLabel
			>
			<div class="max-w-80 flex-1">
				<DaisyUiInputField
					id="vital-weight"
					bind:value={weight}
					inputType="number"
					inputPlaceholderText="e.g. 70"
					min="0"
					step="any"
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="vital-temp" className="shrink-0 sm:w-36"
				>Temperature (°C)</DaisyUiLabel
			>
			<div class="max-w-80 flex-1">
				<DaisyUiInputField
					id="vital-temp"
					bind:value={temperature}
					inputType="number"
					inputPlaceholderText={getVitalPlaceholder('temperature')}
					min="0"
					step="any"
					className={vitalInputClass(temperature, 'temperature')}
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel
				forText="vital-bp-sys"
				className="shrink-0 sm:w-36">BP Systolic (mmHg)</DaisyUiLabel
			>
			<div class="max-w-80 flex-1">
				<DaisyUiInputField
					id="vital-bp-sys"
					bind:value={bpSystolic}
					inputType="number"
					inputPlaceholderText={getVitalPlaceholder('bpSystolic')}
					min="0"
					step="any"
					className={vitalInputClass(bpSystolic, 'bpSystolic')}
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel
				forText="vital-bp-dia"
				className="shrink-0 sm:w-36">BP Diastolic (mmHg)</DaisyUiLabel
			>
			<div class="max-w-80 flex-1">
				<DaisyUiInputField
					id="vital-bp-dia"
					bind:value={bpDiastolic}
					inputType="number"
					inputPlaceholderText={getVitalPlaceholder('bpDiastolic')}
					min="0"
					step="any"
					className={vitalInputClass(bpDiastolic, 'bpDiastolic')}
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="vital-pulse" className="shrink-0 sm:w-36"
				>Pulse (bpm)</DaisyUiLabel
			>
			<div class="max-w-80 flex-1">
				<DaisyUiInputField
					id="vital-pulse"
					bind:value={pulse}
					inputType="number"
					inputPlaceholderText={getVitalPlaceholder('pulse')}
					min="0"
					step="any"
					className={vitalInputClass(pulse, 'pulse')}
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="vital-resp" className="shrink-0 sm:w-36"
				>Respiration (/min)</DaisyUiLabel
			>
			<div class="max-w-80 flex-1">
				<DaisyUiInputField
					id="vital-resp"
					bind:value={respiration}
					inputType="number"
					inputPlaceholderText={getVitalPlaceholder('respiration')}
					min="0"
					step="any"
					className={vitalInputClass(respiration, 'respiration')}
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="vital-spo2" className="shrink-0 sm:w-36"
				>SpO₂ (%)</DaisyUiLabel
			>
			<div class="max-w-80 flex-1">
				<DaisyUiInputField
					id="vital-spo2"
					bind:value={spO2}
					inputType="number"
					inputPlaceholderText={getVitalPlaceholder('spO2')}
					min="0"
					max="100"
					step="any"
					className={vitalInputClass(spO2, 'spO2')}
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="vital-rbs" className="shrink-0 sm:w-36"
				>RBS (mg/dL)</DaisyUiLabel
			>
			<div class="max-w-80 flex-1">
				<DaisyUiInputField
					id="vital-rbs"
					bind:value={rbs}
					inputType="number"
					inputPlaceholderText={getVitalPlaceholder('rbs')}
					min="0"
					step="any"
					className={vitalInputClass(rbs, 'rbs')}
				/>
			</div>
		</div>
	</div>

	<DaisyUiDivider position="horizontal" className="my-2 text-xs">
		Notes
	</DaisyUiDivider>

	<div
		class="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3"
	>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
		>
			<DaisyUiLabel
				forText="vital-symptom"
				className="shrink-0 sm:w-36">Symptom</DaisyUiLabel
			>
			<div class="min-w-0 flex-1">
				<DaisyUiTextarea
					id="vital-symptom"
					bind:value={symptom}
					placeholder="symptoms"
					className="w-full min-h-20 resize-y"
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
		>
			<DaisyUiLabel
				forText="vital-description"
				className="shrink-0 sm:w-36">Description</DaisyUiLabel
			>
			<div class="min-w-0 flex-1">
				<DaisyUiTextarea
					id="vital-description"
					bind:value={description}
					placeholder="Additional notes"
					className="w-full min-h-20 resize-y"
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
		>
			<DaisyUiLabel
				forText="vital-remark"
				className="shrink-0 sm:w-36">Remark</DaisyUiLabel
			>
			<div class="min-w-0 flex-1">
				<DaisyUiTextarea
					id="vital-remark"
					bind:value={remark}
					placeholder="Remarks"
					className="w-full min-h-20 resize-y"
				/>
			</div>
		</div>
	</div>

	<div class="mt-4 flex flex-wrap gap-3">
		<DaisyUiButton
			type="submit"
			className="d-btn-primary d-btn-wide"
			disabled={isSubmitting}
		>
			{isSubmitting
				? 'Saving…'
				: isEditMode
					? 'Update vitals'
					: 'Save vitals'}
		</DaisyUiButton>
		<DaisyUiButton
			type="button"
			className="d-btn-ghost"
			onClick={cancel}
			disabled={isSubmitting}
		>
			Cancel
		</DaisyUiButton>
	</div>
</form>
