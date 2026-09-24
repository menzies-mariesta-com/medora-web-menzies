<script lang="ts">
	/**
	 * Add/edit a pending service-order line (CPOE + nursing order).
	 * Parent injects search/pricing; confirm returns form values for the pending list.
	 */
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';

	export type ServiceOrderPendingLineFilter =
		| 'all'
		| 'radiology'
		| 'laboratory'
		| 'nursing';

	export type ServiceOrderPendingLineInitial = {
		serviceId?: string;
		advisingDoctorId?: string;
		serviceAmount?: string;
		serviceTaxAmount?: string;
		serviceUnit?: string;
		instruction?: string;
		isUrgent?: boolean;
		amountEditable?: boolean;
	};

	export type ServiceOrderPendingLineResult = {
		serviceId: string;
		serviceName: string;
		advisingDoctorId: string;
		advisingDoctorName: string | null;
		serviceAmount: string;
		serviceTaxAmount: string;
		serviceUnit: string;
		instruction: string;
		isUrgent: boolean;
		orderDate: string;
		orderTime: string;
	};

	export type ServiceOrderPendingLinePricing = {
		serviceAmount: string;
		serviceTaxAmount: string;
		amountEditable: boolean;
	};

	let {
		confirm,
		cancel,
		orderDate: orderDateProp = '',
		orderTime: orderTimeProp = '',
		initial = null,
		isEdit = false,
		searchServices,
		getServiceLabelForValue,
		searchDoctors,
		getDoctorLabelForValue,
		loadPricing
	}: DialogSlotProps & {
		orderDate?: string;
		orderTime?: string;
		initial?: ServiceOrderPendingLineInitial | null;
		isEdit?: boolean;
		searchServices: (
			query: string,
			ctx: {
				orderDate: string;
				serviceFilter: ServiceOrderPendingLineFilter;
			}
		) => Promise<{ label: string; value: string }[]>;
		getServiceLabelForValue: (id: string) => Promise<string>;
		searchDoctors: (
			query: string
		) => Promise<{ label: string; value: string }[]>;
		getDoctorLabelForValue: (id: string) => Promise<string>;
		loadPricing: (
			serviceId: string,
			orderDate: string
		) => Promise<ServiceOrderPendingLinePricing>;
	} = $props();

	const toastService = new ToastService();

	let orderDateInput = $state(orderDateProp);
	let orderTimeInput = $state(orderTimeProp);
	let serviceFilter = $state<ServiceOrderPendingLineFilter>('all');
	let detailServiceIdInput = $state(initial?.serviceId ?? '');
	let detailAdvisingDoctorIdInput = $state(
		initial?.advisingDoctorId ?? ''
	);
	let detailServiceAmountInput = $state(initial?.serviceAmount ?? '');
	let detailServiceTaxAmountInput = $state(
		initial?.serviceTaxAmount ?? ''
	);
	let detailServiceUnitInput = $state(initial?.serviceUnit ?? '1');
	let detailInstructionInput = $state(initial?.instruction ?? '');
	let detailIsUrgentInput = $state(initial?.isUrgent ?? false);
	let detailAmountEditable = $state(initial?.amountEditable ?? true);
	let isSubmitting = $state(false);
	/** Skip clear on first bind of serviceFilter. */
	let serviceFilterReady = $state(false);

	function clearLineFields() {
		detailServiceIdInput = '';
		detailAdvisingDoctorIdInput = '';
		detailServiceAmountInput = '';
		detailServiceTaxAmountInput = '';
		detailServiceUnitInput = '1';
		detailInstructionInput = '';
		detailIsUrgentInput = false;
		detailAmountEditable = true;
	}

	$effect(() => {
		void serviceFilter;
		if (!serviceFilterReady) {
			serviceFilterReady = true;
			return;
		}
		clearLineFields();
	});

	async function searchServicesBound(query: string) {
		return searchServices(query, {
			orderDate: orderDateInput,
			serviceFilter
		});
	}

	async function applyPricing() {
		if (!detailServiceIdInput) return;
		try {
			const pricing = await loadPricing(
				detailServiceIdInput,
				orderDateInput
			);
			detailServiceAmountInput = pricing.serviceAmount;
			detailServiceTaxAmountInput = pricing.serviceTaxAmount;
			detailAmountEditable = pricing.amountEditable;
		} catch {
			detailAmountEditable = true;
		}
	}

	async function handleConfirm() {
		if (isSubmitting) return;
		const serviceId = detailServiceIdInput.trim();
		if (!serviceId) {
			toastService.addToast(
				'Please choose a service.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const unit = Number(detailServiceUnitInput);
		if (!Number.isFinite(unit) || unit < 1) {
			toastService.addToast(
				'Unit must be at least 1.',
				StatusColorEnum.ERROR
			);
			return;
		}

		isSubmitting = true;
		try {
			const [serviceName, advisingDoctorName] = await Promise.all([
				getServiceLabelForValue(serviceId),
				detailAdvisingDoctorIdInput.trim()
					? getDoctorLabelForValue(detailAdvisingDoctorIdInput.trim())
					: Promise.resolve(null)
			]);
			const payload: ServiceOrderPendingLineResult = {
				serviceId,
				serviceName,
				advisingDoctorId: detailAdvisingDoctorIdInput.trim(),
				advisingDoctorName,
				serviceAmount: detailServiceAmountInput,
				serviceTaxAmount: detailServiceTaxAmountInput,
				serviceUnit: detailServiceUnitInput,
				instruction: detailInstructionInput,
				isUrgent: detailIsUrgentInput,
				orderDate: orderDateInput,
				orderTime: orderTimeInput
			};
			await confirm(payload);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
	<div class="flex flex-wrap items-end gap-4 text-sm">
		<label class="flex flex-col gap-1">
			<span class="font-medium">Order Date</span>
			<WashInputField
				bind:value={orderDateInput}
				inputType="date"
				className="input-sm w-40"
			/>
		</label>
		<label class="flex flex-col gap-1">
			<span class="font-medium">Order Time</span>
			<input
				type="time"
				class="input-bordered input input-sm w-32"
				bind:value={orderTimeInput}
			/>
		</label>
	</div>

	<div class="flex flex-wrap items-center gap-6">
		<span class="text-sm font-medium">Service Type</span>
		<label class="flex cursor-pointer items-center gap-2">
			<input
				type="radio"
				name="serviceTypeDialog"
				class="radio cursor-pointer"
				value="all"
				bind:group={serviceFilter}
			/>
			<span class="text-sm">All Services</span>
		</label>
		<label class="flex cursor-pointer items-center gap-2">
			<input
				type="radio"
				name="serviceTypeDialog"
				class="radio cursor-pointer"
				value="radiology"
				bind:group={serviceFilter}
			/>
			<span class="text-sm">Radiology</span>
		</label>
		<label class="flex cursor-pointer items-center gap-2">
			<input
				type="radio"
				name="serviceTypeDialog"
				class="radio cursor-pointer"
				value="laboratory"
				bind:group={serviceFilter}
			/>
			<span class="text-sm">Laboratory</span>
		</label>
		<label class="flex cursor-pointer items-center gap-2">
			<input
				type="radio"
				name="serviceTypeDialog"
				class="radio cursor-pointer"
				value="nursing"
				bind:group={serviceFilter}
			/>
			<span class="text-sm">Nursing</span>
		</label>
	</div>

	<div
		class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
	>
		<label class="flex min-w-0 flex-col gap-1 text-sm">
			Service Name
			<SearchSelect
				bind:value={detailServiceIdInput}
				placeholder="Select service"
				searchFn={searchServicesBound}
				getLabelForValue={getServiceLabelForValue}
				invalidateKey={`${serviceFilter}:${orderDateInput}`}
				minSearchLength={0}
				onChange={async () => {
					detailServiceAmountInput = '';
					detailServiceTaxAmountInput = '';
					detailServiceUnitInput = '1';
					await applyPricing();
				}}
			/>
		</label>
		<label class="flex min-w-0 flex-col gap-1 text-sm">
			Order by (Adv Dr.)
			<SearchSelect
				bind:value={detailAdvisingDoctorIdInput}
				placeholder="Select doctor"
				className="w-full"
				searchFn={searchDoctors}
				getLabelForValue={getDoctorLabelForValue}
				minSearchLength={0}
			/>
		</label>
		<label class="flex min-w-0 flex-col gap-1 text-sm">
			Unit
			<input
				type="number"
				step="1"
				min="1"
				class="input-bordered input w-full"
				bind:value={detailServiceUnitInput}
			/>
		</label>
		<label class="flex min-w-0 flex-col gap-1 text-sm">
			Service Amount
			<input
				type="number"
				step="0.01"
				class="input-bordered input w-full"
				bind:value={detailServiceAmountInput}
				disabled={!detailAmountEditable}
			/>
		</label>
		<label class="flex min-w-0 flex-col gap-1 text-sm">
			Tax Amount
			<input
				type="number"
				step="0.01"
				class="input-bordered input w-full"
				bind:value={detailServiceTaxAmountInput}
				disabled
			/>
		</label>
		<div class="flex min-w-0 items-end pb-2">
			<label class="flex cursor-pointer items-center gap-2 text-sm">
				<input
					type="checkbox"
					class="checkbox cursor-pointer"
					bind:checked={detailIsUrgentInput}
				/>
				<span>Urgent</span>
			</label>
		</div>
	</div>

	<label class="flex min-w-0 flex-col gap-1 text-sm">
		Order Instruction
		<textarea
			class="textarea-bordered textarea w-full"
			rows="2"
			bind:value={detailInstructionInput}
		></textarea>
	</label>

	<div class="flex flex-wrap justify-end gap-2">
		<WashButton
			type="button"
			className="btn-ghost"
			disabled={isSubmitting}
			onClick={cancel}
		>
			{m.cancel()}
		</WashButton>
		<WashButton
			type="button"
			className="btn-primary"
			disabled={isSubmitting}
			loading={isSubmitting}
			onClick={handleConfirm}
		>
			{isEdit ? m.cpoe_order_update_in_list() : m.cpoe_order_add_to_list()}
		</WashButton>
	</div>
</div>
