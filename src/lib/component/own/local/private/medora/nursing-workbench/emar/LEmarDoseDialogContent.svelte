/**
 * BCMA administration dialog: the scan step for one due dose, plus the
 * hold/refuse branch that forces a reason code.
 *
 * The page owns submitting; this component only collects input and reports the
 * chosen outcome, so the same dialog serves the grid cells and the PRN list.
 */
<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { MedicationHoldReasonEnum } from '$lib/model/enum/clinical-platform.enum';
	import type { EmarBedLocation } from '$lib/model/type/medora/clinical-platform.type';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialog from '$lib/component/wash/dialog/WashDialog.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import { emarReasonOptions } from '$lib/tool/nursing/emar-reason.util';
	import type { MarLine } from '$lib/tool/nursing/emar-mar.util';
	import { formatMenziesTableDateTime } from '$lib/util/menzies-table-datetime.util';

	const msg = m as Record<string, (inputs?: object) => string>;

	export type EmarDoseOutcome =
		| { status: 'given' }
		| { status: 'held' | 'refused'; reasonCode: MedicationHoldReasonEnum };

	const reasonOptions = emarReasonOptions(msg);

	let {
		open,
		line,
		bedLocation,
		patientLabel,
		visitNo,
		scheduledAt = null,
		patientToken = $bindable(''),
		productBarcode = $bindable(''),
		nurseCode = $bindable(''),
		isSubmitting,
		onClose,
		onSubmit
	} = $props<{
		open: boolean;
		line: Pick<
			MarLine,
			'itemName' | 'doseText' | 'routeName' | 'isStat'
		>;
		bedLocation: EmarBedLocation | null;
		patientLabel: string;
		visitNo: string | null;
		/** Null for PRN / infusion lines that have no fixed due instant. */
		scheduledAt?: string | null;
		patientToken?: string;
		productBarcode?: string;
		nurseCode?: string;
		isSubmitting: boolean;
		onClose: () => void;
		onSubmit: (outcome: EmarDoseOutcome) => void;
	}>();

	let reasonCode = $state('');
	const canConfirm = $derived(
		!isSubmitting &&
			patientToken.trim() !== '' &&
			productBarcode.trim() !== '' &&
			nurseCode.trim() !== ''
	);
	const canHold = $derived(!isSubmitting && reasonCode !== '');

	const bedLabel = $derived(
		bedLocation
			? [bedLocation.wardName, bedLocation.roomName, bedLocation.bedName]
					.filter(Boolean)
					.join(' · ')
			: msg.emar_no_bed()
	);

	function submit(status: 'given' | 'held') {
		if (status === 'given') {
			if (!canConfirm) return;
			onSubmit({ status: 'given' });
			return;
		}
		if (!canHold) return;
		// "Patient refused" is the only reason that is a refusal, not a hold.
		onSubmit({
			status:
				reasonCode === MedicationHoldReasonEnum.PATIENT_REFUSED
					? 'refused'
					: 'held',
			reasonCode: reasonCode as MedicationHoldReasonEnum
		});
	}
</script>

{#if open}
	<WashDialog
		id="lemar-dose-dialog"
		open={true}
		{onClose}
		title={msg.emar_dose_dialog_title({ drug: line.itemName })}
		description={msg.emar_dose_dialog_description()}
		showActions={false}
		boxClassName="w-[min(40rem,calc(100vw-2rem))]"
	>
		<div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-1">
			<dl class="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
				<dt class="opacity-60">{m.entity_patient()}</dt>
				<dd class="font-medium">{patientLabel}</dd>
				<dt class="opacity-60">{m.entity_visit()}</dt>
				<dd class="font-medium">{visitNo ?? '—'}</dd>
				<dt class="opacity-60">{msg.emar_bed_location()}</dt>
				<dd class="font-medium">{bedLabel}</dd>
				<dt class="opacity-60">{msg.emar_col_medication()}</dt>
				<dd class="font-medium">
					{line.itemName}
					{#if line.isStat}
						<span class="badge badge-error badge-sm ml-1">
							{msg.emar_dose_stat()}
						</span>
					{/if}
				</dd>
				<dt class="opacity-60">{msg.emar_col_dose()}</dt>
				<dd class="font-medium">
					{line.doseText}
					{#if line.routeName}
						<span class="opacity-60"> · {line.routeName}</span>
					{/if}
				</dd>
				{#if scheduledAt}
					<dt class="opacity-60">{msg.emar_col_schedule()}</dt>
					<dd class="font-medium">
						{formatMenziesTableDateTime(scheduledAt, '—')}
					</dd>
				{/if}
			</dl>

			<div class="flex flex-col gap-2">
				<label class="flex flex-col gap-1 text-sm" for="emar-scan-patient">
					{msg.clinical_scan_patient()}
					<WashInputField
						id="emar-scan-patient"
						className="input-lg"
						bind:value={patientToken}
					/>
				</label>
				<label class="flex flex-col gap-1 text-sm" for="emar-scan-product">
					{msg.clinical_scan_product()}
					<WashInputField
						id="emar-scan-product"
						className="input-lg"
						bind:value={productBarcode}
					/>
				</label>
				<label class="flex flex-col gap-1 text-sm" for="emar-scan-nurse">
					{msg.clinical_scan_nurse()}
					<WashInputField id="emar-scan-nurse" className="input-lg" bind:value={nurseCode} />
				</label>
				<div class="flex flex-col gap-1 text-sm">
					<span>{msg.emar_hold_reason()}</span>
					<WashSelect
						className="select-sm w-full"
						placeholder={msg.emar_hold_reason()}
						options={reasonOptions}
						value={reasonCode}
						onChange={(value) => (reasonCode = value ?? '')}
					/>
				</div>
			</div>
		</div>

		<WashDialogFooter className="flex-wrap gap-2">
			<WashButton variant="ghost" onClick={onClose} disabled={isSubmitting}>
				{m.cancel()}
			</WashButton>
			<WashButton
				variant="warning"
				onClick={() => submit('held')}
				disabled={!canHold}
			>
				{msg.emar_hold_refuse()}
			</WashButton>
			<WashButton
				variant="primary"
				onClick={() => submit('given')}
				disabled={!canConfirm}
			>
				{msg.emar_confirm_administration()}
			</WashButton>
		</WashDialogFooter>
	</WashDialog>
{/if}
