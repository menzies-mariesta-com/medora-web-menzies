<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ObservationOrderLineDialogState } from '$lib/state/observation-order-line-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { CategoryEnum, StatusEnum } from '$lib/model/enum/db-link';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import type {
		ServiceItemListRow,
		ServiceTaggingListRow
	} from '$lib/model/type/heka/ui-rows.type';
	import type { StaffWithRelations } from '$lib/model/type/heka/staff.type';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiSearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	const toastService = new ToastService();

	let { confirm, cancel }: DialogSlotProps = $props();

	const visitId = $derived(ObservationOrderLineDialogState.visitId);
	const hospitalId = $derived(
		ObservationOrderLineDialogState.hospitalId
	);
	const branchId = $derived(ObservationOrderLineDialogState.branchId);
	const detailId = $derived(ObservationOrderLineDialogState.detailId);
	const isEdit = $derived(detailId != null);

	let branchTaggings = $state<ServiceTaggingListRow[]>([]);
	let branchServices = $state<ServiceItemListRow[]>([]);
	let serviceFilterSubCategoryIds = $state<{
		radiology: Set<number>;
		nursing: Set<number>;
		laboratory: Set<number>;
	}>({
		radiology: new Set(),
		nursing: new Set(),
		laboratory: new Set()
	});
	let subCatPromise: Promise<void> | null = null;

	let detailServiceIdInput = $state('');
	let detailAdvisingDoctorIdInput = $state('');
	let detailServiceAmountInput = $state('');
	let detailServiceTaxAmountInput = $state('');
	let detailServiceUnitInput = $state('1');
	let detailInstructionInput = $state('');
	let detailIsUrgentInput = $state(false);
	let detailAmountEditable = $state(true);
	let orderDateInput = $state(todayDateString());
	let isSubmitting = $state(false);
	let loadSeq = $state(0);

	type ServiceOrderRow = { id: number; orderNo: string | null };

	type ServiceOrderDetailRow = {
		id: number;
		serviceId: number | null;
		advisingDoctorId: string | null;
		serviceAmount: string | null;
		serviceTaxAmount: string | null;
		serviceUnit: number | null;
		instruction: string | null;
		isUrgent: boolean | null;
	};

	async function apiGet<T>(
		mode: string,
		params?: Record<string, string>
	) {
		const hid = hospitalId;
		if (!hid) throw new Error('Hospital is required');
		const url = new URL(
			`/api/heka/hospital/${hid}/home/consultation/emr`,
			location.origin
		);
		url.searchParams.set('mode', mode);
		if (params) {
			for (const [k, v] of Object.entries(params))
				url.searchParams.set(k, v);
		}
		const res = await fetch(url.toString());
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as T;
	}

	async function apiPost<T>(mode: string, payload: unknown) {
		const hid = hospitalId;
		if (!hid) throw new Error('Hospital is required');
		const res = await fetch(
			`/api/heka/hospital/${hid}/home/consultation/emr`,
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

	function todayDateString(): string {
		const d = new Date();
		const y = d.getFullYear();
		const mo = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${mo}-${day}`;
	}

	function toDateOnly(value: unknown): string | null {
		if (value == null) return null;
		const str = String(value).trim();
		if (!str) return null;
		return str.length >= 10 ? str.slice(0, 10) : null;
	}

	function pickEffectiveTagging(
		taggings: ServiceTaggingListRow[],
		orderDate: string
	): ServiceTaggingListRow | null {
		const normalizedOrderDate =
			toDateOnly(orderDate) ?? todayDateString();
		const dated: Array<{
			tagging: ServiceTaggingListRow;
			date: string;
		}> = [];
		const undated: ServiceTaggingListRow[] = [];
		for (const tagging of taggings) {
			const validDate = toDateOnly(tagging.validDate);
			if (!validDate) {
				undated.push(tagging);
				continue;
			}
			if (validDate <= normalizedOrderDate) {
				dated.push({ tagging, date: validDate });
			}
		}
		if (dated.length > 0) {
			dated.sort((a, b) => {
				if (a.date === b.date) return b.tagging.id - a.tagging.id;
				return b.date.localeCompare(a.date);
			});
			return dated[0].tagging;
		}
		if (undated.length > 0) {
			undated.sort((a, b) => b.id - a.id);
			return undated[0];
		}
		return null;
	}

	function effectiveServiceIdsForOrderDate(
		orderDate: string
	): Set<number> {
		const taggingsByService = new Map<
			number,
			ServiceTaggingListRow[]
		>();
		for (const tagging of branchTaggings) {
			if (tagging.serviceId == null) continue;
			const existing = taggingsByService.get(tagging.serviceId);
			if (existing) existing.push(tagging);
			else taggingsByService.set(tagging.serviceId, [tagging]);
		}
		const effectiveIds = new Set<number>();
		for (const [serviceId, serviceTaggings] of taggingsByService) {
			if (pickEffectiveTagging(serviceTaggings, orderDate)) {
				effectiveIds.add(serviceId);
			}
		}
		return effectiveIds;
	}

	function serviceMatchesFilter(
		service: ServiceItemListRow
	): boolean {
		const subCategoryId = service.subCategoryId;
		if (subCategoryId == null) return false;
		const ids = serviceFilterSubCategoryIds;
		return (
			ids.radiology.has(subCategoryId) ||
			ids.nursing.has(subCategoryId) ||
			ids.laboratory.has(subCategoryId)
		);
	}

	async function ensureServiceFilterSubCategoryIdsLoaded() {
		if (subCatPromise) {
			await subCatPromise;
			return;
		}
		subCatPromise = (async () => {
			const [radiologySubCategories, nursingSubCategories, labSub] =
				await Promise.all([
					apiGet<any[]>('subCategory.byCategory', {
						categoryId: String(CategoryEnum.RADIOLOGY)
					}),
					apiGet<any[]>('subCategory.byCategory', {
						categoryId: String(CategoryEnum.NURSING_PROCEDURE)
					}),
					apiGet<any[]>('subCategory.byCategory', {
						categoryId: String(CategoryEnum.LABORATORY)
					})
				]);
			serviceFilterSubCategoryIds = {
				radiology: new Set(radiologySubCategories.map((s) => s.id)),
				nursing: new Set(nursingSubCategories.map((s) => s.id)),
				laboratory: new Set(labSub.map((s) => s.id))
			};
		})();
		await subCatPromise;
	}

	async function loadBranchServices(hId: string, bId: string) {
		await ensureServiceFilterSubCategoryIdsLoaded();
		const taggings = await apiGet<ServiceTaggingListRow[]>(
			'serviceTagging.list',
			{
				branchId: bId
			}
		);
		branchTaggings = taggings;
		const serviceIds = new Set(
			taggings.map((t) => t.serviceId).filter((id) => id != null)
		);
		if (serviceIds.size === 0) {
			branchServices = [];
			return;
		}
		// We intentionally avoid fetching the full service master list here.
		// Labels are resolved lazily via `serviceItem.get` when needed.
		branchServices = [];
	}

	function parseNumberOrNull(value: string): number | null {
		const trimmed = value.trim();
		if (!trimmed) return null;
		const n = Number(trimmed);
		return Number.isFinite(n) ? n : null;
	}

	function parseDecimalOrNull(
		value: string | number | null | undefined
	): string | null {
		if (value == null) return null;
		const trimmed =
			typeof value === 'string' ? value.trim() : String(value).trim();
		if (!trimmed) return null;
		const n = Number(trimmed);
		if (!Number.isFinite(n)) return null;
		return trimmed;
	}

	async function applyPricingForSelectedService() {
		const bId = branchId;
		if (!bId) return;
		const serviceId = parseNumberOrNull(detailServiceIdInput);
		if (!serviceId) return;
		try {
			const taggings = await apiGet<ServiceTaggingListRow[]>(
				'serviceTagging.list',
				{
					branchId: bId,
					serviceId: String(serviceId)
				}
			);
			const t = pickEffectiveTagging(taggings, orderDateInput);
			if (!t) {
				detailServiceAmountInput = '';
				detailServiceTaxAmountInput = '';
				detailAmountEditable = true;
				return;
			}
			detailServiceAmountInput =
				t.serviceAmount != null ? String(t.serviceAmount) : '';
			detailServiceTaxAmountInput =
				t.serviceTaxAmount != null ? String(t.serviceTaxAmount) : '';
			detailAmountEditable = t.allowEdit ?? true;
		} catch {
			detailAmountEditable = true;
		}
	}

	async function searchDoctors(
		query: string
	): Promise<{ label: string; value: string }[]> {
		const hid = hospitalId;
		if (!hid) return [];
		const res = await apiGet<{ data: StaffWithRelations[] }>(
			'doctor.search',
			{
				search: query.trim(),
				page: '1',
				pageSize: String(AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT)
			}
		);
		return res.data.map((staff: StaffWithRelations) => ({
			label: StringUtil.doctorOptionDisplayName(staff),
			value: String(staff.id)
		}));
	}

	async function getDoctorLabelForValue(id: string): Promise<string> {
		const staff = await apiGet<StaffWithRelations | null>(
			'staff.get',
			{
				id
			}
		);
		if (!staff) return '';
		return StringUtil.doctorOptionDisplayName(staff);
	}

	async function searchServices(
		query: string
	): Promise<{ label: string; value: string }[]> {
		const hid = hospitalId;
		const bId = branchId;
		if (!hid || !bId) return [];
		await ensureServiceFilterSubCategoryIdsLoaded();
		const effectiveServiceIds = effectiveServiceIdsForOrderDate(
			orderDateInput || todayDateString()
		);
		const res = await apiGet<{ data: ServiceItemListRow[] }>(
			'serviceItem.list',
			{
				serviceName: query.trim(),
				statusId: String(StatusEnum.ACTIVE),
				page: '1',
				pageSize: String(AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT)
			}
		);
		return res.data
			.filter(
				(service) =>
					effectiveServiceIds.has(service.id) &&
					serviceMatchesFilter(service)
			)
			.map((service) => ({
				label: StringUtil.serviceOptionDisplayName(service),
				value: String(service.id)
			}));
	}

	async function getServiceLabelForValue(
		id: string
	): Promise<string> {
		const hid = hospitalId;
		if (!hid) return '';
		const serviceId = Number(id);
		const cached = branchServices.find((s) => s.id === serviceId);
		if (cached) {
			return StringUtil.serviceOptionDisplayName(cached);
		}
		const service = await apiGet<ServiceItemListRow | null>(
			'serviceItem.get',
			{ id: String(serviceId) }
		);
		if (!service) return '';
		return StringUtil.serviceOptionDisplayName(service);
	}

	$effect(() => {
		const hid = hospitalId;
		const bId = branchId;
		if (!hid || !bId) return;
		loadBranchServices(hid, bId);
	});

	$effect(() => {
		detailServiceIdInput;
		orderDateInput;
		void applyPricingForSelectedService();
	});

	$effect(() => {
		const did = detailId;
		const vid = visitId;
		if (did == null || vid == null) {
			if (did == null && vid != null) {
				detailServiceIdInput = '';
				detailAdvisingDoctorIdInput = '';
				detailServiceAmountInput = '';
				detailServiceTaxAmountInput = '';
				detailServiceUnitInput = '1';
				detailInstructionInput = '';
				detailIsUrgentInput = false;
			}
			return;
		}
		const seq = ++loadSeq;
		(async () => {
			const row = await apiGet<ServiceOrderDetailRow | null>(
				'orderLine.get',
				{ id: String(did) }
			);
			if (seq !== loadSeq || !row) return;
			detailServiceIdInput = String(row.serviceId);
			detailAdvisingDoctorIdInput = row.advisingDoctorId ?? '';
			detailServiceAmountInput =
				row.serviceAmount != null ? String(row.serviceAmount) : '';
			detailServiceTaxAmountInput =
				row.serviceTaxAmount != null
					? String(row.serviceTaxAmount)
					: '';
			detailServiceUnitInput =
				row.serviceUnit != null ? String(row.serviceUnit) : '1';
			detailInstructionInput = row.instruction ?? '';
			detailIsUrgentInput = Boolean(row.isUrgent);
		})();
	});

	async function handleSave() {
		const vid = visitId;
		const hid = hospitalId;
		const bId = branchId;
		if (vid == null || !hid || !bId) {
			toastService.addToast(
				m.observation_emr_visit_missing(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const serviceId = parseNumberOrNull(detailServiceIdInput);
		if (!serviceId) {
			toastService.addToast(
				m.observation_emr_service_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const serviceUnit = parseNumberOrNull(detailServiceUnitInput);
		if (!serviceUnit || serviceUnit < 1) {
			toastService.addToast(
				m.observation_emr_unit_invalid(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const serviceAmount = parseDecimalOrNull(
			detailServiceAmountInput
		);
		const serviceTaxAmount = parseDecimalOrNull(
			detailServiceTaxAmountInput
		);
		const instruction = detailInstructionInput.trim() || null;
		const advisingDoctorId =
			detailAdvisingDoctorIdInput.trim() || null;

		isSubmitting = true;
		try {
			if (isEdit && detailId != null) {
				await apiPost('orderLine.updateDetail', {
					payload: {
						id: detailId,
						serviceId,
						advisingDoctorId,
						serviceAmount,
						serviceTaxAmount,
						serviceUnit,
						instruction,
						isUrgent: detailIsUrgentInput
					}
				});
			} else {
				const existingOrders = await apiGet<ServiceOrderRow[]>(
					'serviceOrder.list',
					{ visitId: String(vid) }
				);
				let orderId: number;
				if (existingOrders.length === 0) {
					const dateStr = orderDateInput || todayDateString();
					const timeStr = new Date().toTimeString().slice(0, 5);
					const created = await apiPost<any>(
						'orderLine.createOrder',
						{
							payload: {
								branchId: bId,
								visitId: vid,
								orderDate: dateStr,
								orderTime: timeStr
							}
						}
					);
					orderId = created.id;
				} else {
					const sorted = [...existingOrders].sort(
						(a, b) => b.id - a.id
					);
					orderId = sorted[0]!.id;
				}
				await apiPost('orderLine.createDetail', {
					payload: {
						serviceOrderId: orderId,
						serviceId,
						advisingDoctorId,
						serviceAmount,
						serviceTaxAmount,
						serviceUnit,
						instruction,
						isUrgent: detailIsUrgentInput
					}
				});
			}
			const title = isEdit
				? m.observation_emr_edit_order_line()
				: m.observation_emr_add_order_line();
			toastSuccess(
				toastService,
				title,
				isEdit ? m.toast_action_updated() : m.toast_action_created()
			);
			ObservationOrderLineDialogState.onSaved?.();
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

<div
	class="flex max-h-[min(80vh,520px)] flex-col gap-3 overflow-y-auto"
>
	<p class="text-sm font-medium">
		{isEdit
			? m.observation_emr_edit_order_line()
			: m.observation_emr_add_order_line()}
	</p>
	{#if !isEdit}
		<div class="flex flex-col gap-1">
			<DaisyUiLabel forText="obs-ord-date" className="text-sm">
				{m.observation_emr_order_date()}
			</DaisyUiLabel>
			<DaisyUiInputField
				id="obs-ord-date"
				inputType="date"
				bind:value={orderDateInput}
			/>
		</div>
	{/if}
	<div class="flex flex-col gap-1">
		<DaisyUiLabel className="text-sm">
			{m.observation_emr_service()}
		</DaisyUiLabel>
		<DaisyUiSearchSelect
			className="w-full"
			bind:value={detailServiceIdInput}
			searchFn={searchServices}
			getLabelForValue={getServiceLabelForValue}
			placeholder={m.observation_emr_search_service()}
		/>
	</div>
	<div class="flex flex-col gap-1">
		<DaisyUiLabel className="text-sm">
			{m.observation_emr_advising_doctor()}
		</DaisyUiLabel>
		<DaisyUiSearchSelect
			className="w-full"
			bind:value={detailAdvisingDoctorIdInput}
			searchFn={searchDoctors}
			getLabelForValue={getDoctorLabelForValue}
			placeholder={m.observation_emr_search_doctor()}
		/>
	</div>
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
		<div class="flex flex-col gap-1">
			<DaisyUiLabel className="text-sm">
				{m.observation_emr_service_amount()}
			</DaisyUiLabel>
			<DaisyUiInputField
				inputType="text"
				bind:value={detailServiceAmountInput}
				disabled={!detailAmountEditable && !isEdit}
			/>
		</div>
		<div class="flex flex-col gap-1">
			<DaisyUiLabel className="text-sm">
				{m.observation_emr_tax_amount()}
			</DaisyUiLabel>
			<DaisyUiInputField
				inputType="text"
				bind:value={detailServiceTaxAmountInput}
				disabled={!detailAmountEditable && !isEdit}
			/>
		</div>
		<div class="flex flex-col gap-1">
			<DaisyUiLabel className="text-sm">
				{m.observation_emr_units()}
			</DaisyUiLabel>
			<DaisyUiInputField
				inputType="text"
				bind:value={detailServiceUnitInput}
			/>
		</div>
		<div class="flex flex-col gap-1 sm:col-span-2">
			<DaisyUiLabel className="text-sm">
				{m.observation_emr_instruction()}
			</DaisyUiLabel>
			<DaisyUiInputField
				inputType="text"
				bind:value={detailInstructionInput}
			/>
		</div>
	</div>
	<label class="flex cursor-pointer items-center gap-2 text-sm">
		<input
			type="checkbox"
			class="checkbox checkbox-sm"
			bind:checked={detailIsUrgentInput}
		/>
		{m.observation_emr_urgent()}
	</label>
	<div class="flex flex-wrap justify-end gap-2 pt-2">
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
