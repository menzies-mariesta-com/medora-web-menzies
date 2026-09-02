<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCheckbox from '$lib/component/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import PricingFormulaTemplateViewDialog from '$lib/component/own/local/private/heka/inventory-setup/pricing/PricingFormulaTemplateViewDialog.svelte';
	import PricingFormulaDisplay from '$lib/component/own/local/private/heka/inventory-setup/pricing/PricingFormulaDisplay.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import type {
		PricingFormulaTemplateDto,
		PricingFormulaTemplateListRow
	} from '$lib/model/type/heka/pricing-formula-template.type';
	import { buildPricingFormulaDisplay } from '$lib/tool/inventory/pricing-formula-display.util';
	import { applyMariTableClientFilters } from '$lib/tool/mari/mari-table-client-filter.util';
	import { m } from '$lib/paraglide/messages';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);

	const apiBase = $derived(
		hospitalId
			? `/api/heka/hospital/${hospitalId}/home/inventory-setup/pricing-formula-templates`
			: ''
	);

	let allTemplates = $state<PricingFormulaTemplateListRow[]>([]);
	let isLoading = $state(false);
	let saving = $state(false);
	let showForm = $state(false);
	let editingId = $state<number | null>(null);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let tableFilters = $state<Record<string, string>>({});

	let name = $state('');
	let description = $state('');
	let mslMarkupPercentStr = $state('0');
	let includeDiscount = $state(true);
	let includeTax = $state(true);
	let includeFreeQty = $state(false);
	let includeItemMarkup = $state(true);
	let includeStoreMarkup = $state(true);

	const formulaLabels = $derived({
		baseSubtotal: m.inv_pricing_config_formula_base_subtotal(),
		minusLineDiscount: m.inv_pricing_config_formula_minus_line_discount(),
		minusInvoiceDiscount:
			m.inv_pricing_config_formula_minus_invoice_discount(),
		plusLineTax: m.inv_pricing_config_formula_plus_line_tax(),
		plusInvoiceTax: m.inv_pricing_config_formula_plus_invoice_tax(),
		denomPurchased: m.inv_pricing_config_formula_denom_purchased(),
		denomPurchasedPlusFree:
			m.inv_pricing_config_formula_denom_purchased_plus_free(),
		costEquals: m.inv_pricing_template_formula_cost_equals(),
		priceEquals: m.inv_pricing_template_formula_price_equals(),
		timesMsl: (percent: string) =>
			m.inv_pricing_template_formula_times_msl({ percent }),
		timesItemMarkup: m.inv_pricing_template_formula_times_item_markup(),
		timesStoreMarkup: m.inv_pricing_template_formula_times_store_markup()
	});

	function templateFormulaInput(row: PricingFormulaTemplateDto) {
		return {
			includeDiscount: row.includeDiscount,
			includeTax: row.includeTax,
			includeFreeQty: row.includeFreeQty,
			includeItemMarkup: row.includeItemMarkup,
			includeStoreMarkup: row.includeStoreMarkup,
			mslMarkupPercent: row.mslMarkupPercent
		};
	}

	function formulaSummary(row: PricingFormulaTemplateListRow): string {
		return buildPricingFormulaDisplay(
			templateFormulaInput(row),
			formulaLabels
		).summaryLine;
	}

	const templateColumns: MariTableColumn<PricingFormulaTemplateListRow>[] = [
		{
			id: 'name',
			header: m.inv_pricing_template_name(),
			field: 'name',
			widthClass: 'w-48 min-w-[12rem]',
			filterable: true
		},
		{
			id: 'formula',
			header: m.inv_pricing_template_formula(),
			widthClass: 'min-w-[20rem]',
			cellClass: 'whitespace-normal align-middle',
			filterable: true,
			format: (_v, row) => formulaSummary(row),
			cellComponentGetter: (row) => ({
				component: PricingFormulaDisplay,
				props: {
					input: templateFormulaInput(row),
					variant: 'block',
					className: 'text-xs'
				}
			})
		},
		{
			id: 'mslMarkupPercent',
			header: m.inv_pricing_config_msl_markup(),
			field: 'mslMarkupPercent',
			widthClass: 'w-28',
			filterable: true,
			format: (_v, row) => `${row.mslMarkupPercent}%`
		},
		{
			id: 'assignmentCount',
			header: m.inv_pricing_template_assigned_count(),
			field: 'assignmentCount',
			widthClass: 'w-28',
			filterable: false
		},
		{
			id: 'statusId',
			header: m.status(),
			field: 'statusId',
			widthClass: 'w-32',
			filterable: true,
			filterType: 'select',
			filterOptions: [
				{ label: m.active_label(), value: String(StatusEnum.ACTIVE) },
				{ label: m.inactive_label(), value: String(StatusEnum.INACTIVE) }
			],
			defaultFilterValue: String(StatusEnum.ACTIVE),
			format: (_v, row) =>
				row.statusId === StatusEnum.ACTIVE
					? m.active_label()
					: m.inactive_label()
		}
	];

	const filteredTemplates = $derived(
		applyMariTableClientFilters(
			allTemplates as PricingFormulaTemplateListRow[],
			tableFilters,
			templateColumns
		)
	);

	const formFormulaInput = $derived({
		includeDiscount,
		includeTax,
		includeFreeQty,
		includeItemMarkup,
		includeStoreMarkup,
		mslMarkupPercent: mslMarkupPercentStr.trim() === '' ? '0' : mslMarkupPercentStr
	});

	function resetForm() {
		editingId = null;
		name = '';
		description = '';
		mslMarkupPercentStr = '0';
		includeDiscount = true;
		includeTax = true;
		includeFreeQty = false;
		includeItemMarkup = true;
		includeStoreMarkup = true;
	}

	function loadTemplateIntoForm(row: PricingFormulaTemplateDto) {
		editingId = row.id;
		name = row.name;
		description = row.description ?? '';
		mslMarkupPercentStr = row.mslMarkupPercent;
		includeDiscount = row.includeDiscount;
		includeTax = row.includeTax;
		includeFreeQty = row.includeFreeQty;
		includeItemMarkup = row.includeItemMarkup;
		includeStoreMarkup = row.includeStoreMarkup;
		showForm = true;
	}

	async function loadTemplates() {
		if (!apiBase) return;
		isLoading = true;
		try {
			const res = await fetch(apiBase, { credentials: 'include' });
			if (!res.ok) throw new Error(`Load failed (${res.status})`);
			const json = (await res.json()) as { data: PricingFormulaTemplateListRow[] };
			allTemplates = json.data ?? [];
		} catch (err) {
			toastService.addToast(
				err instanceof Error ? err.message : m.loading(),
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		void loadTemplates();
	});

	function validateMarkup(raw: string): boolean {
		const n = Number(raw.trim() === '' ? '0' : raw);
		return Number.isFinite(n) && n >= 0 && n <= 999;
	}

	async function saveTemplate() {
		if (!apiBase || saving) return;
		if (!name.trim()) {
			toastService.addToast(m.name_required(), StatusColorEnum.ERROR);
			return;
		}
		if (!validateMarkup(mslMarkupPercentStr)) {
			toastService.addToast(
				m.inv_pricing_config_invalid_markup(),
				StatusColorEnum.ERROR
			);
			return;
		}

		const payload = {
			name: name.trim(),
			description: description.trim() || null,
			mslMarkupPercent: mslMarkupPercentStr,
			includeDiscount,
			includeTax,
			includeFreeQty,
			includeItemMarkup,
			includeStoreMarkup
		};

		saving = true;
		try {
			const url =
				editingId != null ? `${apiBase}?id=${editingId}` : apiBase;
			const res = await fetch(url, {
				method: editingId != null ? 'PUT' : 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Save failed (${res.status})`);
			}
			toastService.addToast(
				m.inv_pricing_template_saved(),
				StatusColorEnum.SUCCESS
			);
			showForm = false;
			resetForm();
			await loadTemplates();
		} catch (err) {
			toastService.addToast(
				err instanceof Error ? err.message : m.delete_failed(),
				StatusColorEnum.ERROR
			);
		} finally {
			saving = false;
		}
	}

	async function openView(row: PricingFormulaTemplateListRow) {
		await dialogService.open({
			title: row.name,
			component: PricingFormulaTemplateViewDialog,
			props: { row },
			variant: DialogVariantEnum.ALERT
		});
	}

	async function handleDelete(row: PricingFormulaTemplateListRow) {
		if (!apiBase) return;
		if (row.assignmentCount > 0) {
			toastService.addToast(
				m.inv_pricing_template_in_use_warning({
					count: String(row.assignmentCount)
				}),
				StatusColorEnum.ERROR
			);
			return;
		}
		const result = await dialogService.open({
			title: m.delete(),
			message: row.name,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			const res = await fetch(`${apiBase}?id=${row.id}`, {
				method: 'DELETE',
				credentials: 'include'
			});
			if (!res.ok) throw new Error(`Delete failed (${res.status})`);
			toastService.addToast(
				m.inv_pricing_template_deleted(),
				StatusColorEnum.SUCCESS
			);
			await loadTemplates();
		} catch (err) {
			toastService.addToast(
				err instanceof Error ? err.message : m.delete_failed(),
				StatusColorEnum.ERROR
			);
		}
	}
</script>

<div class="flex flex-col gap-4 p-4">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<h1 class="text-xl font-semibold">{m.inv_pricing_template_title()}</h1>
		<DaisyUiButton
			type="button"
			className="d-btn-primary d-btn-sm"
			onClick={() => {
				resetForm();
				showForm = true;
			}}
		>
			<LucidePlus className="size-4" />
			{m.inv_pricing_template_create()}
		</DaisyUiButton>
	</div>

	{#if showForm}
		<DaisyUiCard>
			<DaisyUiCardBody>
				<h2 class="mb-4 text-lg font-medium">
					{editingId != null
						? m.inv_pricing_template_edit()
						: m.inv_pricing_template_create()}
				</h2>
				<form
					class="flex flex-col gap-4"
					onsubmit={(e) => {
						e.preventDefault();
						void saveTemplate();
					}}
				>
					<div class="grid gap-4 md:grid-cols-2">
						<div class="flex flex-col gap-1">
							<DaisyUiLabel forText="tpl-name"
								>{m.inv_pricing_template_name()}</DaisyUiLabel
							>
							<DaisyUiInputField
								id="tpl-name"
								bind:value={name}
								inputType="text"
								required
							/>
						</div>
						<div class="flex flex-col gap-1">
							<DaisyUiLabel forText="tpl-msl"
								>{m.inv_pricing_template_msl_markup()}</DaisyUiLabel
							>
							<DaisyUiInputField
								id="tpl-msl"
								bind:value={mslMarkupPercentStr}
								inputType="text"
							/>
						</div>
					</div>
					<div class="flex flex-col gap-1">
						<DaisyUiLabel>{m.remark()}</DaisyUiLabel>
						<DaisyUiInputField
							bind:value={description}
							inputType="text"
						/>
					</div>
					<fieldset class="rounded-md border border-base-300 p-3">
						<legend class="px-1 text-sm font-medium"
							>{m.inv_pricing_template_cost_basis()}</legend
						>
						<div class="flex flex-col gap-2">
							<label class="flex items-center gap-2 text-sm">
								<DaisyUiCheckbox bind:checked={includeDiscount} />
								{m.inv_pricing_config_include_discount()}
							</label>
							<label class="flex items-center gap-2 text-sm">
								<DaisyUiCheckbox bind:checked={includeTax} />
								{m.inv_pricing_config_include_tax()}
							</label>
							<label class="flex items-center gap-2 text-sm">
								<DaisyUiCheckbox bind:checked={includeFreeQty} />
								{m.inv_pricing_config_include_free_qty()}
							</label>
							<label class="flex items-center gap-2 text-sm">
								<DaisyUiCheckbox bind:checked={includeItemMarkup} />
								{m.inv_pricing_template_include_item_markup()}
							</label>
							<label class="flex items-center gap-2 text-sm">
								<DaisyUiCheckbox bind:checked={includeStoreMarkup} />
								{m.inv_pricing_template_include_store_markup()}
							</label>
						</div>
					</fieldset>
					<div class="rounded-md border border-base-300 bg-base-200/40 p-3">
						<p class="mb-2 text-sm font-medium">
							{m.inv_pricing_template_formula()}
						</p>
						<PricingFormulaDisplay input={formFormulaInput} />
					</div>
					<div class="flex justify-end gap-2">
						<DaisyUiButton
							type="button"
							className="d-btn-ghost"
							onClick={() => {
								showForm = false;
								resetForm();
							}}
						>
							{m.cancel()}
						</DaisyUiButton>
						<DaisyUiButton
							type="submit"
							className="d-btn-primary"
							loading={saving}
						>
							{m.save()}
						</DaisyUiButton>
					</div>
				</form>
			</DaisyUiCardBody>
		</DaisyUiCard>
	{/if}

	<DaisyUiCard>
		<DaisyUiCardBody>
			<div class={TableEnum.HEIGHT}>
				<MariTable
					rows={filteredTemplates}
					columns={templateColumns}
					{isLoading}
					bind:pageSize={pageSizeStr}
					bind:currentPage
					bind:columnFilters={tableFilters}
					showRefreshButton={true}
					refreshTooltip={m.refresh_data()}
					emptyMessage="—"
					showRowActions={true}
					actionsVariant="crud"
					enableColumnFilters={true}
					useRemoteFilters={false}
					crudDeleteDisabled={(row) =>
						(row as PricingFormulaTemplateListRow).isSystemDefault}
					on:refresh={() => loadTemplates()}
					on:view={(e) => void openView(e.detail)}
					on:edit={(e) => loadTemplateIntoForm(e.detail)}
					on:delete={(e) => void handleDelete(e.detail)}
					on:filtersChange={(e) => {
						tableFilters = e.detail.filters;
						currentPage = 1;
					}}
				/>
			</div>
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>
