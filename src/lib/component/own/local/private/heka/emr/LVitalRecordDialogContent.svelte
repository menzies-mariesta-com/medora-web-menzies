<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { VitalRecordDialogState } from '$lib/state/vital-record-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { UnitEnum } from '$lib/model/enum/db-link';
	import { VitalEnum } from '$lib/model/enum/vital.enum';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiDivider from '$lib/component/daisyui/divider/DaisyUiDivider.svelte';
	import * as m from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';
	import {
		computeBmiFromCmKg,
		getVitalPlaceholder,
		toNumber,
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
	let bmi = $state('');
	/** When true, height/weight changes do not overwrite the BMI field (manual entry or loaded override). */
	let bmiUserOverridden = $state(false);
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

	function apiBase(): string {
		return hospitalId
			? `/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/vital`
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

	$effect(() => {
		const vid = vitalId;
		if (vid) {
			const base = apiBase();
			if (!base) return;
			apiGet<{ data: any | null }>(`${base}?action=byId&id=${vid}`).then((res) => {
				const v = res.data;
				if (v) {
					height = asStr(v.height);
					weight = asStr(v.weight);
					const hNum = toNumber(v.height);
					const wNum = toNumber(v.weight);
					const calc = computeBmiFromCmKg(hNum, wNum);
					const stored = toNumber(v.bmi);
					if (stored != null) {
						bmi = String(stored);
						bmiUserOverridden =
							calc == null ||
							Math.abs(stored - calc) > 0.051;
					} else if (calc != null) {
						bmi = String(calc);
						bmiUserOverridden = false;
					} else {
						bmi = '';
						bmiUserOverridden = false;
					}
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

	$effect(() => {
		void height;
		void weight;
		if (bmiUserOverridden) return;
		const hNum = toNumber(height);
		const wNum = toNumber(weight);
		const calc = computeBmiFromCmKg(hNum, wNum);
		bmi = calc != null ? String(calc) : '';
	});

	function onBmiManualInput() {
		bmiUserOverridden = true;
	}

	function useCalculatedBmi() {
		bmiUserOverridden = false;
		const hNum = toNumber(height);
		const wNum = toNumber(weight);
		const calc = computeBmiFromCmKg(hNum, wNum);
		bmi = calc != null ? String(calc) : '';
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isSubmitting) return;
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
			asStr(bmi).trim() ||
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
			bmi: parseDecimal(asStr(bmi)) ?? undefined,
			symptom: asStr(symptom).trim() || undefined,
			description: asStr(description).trim() || undefined,
			remark: asStr(remark).trim() || undefined,
			vitalDateTime: parseVitalDateTime(vitalDateTime)
		};
		try {
			const base = apiBase();
			if (!base) throw new Error('Missing hospital context');
			if (isEditMode && vitalId) {
				const res = await fetch(base, {
					method: 'PATCH',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ id: vitalId, ...vitalPayload })
				});
				if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
				toastSuccess(
					toastService,
					m.entity_patient_vital(),
					m.toast_action_updated()
				);
			} else {
				const res = await fetch(base, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						patientId: patientId!,
						visitId: visitId!,
						...vitalPayload
					})
				});
				if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
				toastSuccess(
					toastService,
					m.entity_patient_vital(),
					m.toast_action_saved()
				);
			}
			await confirm({ saved: true });
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
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
		>
			<DaisyUiLabel forText="vital-bmi" className="shrink-0 sm:w-36 pt-2"
				>{m.emr_vital_bmi()}</DaisyUiLabel
			>
			<div
				class="flex min-w-0 max-w-md flex-1 flex-col gap-2 sm:flex-row sm:items-center"
			>
				<DaisyUiInputField
					id="vital-bmi"
					bind:value={bmi}
					inputType="number"
					inputPlaceholderText={getVitalPlaceholder(VitalEnum.BMI)}
					min="0"
					step="any"
					className={vitalInputClass(bmi, VitalEnum.BMI)}
					oninput={onBmiManualInput}
				/>
				<DaisyUiButton
					type="button"
					className="d-btn-ghost d-btn-sm shrink-0 whitespace-nowrap"
					disabled={isSubmitting ||
						!toNumber(height) ||
						!toNumber(weight)}
					onClick={useCalculatedBmi}
				>
					{m.emr_vital_bmi_use_calculated()}
				</DaisyUiButton>
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
					inputPlaceholderText={getVitalPlaceholder(VitalEnum.TEMPERATURE)}
					min="0"
					step="any"
					className={vitalInputClass(temperature, VitalEnum.TEMPERATURE)}
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
					inputPlaceholderText={getVitalPlaceholder(VitalEnum.BP_SYSTOLIC)}
					min="0"
					step="any"
					className={vitalInputClass(bpSystolic, VitalEnum.BP_SYSTOLIC)}
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
					inputPlaceholderText={getVitalPlaceholder(VitalEnum.BP_DIASTOLIC)}
					min="0"
					step="any"
					className={vitalInputClass(bpDiastolic, VitalEnum.BP_DIASTOLIC)}
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
					inputPlaceholderText={getVitalPlaceholder(VitalEnum.PULSE)}
					min="0"
					step="any"
					className={vitalInputClass(pulse, VitalEnum.PULSE)}
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
					inputPlaceholderText={getVitalPlaceholder(VitalEnum.RESPIRATION)}
					min="0"
					step="any"
					className={vitalInputClass(
						respiration,
						VitalEnum.RESPIRATION
					)}
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
					inputPlaceholderText={getVitalPlaceholder(VitalEnum.SP_O2)}
					min="0"
					max="100"
					step="any"
					className={vitalInputClass(spO2, VitalEnum.SP_O2)}
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
					inputPlaceholderText={getVitalPlaceholder(VitalEnum.RBS)}
					min="0"
					step="any"
					className={vitalInputClass(rbs, VitalEnum.RBS)}
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
			loading={isSubmitting}
		>
			{isEditMode ? 'Update vitals' : 'Save vitals'}
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
