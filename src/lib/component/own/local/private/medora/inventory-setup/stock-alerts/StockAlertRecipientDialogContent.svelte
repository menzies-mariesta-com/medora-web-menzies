<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSearchSelect from '$lib/component/wash/search-select/WashSearchSelect.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { m } from '$lib/paraglide/messages';

	export type StockAlertRecipientDialogRow = {
		storeId: number;
		storeName: string | null;
		staffId: string;
		firstName: string | null;
		middleName: string | null;
		lastName: string | null;
		code: string | null;
		notifyLowStock: boolean;
		notifyExpired: boolean;
		notifyExpiringSoon: boolean;
	};

	type StoreOpt = { id: number; name: string };
	type StaffOpt = { id: string; name: string };

	let {
		confirm,
		cancel,
		mode,
		storeOptions,
		staffOptions,
		initialRow = null,
		isPairTaken
	}: DialogSlotProps & {
		mode: 'create' | 'edit';
		storeOptions: StoreOpt[];
		staffOptions: StaffOpt[];
		initialRow?: StockAlertRecipientDialogRow | null;
		isPairTaken: (storeId: number, staffId: string) => boolean;
	} = $props();

	let storeIdStr = $state('');
	let staffIdStr = $state('');
	let notifyLowStock = $state(true);
	let notifyExpired = $state(true);
	let notifyExpiringSoon = $state(true);
	let touched = $state(false);

	let editSeeded = $state(false);

	const parsedStoreId = $derived(Number(storeIdStr));
	const storeValid = $derived(
		Number.isFinite(parsedStoreId) && parsedStoreId > 0
	);
	const staffValid = $derived(staffIdStr.trim().length > 0);

	const duplicatePair = $derived(
		mode === 'create' &&
			storeValid &&
			staffValid &&
			isPairTaken(parsedStoreId, staffIdStr.trim())
	);

	const formOk = $derived(storeValid && staffValid && !duplicatePair);

	$effect(() => {
		if (mode !== 'edit' || initialRow == null || editSeeded) return;
		editSeeded = true;
		storeIdStr = String(initialRow.storeId);
		staffIdStr = initialRow.staffId;
		notifyLowStock = initialRow.notifyLowStock;
		notifyExpired = initialRow.notifyExpired;
		notifyExpiringSoon = initialRow.notifyExpiringSoon;
	});

	function staffFieldsFromPicker(
		staffId: string
	): Pick<
		StockAlertRecipientDialogRow,
		'code' | 'firstName' | 'middleName' | 'lastName'
	> {
		const opt = staffOptions.find((o) => o.id === staffId);
		const label = opt?.name ?? staffId;
		const parts = label.split('—').map((s) => s.trim());
		const maybeCode = parts[0] ?? '';
		const maybeName = parts[1] ?? '';
		return {
			code: maybeCode || null,
			firstName: maybeName ? maybeName : null,
			middleName: null,
			lastName: null
		};
	}

	function buildRow(): StockAlertRecipientDialogRow {
		const sid = parsedStoreId;
		const storeOpt = storeOptions.find((o) => o.id === sid);
		const staffPick =
			mode === 'edit' && initialRow
				? {
						code: initialRow.code,
						firstName: initialRow.firstName,
						middleName: initialRow.middleName,
						lastName: initialRow.lastName
					}
				: staffFieldsFromPicker(staffIdStr.trim());

		return {
			storeId: sid,
			storeName: storeOpt?.name ?? initialRow?.storeName ?? null,
			staffId: staffIdStr.trim(),
			...staffPick,
			notifyLowStock,
			notifyExpired,
			notifyExpiringSoon
		};
	}

	function handleSubmit() {
		touched = true;
		if (!formOk) return;
		confirm(buildRow());
	}

	const storeSelectOptions = $derived(
		storeOptions.map((o) => ({ label: o.name, value: String(o.id) }))
	);
	const staffSelectOptions = $derived(
		staffOptions.map((o) => ({ label: o.name, value: o.id }))
	);
</script>

<div class="space-y-4">
	<div class="space-y-1">
		<label for="sar-store" class="font-semibold">
			{m.inv_stock_alert_col_store()}
		</label>
		<WashSearchSelect
			inputId="sar-store"
			bind:value={storeIdStr}
			options={storeSelectOptions}
			disabled={mode === 'edit'}
			placeholder={m.inv_stock_alert_store_placeholder()}
			className="w-full"
		/>
		{#if touched && !storeValid}
			<p class="text-sm text-error">{m.toast_field_required()}</p>
		{/if}
	</div>

	<div class="space-y-1">
		<label for="sar-staff" class="font-semibold">
			{m.inv_stock_alert_add_staff()}
		</label>
		<WashSearchSelect
			inputId="sar-staff"
			bind:value={staffIdStr}
			options={staffSelectOptions}
			disabled={mode === 'edit'}
			placeholder={m.inv_stock_alert_staff_placeholder()}
			className="w-full"
		/>
		{#if touched && !staffValid}
			<p class="text-sm text-error">{m.toast_field_required()}</p>
		{/if}
	</div>

	{#if touched && duplicatePair}
		<p class="text-sm text-error">
			{m.inv_stock_alert_recipient_exists()}
		</p>
	{/if}

	<div class="flex flex-col gap-2 pt-1">
		<label class="flex cursor-pointer items-center gap-2">
			<input
				type="checkbox"
				class="checkbox checkbox-sm"
				bind:checked={notifyLowStock}
			/>
			<span class="text-sm">{m.inv_stock_alert_col_low()}</span>
		</label>
		<label class="flex cursor-pointer items-center gap-2">
			<input
				type="checkbox"
				class="checkbox checkbox-sm"
				bind:checked={notifyExpired}
			/>
			<span class="text-sm">{m.inv_stock_alert_col_expired()}</span>
		</label>
		<label class="flex cursor-pointer items-center gap-2">
			<input
				type="checkbox"
				class="checkbox checkbox-sm"
				bind:checked={notifyExpiringSoon}
			/>
			<span class="text-sm">{m.inv_stock_alert_col_soon()}</span>
		</label>
	</div>

	<div class="modal-action flex justify-end gap-2 pt-2">
		<WashButton
			type="button"
			className="btn-ghost"
			onClick={() => cancel()}
		>
			{m.cancel()}
		</WashButton>
		<WashButton
			type="button"
			className="btn-primary"
			onClick={handleSubmit}
		>
			{m.save()}
		</WashButton>
	</div>
</div>
