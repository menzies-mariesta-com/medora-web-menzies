<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCheckbox from '$lib/component/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import {
		createItemMaster,
		getItemMasterById,
		getItemMasterCategories,
		getUnitById,
		getUnitTypesForItemMaster,
		getUnitsForItemMaster,
		updateItemMaster
	} from '$lib/remote/table/information-table/item-master.remote';
	import { ItemMasterModalState } from '$lib/state/item-master-modal.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import type { CategorySchema } from '$lib/server/db/schema-type';
	import type { UnitSchema } from '$lib/server/db/schema-type';
	import type { UnitTypeSchema } from '$lib/server/db/schema-type';
	import { StatusEnum, UnitTypeEnum } from '$lib/model/enum/db-link';
	import { m } from '$lib/paraglide/messages';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

	let categories = $state<CategorySchema[]>([]);
	let unitTypes = $state<UnitTypeSchema[]>([]);
	let units = $state<UnitSchema[]>([]);

	let itemName = $state('');
	let categoryIdStr = $state('');
	let itemCode = $state('');
	let barcode = $state('');
	let unitTypeIdStr = $state('');
	let unitIdStr = $state('');
	let description = $state('');
	let remark = $state('');
	let formActive = $state(true);
	let isSubmitting = $state(false);
	let isLoading = $state(true);

	const state = $derived(ItemMasterModalState);
	const isEdit = $derived(
		state.mode === 'edit' && state.editItem != null
	);

	async function loadUnitsForSelectedType(preserveUnitId: boolean) {
		const tid =
			unitTypeIdStr === '' ? NaN : Number(unitTypeIdStr);
		if (!Number.isFinite(tid)) {
			units = [];
			if (!preserveUnitId) unitIdStr = '';
			return;
		}
		const prevUnit = preserveUnitId ? unitIdStr : '';
		units = await getUnitsForItemMaster({ unitTypeId: tid });
		if (
			preserveUnitId &&
			prevUnit !== '' &&
			units.some((u) => String(u.id) === prevUnit)
		) {
			unitIdStr = prevUnit;
		} else if (!preserveUnitId) {
			unitIdStr = '';
		}
	}

	async function onUnitTypeChange() {
		await loadUnitsForSelectedType(false);
	}

	lifeCycleUtil.onMount(async () => {
		const editing =
			ItemMasterModalState.mode === 'edit' &&
			ItemMasterModalState.editItem != null;
		try {
			const [cats, types] = await Promise.all([
				getItemMasterCategories(),
				getUnitTypesForItemMaster()
			]);
			categories = cats;
			unitTypes = types;

			const defaultType =
				types.find((t) => t.id === UnitTypeEnum.COUNT_PACK) ??
				types[0];

			if (editing && ItemMasterModalState.editItem) {
				const row = await getItemMasterById({
					id: ItemMasterModalState.editItem.id
				});
				if (row) {
					itemName = row.itemName ?? '';
					categoryIdStr = String(row.categoryId);
					itemCode = row.itemCode ?? '';
					barcode = row.barcode ?? '';
					description = row.description ?? '';
					remark = row.remark ?? '';
					formActive =
						(row.statusId ?? StatusEnum.ACTIVE) ===
						StatusEnum.ACTIVE;

					if (row.unitId != null) {
						unitIdStr = String(row.unitId);
						const unit = await getUnitById({
							id: row.unitId
						});
						if (unit?.unitTypeId != null) {
							unitTypeIdStr = String(unit.unitTypeId);
							await loadUnitsForSelectedType(true);
						} else if (defaultType) {
							unitTypeIdStr = String(defaultType.id);
							await loadUnitsForSelectedType(false);
						}
					} else {
						unitIdStr = '';
						if (defaultType) {
							unitTypeIdStr = String(defaultType.id);
							await loadUnitsForSelectedType(false);
						}
					}
				}
			} else {
				if (cats.length > 0) {
					categoryIdStr = String(cats[0].id);
				}
				if (defaultType) {
					unitTypeIdStr = String(defaultType.id);
					await loadUnitsForSelectedType(false);
				}
			}
		} finally {
			isLoading = false;
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (isSubmitting || isLoading) return;
		if (!itemName?.trim()) {
			toastService.addToast(m.name_required(), StatusColorEnum.ERROR);
			return;
		}
		const catId = Number(categoryIdStr);
		if (!Number.isFinite(catId) || categoryIdStr === '') {
			toastService.addToast(
				m.item_master_category_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const statusId = formActive
			? StatusEnum.ACTIVE
			: StatusEnum.INACTIVE;
		const unitIdParsed =
			unitIdStr !== '' && Number.isFinite(Number(unitIdStr))
				? Number(unitIdStr)
				: null;

		isSubmitting = true;
		try {
			if (state.mode === 'create') {
				await createItemMaster({
					itemName: itemName.trim(),
					categoryId: catId,
					itemCode: itemCode.trim() || null,
					barcode: barcode.trim() || null,
					unitId: unitIdParsed,
					description: description.trim() || null,
					remark: remark.trim() || null,
					statusId
				});
				toastService.addToast(
					m.item_master_created(),
					StatusColorEnum.SUCCESS
				);
			} else if (state.editItem) {
				await updateItemMaster({
					id: state.editItem.id,
					itemName: itemName.trim(),
					categoryId: catId,
					itemCode: itemCode.trim() || null,
					barcode: barcode.trim() || null,
					unitId: unitIdParsed,
					description: description.trim() || null,
					remark: remark.trim() || null,
					statusId
				});
				toastService.addToast(
					m.item_master_updated(),
					StatusColorEnum.SUCCESS
				);
			}
			confirm();
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : m.delete_failed();
			toastService.addToast(msg, StatusColorEnum.ERROR);
		} finally {
			isSubmitting = false;
		}
	}
</script>

{#if isLoading}
	<p class="text-sm opacity-70">{m.loading()}</p>
{:else}
	<form onsubmit={handleSubmit} class="flex flex-col gap-4">
		<div class="flex flex-col gap-4">
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel forText="im-name" className="shrink-0 sm:w-40"
					>{m.item_master_item_name()}
					<span class="text-error">*</span></DaisyUiLabel
				>
				<div class="max-w-lg flex-1">
					<DaisyUiInputField
						id="im-name"
						bind:value={itemName}
						inputType="text"
						inputPlaceholderText={m.item_master_item_name_placeholder()}
						required
					/>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel forText="im-cat" className="shrink-0 sm:w-40"
					>{m.service_item_category_label()}
					<span class="text-error">*</span></DaisyUiLabel
				>
				<div class="max-w-lg flex-1">
					<DaisyUiSelect
						id="im-cat"
						bind:value={categoryIdStr}
						optionHeader=""
					>
						{#each categories as c}
							<option value={String(c.id)}
								>{c.categoryName ?? c.id}</option
							>
						{/each}
					</DaisyUiSelect>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel forText="im-code" className="shrink-0 sm:w-40"
					>{m.item_master_code()}</DaisyUiLabel
				>
				<div class="max-w-lg flex-1">
					<DaisyUiInputField
						id="im-code"
						bind:value={itemCode}
						inputType="text"
						inputPlaceholderText={m.item_master_code_placeholder()}
					/>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel forText="im-barcode" className="shrink-0 sm:w-40"
					>{m.item_master_barcode()}</DaisyUiLabel
				>
				<div class="max-w-lg flex-1">
					<DaisyUiInputField
						id="im-barcode"
						bind:value={barcode}
						inputType="text"
						inputPlaceholderText={m.item_master_barcode_placeholder()}
					/>
					<p class="mt-1 text-xs opacity-70">
						{m.item_master_barcode_scan_hint()}
					</p>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel forText="im-unit-type" className="shrink-0 sm:w-40"
					>{m.item_master_unit_type()}</DaisyUiLabel
				>
				<div class="max-w-lg flex-1">
					<DaisyUiSelect
						id="im-unit-type"
						bind:value={unitTypeIdStr}
						optionHeader=""
						onChange={onUnitTypeChange}
					>
						{#each unitTypes as ut}
							<option value={String(ut.id)}>{ut.name ?? ut.id}</option>
						{/each}
					</DaisyUiSelect>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel forText="im-unit" className="shrink-0 sm:w-40"
					>{m.item_master_unit()}</DaisyUiLabel
				>
				<div class="max-w-lg flex-1">
					<DaisyUiSelect
						id="im-unit"
						bind:value={unitIdStr}
						optionHeader={m.item_master_unit_none()}
					>
						{#each units as u}
							<option value={String(u.id)}>{u.name ?? u.id}</option>
						{/each}
					</DaisyUiSelect>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
			>
				<DaisyUiLabel className="shrink-0 pt-2 sm:w-40"
					>{m.item_master_description()}</DaisyUiLabel
				>
				<div class="max-w-lg flex-1">
					<DaisyUiTextarea bind:value={description} />
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
			>
				<DaisyUiLabel className="shrink-0 pt-2 sm:w-40"
					>{m.remark()}</DaisyUiLabel
				>
				<div class="max-w-lg flex-1">
					<DaisyUiTextarea bind:value={remark} />
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel className="shrink-0 sm:w-40">{m.status()}</DaisyUiLabel>
				<div class="flex max-w-lg flex-1 flex-wrap items-center gap-2">
					<label class="flex cursor-pointer items-center gap-2">
						<DaisyUiCheckbox bind:checked={formActive} />
						<span class="text-sm opacity-80">{m.active_label()}</span>
					</label>
				</div>
			</div>
		</div>
		<div
			class="d-modal-action flex shrink-0 justify-end gap-2 border-t border-base-300 pt-4"
		>
			<DaisyUiButton
				type="button"
				className="d-btn-ghost"
				onClick={() => cancel()}
			>
				{m.cancel()}
			</DaisyUiButton>
			<DaisyUiButton
				type="submit"
				className="d-btn-primary"
				loading={isSubmitting}
			>
				{isEdit ? m.save() : m.create()}
			</DaisyUiButton>
		</div>
	</form>
{/if}
