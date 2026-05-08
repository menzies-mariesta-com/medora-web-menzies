<script lang="ts">
	import { page } from '$app/state';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import { ItemUnitMasterModalState } from '$lib/state/item-unit-master-modal.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import type { UnitListRow } from '$lib/model/type/heka/ui-rows.type';
	import {
		formatItemUnitConversionDisplay,
		parsePositiveDecimal
	} from '$lib/util/item-unit-conversion.util.svelte';
	import { m } from '$lib/paraglide/messages';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' && page.params.hospital_id
			? page.params.hospital_id
			: ''
	);
	const itemMasterApi = $derived(
		hospitalId
			? `/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master`
			: ''
	);
	const itemUnitApi = $derived(
		hospitalId
			? `/api/heka/hospital/${hospitalId}/home/inventory-setup/item-unit-master`
			: ''
	);

	let purchaseUnitIdStr = $state('');
	let issueUnitIdStr = $state('');
	let purchaseFactorStr = $state('1');
	let issueFactorStr = $state('1');
	let units = $state<UnitListRow[]>([]);
	let isSubmitting = $state(false);
	let isLoading = $state(true);

	const modalState = $derived(ItemUnitMasterModalState);
	const isEdit = $derived(
		modalState.mode === 'edit' && modalState.editRow != null
	);

	const previewLabel = $derived(
		formatItemUnitConversionDisplay({
			purchaseUnitName:
				units.find((u) => String(u.id) === purchaseUnitIdStr)?.name ??
				'',
			issueUnitName:
				units.find((u) => String(u.id) === issueUnitIdStr)?.name ?? '',
			purchaseFactor: parsePositiveDecimal(purchaseFactorStr),
			issueFactor: parsePositiveDecimal(issueFactorStr)
		})
	);

	lifeCycleUtil.onMount(async () => {
		try {
			if (!itemMasterApi) return;
			const uRes = await fetch(`${itemMasterApi}?mode=units`, {
				credentials: 'include',
				cache: 'no-store'
			});
			if (uRes.ok) {
				units = (await uRes.json()) as UnitListRow[];
			}
			if (modalState.mode === 'edit' && modalState.editRow) {
				const r = modalState.editRow;
				purchaseUnitIdStr = String(r.purchaseUnitId);
				issueUnitIdStr = String(r.issueUnitId);
				purchaseFactorStr = String(r.purchaseConversionFactor ?? '1');
				issueFactorStr = String(r.issueConversionFactor ?? '1');
			}
		} finally {
			isLoading = false;
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (isSubmitting || isLoading) return;
		if (!itemUnitApi) return;
		if (!purchaseUnitIdStr || !issueUnitIdStr) {
			toastService.addToast(
				m.item_unit_master_select_units(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const pf = parsePositiveDecimal(purchaseFactorStr);
		const iff = parsePositiveDecimal(issueFactorStr);
		if (!Number.isFinite(pf) || !Number.isFinite(iff)) {
			toastService.addToast(
				m.item_unit_master_factors_positive(),
				StatusColorEnum.ERROR
			);
			return;
		}
		isSubmitting = true;
		try {
			if (modalState.mode === 'create') {
				const res = await fetch(itemUnitApi, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						purchaseUnitId: Number(purchaseUnitIdStr),
						issueUnitId: Number(issueUnitIdStr),
						purchaseConversionFactor: purchaseFactorStr.trim(),
						issueConversionFactor: issueFactorStr.trim()
					})
				});
				if (!res.ok) {
					const t = await res.text().catch(() => '');
					throw new Error(t || `Create failed: ${res.status}`);
				}
				toastService.addToast(
					m.item_unit_master_created(),
					StatusColorEnum.SUCCESS
				);
			} else if (modalState.editRow) {
				const res = await fetch(itemUnitApi, {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						id: modalState.editRow.id,
						purchaseUnitId: Number(purchaseUnitIdStr),
						issueUnitId: Number(issueUnitIdStr),
						purchaseConversionFactor: purchaseFactorStr.trim(),
						issueConversionFactor: issueFactorStr.trim()
					})
				});
				if (!res.ok) {
					const t = await res.text().catch(() => '');
					throw new Error(t || `Update failed: ${res.status}`);
				}
				toastService.addToast(
					m.item_unit_master_updated(),
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
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="ium-pu" className="shrink-0 sm:w-48"
				>{m.item_unit_master_purchase_unit()}
				<span class="text-error">*</span></DaisyUiLabel
			>
			<div class="max-w-lg flex-1">
				<DaisyUiSelect
					id="ium-pu"
					bind:value={purchaseUnitIdStr}
					optionHeader={m.item_master_unit_none()}
				>
					{#each units as u (u.id)}
						<option value={String(u.id)}>{u.name ?? u.id}</option>
					{/each}
				</DaisyUiSelect>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="ium-pf" className="shrink-0 sm:w-48"
				>{m.item_unit_master_purchase_factor()}
				<span class="text-error">*</span></DaisyUiLabel
			>
			<div class="max-w-lg flex-1">
				<DaisyUiInputField
					id="ium-pf"
					bind:value={purchaseFactorStr}
					inputType="text"
					inputPlaceholderText="e.g. 100"
					required
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="ium-iu" className="shrink-0 sm:w-48"
				>{m.item_unit_master_issue_unit()}
				<span class="text-error">*</span></DaisyUiLabel
			>
			<div class="max-w-lg flex-1">
				<DaisyUiSelect
					id="ium-iu"
					bind:value={issueUnitIdStr}
					optionHeader={m.item_master_unit_none()}
				>
					{#each units as u (u.id)}
						<option value={String(u.id)}>{u.name ?? u.id}</option>
					{/each}
				</DaisyUiSelect>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="ium-if" className="shrink-0 sm:w-48"
				>{m.item_unit_master_issue_factor()}
				<span class="text-error">*</span></DaisyUiLabel
			>
			<div class="max-w-lg flex-1">
				<DaisyUiInputField
					id="ium-if"
					bind:value={issueFactorStr}
					inputType="text"
					inputPlaceholderText="e.g. 1"
					required
				/>
			</div>
		</div>
		<div class="rounded-lg border border-base-300 bg-base-200/40 p-3">
			<p class="text-xs font-medium uppercase opacity-70">
				{m.item_unit_master_preview()}
			</p>
			<p class="mt-1 font-mono text-sm">{previewLabel}</p>
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
				{isEdit ? m.update() : m.create()}
			</DaisyUiButton>
		</div>
	</form>
{/if}
