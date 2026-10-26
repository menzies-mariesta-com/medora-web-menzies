<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashDialog from '$lib/component/wash/dialog/WashDialog.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import OtStatusBadge from '$lib/component/own/local/private/medora/operation-theatre/OtStatusBadge.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import {
		BillingStatusTaggingEnum,
		OtBookingStatusTaggingEnum
	} from '$lib/model/enum/db-link';
	import type {
		OtBillingCase,
		OtBillingContext
	} from '$lib/model/type/medora/operation-theatre.type';
	import {
		formatOtDate,
		formatOtTime
	} from '$lib/tool/operation-theatre/ot-status.util';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';

	const toast = new ToastService();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/billing/ot-billing`
			: ''
	);
	const visitId = $derived(String(VisitState.visitId ?? '').trim());

	let context = $state<OtBillingContext | null>(null);
	let loading = $state(false);
	let submitting = $state(false);
	let dialog = $state<'sign' | 'discount' | null>(null);
	let selectedCase = $state<OtBillingCase | null>(null);
	let lastLoadedVisitId = '';

	let procedureForm = $state({
		procedure_performed: '',
		findings: '',
		complications: '',
		specimens: '',
		post_op_plan: ''
	});
	let discountForm = $state({
		discountTypeId: '2',
		discountPercent: '0',
		discountAmount: '0'
	});

	const discountOptions = [
		{ value: '1', label: 'No discount' },
		{ value: '2', label: 'Percentage' },
		{ value: '3', label: 'Fixed amount' }
	];

	const postOpCases = $derived(
		(context?.cases ?? []).filter(
			(c) =>
				c.statusTaggingId === OtBookingStatusTaggingEnum.POST_OP
		)
	);
	const signedCount = $derived(
		postOpCases.filter((c) => c.procedureSignedAt).length
	);
	const allSigned = $derived(
		postOpCases.length > 0 && signedCount === postOpCases.length
	);
	const transferred = $derived(
		Boolean(context?.bill && context.lines.length > 0)
	);
	const billClosed = $derived(
		context?.bill?.statusTaggingId === BillingStatusTaggingEnum.CLOSED
	);
	const discharged = $derived(Boolean(context?.dischargedAt));

	const steps = $derived([
		{
			label: 'OT completed',
			done: postOpCases.length > 0,
			detail: postOpCases.length
				? `${postOpCases.length} completed case(s)`
				: 'Awaiting post-op'
		},
		{
			label: 'Procedure signed',
			done: allSigned,
			detail: postOpCases.length
				? `${signedCount}/${postOpCases.length} signed`
				: 'No completed case'
		},
		{
			label: 'Charges transferred',
			done: transferred,
			detail: transferred
				? `${context?.lines.length ?? 0} line(s)`
				: 'Not transferred'
		},
		{
			label: 'OT bill closed',
			done: billClosed,
			detail: billClosed ? 'Closed' : 'Open / pending'
		},
		{
			label: 'Patient discharged',
			done: discharged,
			detail: discharged ? 'Discharged' : 'Pending'
		}
	]);

	function dt(value: string | null | undefined) {
		if (!value) return '—';
		return `${formatOtDate(value)} ${formatOtTime(value)}`;
	}

	function resetProcedureForm() {
		procedureForm = {
			procedure_performed: '',
			findings: '',
			complications: '',
			specimens: '',
			post_op_plan: ''
		};
	}

	function openSign(row: OtBillingCase) {
		selectedCase = row;
		resetProcedureForm();
		const note = row.procedureNote ?? {};
		procedureForm = {
			procedure_performed: String(note.procedure_performed ?? ''),
			findings: String(note.findings ?? ''),
			complications: String(note.complications ?? ''),
			specimens: String(note.specimens ?? ''),
			post_op_plan: String(note.post_op_plan ?? '')
		};
		dialog = 'sign';
	}

	function openDiscount() {
		discountForm = {
			discountTypeId: String(context?.bill?.discountTypeId ?? 2),
			discountPercent: String(context?.bill?.discountPercent ?? '0'),
			discountAmount: String(context?.bill?.discountAmount ?? '0')
		};
		dialog = 'discount';
	}

	async function load(force = false) {
		if (!apiBase || !visitId) {
			context = null;
			lastLoadedVisitId = '';
			return;
		}
		if (!force && lastLoadedVisitId === visitId) return;
		loading = true;
		try {
			const res = await fetch(
				`${apiBase}?visitId=${encodeURIComponent(visitId)}`
			);
			if (!res.ok) await throwUserFacingHttpError(res);
			context = (await res.json()) as OtBillingContext;
			lastLoadedVisitId = visitId;
		} catch (err) {
			toast.addErrorToast('Could not load OT billing', err);
			context = null;
		} finally {
			loading = false;
		}
	}

	async function postAction(payload: Record<string, unknown>) {
		if (!apiBase || !visitId) return;
		submitting = true;
		try {
			const res = await fetch(apiBase, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ visitId, ...payload })
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			return await res.json();
		} finally {
			submitting = false;
		}
	}

	async function signProcedure() {
		if (!selectedCase) return;
		if (!procedureForm.procedure_performed.trim()) {
			toast.addErrorToast('Procedure performed is required.');
			return;
		}
		if (!procedureForm.findings.trim()) {
			toast.addErrorToast('Operative findings are required.');
			return;
		}
		try {
			const result = await postAction({
				action: 'sign_procedure',
				caseId: selectedCase.id,
				valuesJson: procedureForm
			});
			context = result as OtBillingContext;
			toast.addSuccessToast('OT procedure signed.');
			dialog = null;
			selectedCase = null;
		} catch (err) {
			toast.addErrorToast('Could not sign the OT procedure', err);
		}
	}

	async function transferCharges() {
		try {
			await postAction({ action: 'transfer' });
			toast.addSuccessToast('OT charges transferred to the bill.');
			await load(true);
		} catch (err) {
			toast.addErrorToast('Could not transfer OT charges', err);
		}
	}

	async function applyDiscount() {
		try {
			context = (await postAction({
				action: 'discount',
				discountTypeId: Number(discountForm.discountTypeId),
				discountPercent: Number(discountForm.discountPercent || '0'),
				discountAmount: Number(discountForm.discountAmount || '0')
			})) as OtBillingContext;
			toast.addSuccessToast('Discount updated.');
			dialog = null;
		} catch (err) {
			toast.addErrorToast('Could not update the discount', err);
		}
	}

	async function closeBill() {
		try {
			context = (await postAction({
				action: 'close'
			})) as OtBillingContext;
			toast.addSuccessToast('OT bill closed.');
		} catch (err) {
			toast.addErrorToast('Could not close the OT bill', err);
		}
	}

	async function dischargePatient() {
		if (!context?.admissionId) return;
		try {
			await postAction({
				action: 'discharge',
				admissionId: context.admissionId
			});
			toast.addSuccessToast('Patient discharged.');
			await load(true);
		} catch (err) {
			toast.addErrorToast(
				'Could not discharge the patient. Ensure the discharge summary is signed.',
				err
			);
		}
	}

	$effect(() => {
		void load();
	});
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
	<div class="flex flex-wrap items-start justify-between gap-2">
		<div>
			<h1 class="text-xl font-bold">OT Billing</h1>
			<p class="text-sm opacity-70">
				Transfer completed OT procedure charges, close the bill and
				discharge the patient.
			</p>
		</div>
		{#if context}
			<WashButton
				variant="ghost"
				size="sm"
				className="cursor-pointer"
				onClick={() => load(true)}
			>
				Refresh
			</WashButton>
		{/if}
	</div>

	{#if !visitId}
		<WashCard>
			<WashCardBody>
				<div class="flex flex-col items-center gap-2 py-12 text-center">
					<p class="font-semibold">Select an encounter</p>
					<p class="max-w-lg text-sm opacity-70">
						Use the encounter selector above. OT billing is available
						after the OT procedure is completed and signed by the
						surgeon.
					</p>
				</div>
			</WashCardBody>
		</WashCard>
	{:else if loading}
		<div class="flex items-center justify-center py-12">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if context}
		<WashCard>
			<WashCardBody className="gap-3">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<WashCardBodyTitle className="text-secondary"
							>{context.patientName}</WashCardBodyTitle
						>
						<p class="text-sm opacity-75">
							{context.hrn ?? '—'} · {context.ageGender} ·
							{context.visitNo ?? '—'}
						</p>
					</div>
					<div class="text-right text-sm">
						<p class="font-semibold">
							{context.admissionNo
								? `Admission ${context.admissionNo}`
								: 'OPD encounter'}
						</p>
						<p class="opacity-75">
							{context.wardName ?? '—'} / {context.bedNo ?? '—'}
						</p>
						<p class="opacity-75">
							Admitted: {dt(context.admittedAt)}
						</p>
					</div>
				</div>

				<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
					{#each steps as step, index (step.label)}
						<div
							class="rounded-box border p-2 {step.done
								? 'border-success/40 bg-success/10'
								: 'border-base-300 bg-base-200/40'}"
						>
							<p class="text-xs opacity-60">Step {index + 1}</p>
							<p class="font-semibold">{step.label}</p>
							<p class="text-xs opacity-70">{step.detail}</p>
						</div>
					{/each}
				</div>
			</WashCardBody>
		</WashCard>

		<WashCard>
			<WashCardBody className="gap-3">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<WashCardBodyTitle className="text-secondary"
						>OT procedures</WashCardBodyTitle
					>
					<div class="flex flex-wrap gap-2">
						<WashButton
							variant="primary"
							size="sm"
							className="cursor-pointer"
							disabled={!context.canTransfer || submitting}
							onClick={transferCharges}
						>
							{context.bill?.id
								? 'Transfer remaining charges'
								: 'Transfer charges to bill'}
						</WashButton>
						<WashButton
							variant="secondary"
							size="sm"
							className="cursor-pointer"
							disabled={!context.bill || billClosed || submitting}
							onClick={openDiscount}
						>
							Discount
						</WashButton>
						<WashButton
							variant="success"
							size="sm"
							className="cursor-pointer"
							disabled={!context.canClose || submitting}
							onClick={closeBill}
						>
							Close OT bill
						</WashButton>
						<WashButton
							variant="warning"
							size="sm"
							className="cursor-pointer"
							disabled={!context.canDischarge || submitting}
							onClick={dischargePatient}
						>
							Discharge patient
						</WashButton>
					</div>
				</div>

				{#if context.blockReasons.length > 0}
					<div class="rounded-box bg-base-200/60 p-2 text-xs opacity-80">
						{#each context.blockReasons as reason (reason)}
							<p>• {reason}</p>
						{/each}
					</div>
				{/if}

				<div class="overflow-x-auto">
					<table class="table table-sm">
						<thead>
							<tr>
								<th>Procedure</th>
								<th>Theatre</th>
								<th>OT date</th>
								<th>Surgeon</th>
								<th>Status</th>
								<th>Procedure note</th>
								<th>Amount</th>
								<th>Billed</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each context.cases as row (row.id)}
								<tr>
									<td>
										<p class="font-semibold">{row.procedureName || '—'}</p>
										<p class="text-xs opacity-60">{row.bookingNo ?? '—'}</p>
									</td>
									<td>{row.theatreName ?? '—'}</td>
									<td>
										{formatOtDate(row.otDate)}
										<p class="text-xs opacity-60">
											{formatOtTime(row.scheduledStart)}
										</p>
									</td>
									<td>{row.surgeonName ?? '—'}</td>
									<td>
										<OtStatusBadge
											statusId={row.statusTaggingId}
											label={row.statusName}
										/>
									</td>
									<td>
										{#if row.procedureSignedAt}
											<span class="badge badge-success badge-sm"
												>Signed</span
											>
											<p class="text-xs opacity-60">
												{dt(row.procedureSignedAt)}
											</p>
										{:else}
											<span class="badge badge-ghost badge-sm"
												>Not signed</span
											>
										{/if}
									</td>
									<td>{row.serviceAmount}</td>
									<td>
										{#if row.alreadyBilled}
											<span class="badge badge-info badge-sm"
												>Billed</span
											>
										{:else}
											<span class="text-xs opacity-60">—</span>
										{/if}
									</td>
									<td class="text-right">
										{#if row.statusTaggingId ===
											OtBookingStatusTaggingEnum.POST_OP &&
											!row.procedureSignedAt &&
											!billClosed}
											<WashButton
												variant="ghost"
												size="xs"
												className="cursor-pointer"
												onClick={() => openSign(row)}
											>
												Sign procedure
											</WashButton>
										{/if}
									</td>
								</tr>
							{:else}
								<tr>
									<td colspan="9" class="text-center opacity-60"
										>No OT cases for this encounter.</td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</WashCardBody>
		</WashCard>

		<WashCard>
			<WashCardBody className="gap-3">
				<WashCardBodyTitle className="text-secondary"
					>OT bill</WashCardBodyTitle
				>
				{#if context.bill}
					<div class="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
						<div>
							<p class="text-xs opacity-60">Bill no</p>
							<p class="font-semibold">{context.bill.billNo ?? '—'}</p>
						</div>
						<div>
							<p class="text-xs opacity-60">Status</p>
							<p>{context.bill.statusName ?? '—'}</p>
						</div>
						<div>
							<p class="text-xs opacity-60">Subtotal</p>
							<p>{context.bill.linesSubtotal}</p>
						</div>
						<div>
							<p class="text-xs opacity-60">Discount</p>
							<p>{context.bill.discountAmount}</p>
						</div>
						<div>
							<p class="text-xs opacity-60">Total</p>
							<p class="font-bold">{context.bill.totalAmount}</p>
						</div>
						<div>
							<p class="text-xs opacity-60">Closed</p>
							<p>{dt(context.bill.closedAt)}</p>
						</div>
					</div>
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr>
									<th>Service</th>
									<th>Amount</th>
									<th>Tax</th>
									<th>Qty</th>
									<th>Total</th>
								</tr>
							</thead>
							<tbody>
								{#each context.lines as line (line.id)}
									<tr>
										<td>{line.serviceName ?? '—'}</td>
										<td>{line.serviceAmount}</td>
										<td>{line.serviceTaxAmount}</td>
										<td>{line.quantity}</td>
										<td>{line.lineTotal}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="text-sm opacity-70">
						No OT bill yet. Sign all completed procedures, then transfer
						charges.
					</p>
				{/if}
			</WashCardBody>
		</WashCard>

		{#if discharged}
			<div class="alert alert-success text-sm">
				Patient discharged {dt(context.dischargedAt)}.
			</div>
		{/if}
	{:else}
		<WashCard>
			<WashCardBody>
				<p class="py-8 text-center text-sm opacity-70">
					No OT billing data is available for this encounter.
				</p>
			</WashCardBody>
		</WashCard>
	{/if}
</div>

<WashDialog
	open={dialog === 'sign'}
	onClose={() => (dialog = null)}
	title="Sign OT procedure"
	description={selectedCase?.patientName ?? 'OT procedure note'}
	showActions={false}
>
	<div class="grid gap-3">
		<label class="form-control min-w-0">
			<span class="label-text text-xs">Procedure performed *</span>
			<textarea
				class="textarea textarea-sm w-full"
				rows="3"
				bind:value={procedureForm.procedure_performed}
			></textarea>
		</label>
		<label class="form-control min-w-0">
			<span class="label-text text-xs">Operative findings *</span>
			<textarea
				class="textarea textarea-sm w-full"
				rows="3"
				bind:value={procedureForm.findings}
			></textarea>
		</label>
		<label class="form-control min-w-0">
			<span class="label-text text-xs">Complications / blood loss</span>
			<textarea
				class="textarea textarea-sm w-full"
				rows="2"
				bind:value={procedureForm.complications}
			></textarea>
		</label>
		<label class="form-control min-w-0">
			<span class="label-text text-xs">Specimens sent</span>
			<WashInputField
				className="input-sm"
				bind:value={procedureForm.specimens}
			/>
		</label>
		<label class="form-control min-w-0">
			<span class="label-text text-xs">Post-operative plan</span>
			<textarea
				class="textarea textarea-sm w-full"
				rows="2"
				bind:value={procedureForm.post_op_plan}
			></textarea>
		</label>
		<WashDialogFooter>
			<WashButton
				variant="ghost"
				size="sm"
				className="cursor-pointer"
				onClick={() => (dialog = null)}>Cancel</WashButton
			>
			<WashButton
				variant="primary"
				size="sm"
				className="cursor-pointer"
				disabled={submitting}
				onClick={signProcedure}>Sign & save</WashButton
			>
		</WashDialogFooter>
	</div>
</WashDialog>

<WashDialog
	open={dialog === 'discount'}
	onClose={() => (dialog = null)}
	title="OT bill discount"
	showActions={false}
>
	<div class="grid gap-3">
		<label class="form-control min-w-0">
			<span class="label-text text-xs">Discount type</span>
			<WashSelect
				className="select-sm"
				bind:value={discountForm.discountTypeId}
				options={discountOptions}
			/>
		</label>
		{#if discountForm.discountTypeId === '2'}
			<label class="form-control min-w-0">
				<span class="label-text text-xs">Discount percent</span>
				<WashInputField
					className="input-sm"
					inputType="number"
					min="0"
					max="100"
					bind:value={discountForm.discountPercent}
				/>
			</label>
		{:else if discountForm.discountTypeId === '3'}
			<label class="form-control min-w-0">
				<span class="label-text text-xs">Discount amount</span>
				<WashInputField
					className="input-sm"
					inputType="number"
					min="0"
					bind:value={discountForm.discountAmount}
				/>
			</label>
		{/if}
		<WashDialogFooter>
			<WashButton
				variant="ghost"
				size="sm"
				className="cursor-pointer"
				onClick={() => (dialog = null)}>Cancel</WashButton
			>
			<WashButton
				variant="primary"
				size="sm"
				className="cursor-pointer"
				disabled={submitting}
				onClick={applyDiscount}>Apply discount</WashButton
			>
		</WashDialogFooter>
	</div>
</WashDialog>
