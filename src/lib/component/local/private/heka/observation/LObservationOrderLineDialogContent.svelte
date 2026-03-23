<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ObservationOrderLineDialogState } from '$lib/state/observation-order-line-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { CategoryEnum, StatusEnum } from '$lib/model/enum/db-link';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { getServiceTagging } from '$lib/remote/table/information-table/service-tagging.remote';
	import {
		getServiceItemPaginated,
		getServiceItem
	} from '$lib/remote/table/information-table/service-item.remote';
	import { getSubCategory } from '$lib/remote/table/information-table/sub-category.remote';
	import {
		createServiceOrder,
		getServiceOrder
	} from '$lib/remote/table/information-table/service-order.remote';
	import {
		createServiceOrderDetail,
		updateServiceOrderDetail,
		getServiceOrderDetailById
	} from '$lib/remote/table/information-table/service-order-detail.remote';
	import {
		getDoctorStaffPaginated,
		getStaffByIdWithRelations
	} from '$lib/remote/table/information-table/staff.remote';
	import type { ServiceItemSchema } from '$lib/server/db/schema-type';
	import type { ServiceTaggingSchema } from '$lib/server/db/schema-type';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiSearchSelect from '$lib/component/library/daisyui/search-select/DaisyUISearchSelect.svelte';
	import { m } from '$lib/paraglide/messages';

	const toastService = new ToastService();

	let { confirm, cancel }: DialogSlotProps = $props();

	const visitId = $derived(ObservationOrderLineDialogState.visitId);
	const hospitalId = $derived(ObservationOrderLineDialogState.hospitalId);
	const branchId = $derived(ObservationOrderLineDialogState.branchId);
	const detailId = $derived(ObservationOrderLineDialogState.detailId);
	const isEdit = $derived(detailId != null);

	let branchTaggings = $state<ServiceTaggingSchema[]>([]);
	let branchServices = $state<ServiceItemSchema[]>([]);
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
		taggings: ServiceTaggingSchema[],
		orderDate: string
	): ServiceTaggingSchema | null {
		const normalizedOrderDate = toDateOnly(orderDate) ?? todayDateString();
		const dated: Array<{ tagging: ServiceTaggingSchema; date: string }> =
			[];
		const undated: ServiceTaggingSchema[] = [];
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

	function effectiveServiceIdsForOrderDate(orderDate: string): Set<number> {
		const taggingsByService = new Map<
			number,
			ServiceTaggingSchema[]
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

	function serviceMatchesFilter(service: ServiceItemSchema): boolean {
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
					getSubCategory({ categoryId: CategoryEnum.RADIOLOGY }),
					getSubCategory({ categoryId: CategoryEnum.NURSING_PROCEDURE }),
					getSubCategory({ categoryId: CategoryEnum.LABORATORY })
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
		const [taggings, allServices] = await Promise.all([
			getServiceTagging({ branchId: bId }),
			getServiceItem({ hospitalId: hId, statusId: null })
		]);
		branchTaggings = taggings;
		const serviceIds = new Set(
			taggings.map((t) => t.serviceId).filter((id) => id != null)
		);
		if (serviceIds.size === 0) {
			branchServices = [];
			return;
		}
		branchServices = allServices.filter((s) => serviceIds.has(s.id));
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
			const taggings = await getServiceTagging({
				branchId: bId,
				serviceId
			});
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
		const res = await getDoctorStaffPaginated({
			search: query.trim(),
			hospitalId: hid,
			page: 1,
			pageSize: AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT
		});
		return res.data.map((staff) => ({
			label: StringUtil.doctorOptionDisplayName(staff),
			value: String(staff.id)
		}));
	}

	async function getDoctorLabelForValue(id: string): Promise<string> {
		const staff = await getStaffByIdWithRelations({ id });
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
		const res = await getServiceItemPaginated({
			hospitalId: hid,
			serviceName: query.trim(),
			statusId: StatusEnum.ACTIVE,
			page: 1,
			pageSize: AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT
		});
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

	async function getServiceLabelForValue(id: string): Promise<string> {
		const hid = hospitalId;
		if (!hid) return '';
		const serviceId = Number(id);
		const cached = branchServices.find((s) => s.id === serviceId);
		if (cached) {
			return StringUtil.serviceOptionDisplayName(cached);
		}
		const fetched = await getServiceItem({
			id: serviceId,
			hospitalId: hid,
			statusId: null
		});
		const service = fetched[0];
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
			const row = await getServiceOrderDetailById({ id: did });
			if (seq !== loadSeq || !row) return;
			detailServiceIdInput = String(row.serviceId);
			detailAdvisingDoctorIdInput = row.advisingDoctorId ?? '';
			detailServiceAmountInput =
				row.serviceAmount != null ? String(row.serviceAmount) : '';
			detailServiceTaxAmountInput =
				row.serviceTaxAmount != null ? String(row.serviceTaxAmount) : '';
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
		const serviceAmount = parseDecimalOrNull(detailServiceAmountInput);
		const serviceTaxAmount = parseDecimalOrNull(
			detailServiceTaxAmountInput
		);
		const instruction = detailInstructionInput.trim() || null;
		const advisingDoctorId =
			detailAdvisingDoctorIdInput.trim() || null;

		isSubmitting = true;
		try {
			if (isEdit && detailId != null) {
				await updateServiceOrderDetail({
					id: detailId,
					serviceId,
					advisingDoctorId,
					serviceAmount,
					serviceTaxAmount,
					serviceUnit,
					instruction,
					isUrgent: detailIsUrgentInput
				});
			} else {
				const existingOrders = await getServiceOrder({ visitId: vid });
				let orderId: number;
				if (existingOrders.length === 0) {
					const dateStr = orderDateInput || todayDateString();
					const timeStr = new Date().toTimeString().slice(0, 5);
					const visitKey = String(vid);
					const yearSuffix = dateStr.slice(2, 4);
					const orderNo = `${yearSuffix}/${visitKey}/${String(1).padStart(3, '0')}`;
					const created = await createServiceOrder({
						branchId: bId,
						visitId: vid,
						orderDate: dateStr,
						orderTime: timeStr,
						orderNo
					} as any);
					orderId = created.id;
				} else {
					const sorted = [...existingOrders].sort(
						(a, b) => b.id - a.id
					);
					orderId = sorted[0]!.id;
				}
				await createServiceOrderDetail({
					serviceOrderId: orderId,
					serviceId,
					advisingDoctorId,
					serviceAmount,
					serviceTaxAmount,
					serviceUnit,
					instruction,
					isUrgent: detailIsUrgentInput
				} as any);
			}
			toastService.addToast(
				m.observation_emr_saved(),
				StatusColorEnum.SUCCESS
			);
			ObservationOrderLineDialogState.onSaved?.();
			confirm({ saved: true });
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

<div class="flex max-h-[min(80vh,520px)] flex-col gap-3 overflow-y-auto">
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
		<DaisyUiButton className="d-btn-ghost" onClick={() => cancel()}>
			{m.observation_emr_cancel()}
		</DaisyUiButton>
		<DaisyUiButton
			className="d-btn-primary"
			disabled={isSubmitting}
			onClick={handleSave}
		>
			{m.observation_emr_save()}
		</DaisyUiButton>
	</div>
</div>
