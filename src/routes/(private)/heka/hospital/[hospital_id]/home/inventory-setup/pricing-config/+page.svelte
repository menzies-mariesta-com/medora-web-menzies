<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { BranchPricingConfigDto } from '$lib/model/type/heka/grn-pricing-config.type';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';

	const toastService = new ToastService();

	const BRANCH_ALL = '__all__';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	/** From hospital home layout (navbar branch selector). */
	const navbarSelectedBranchId = $derived(
		typeof page.data?.selectedBranchId === 'string'
			? page.data.selectedBranchId
			: null
	);

	const isAllBranchMode = $derived(navbarSelectedBranchId === BRANCH_ALL);

	const branchSelectDisabled = $derived(!isAllBranchMode);

	const lockedBranchLabel = $derived.by(() => {
		if (isAllBranchMode || !navbarSelectedBranchId) return '';
		const navBranches = (
			(page.data?.staffBranchesForNav ?? []) as {
				id: string;
				name: string | null;
			}[]
		).filter((b) => b.id !== BRANCH_ALL);
		const fromNav = navBranches.find(
			(b) => b.id === navbarSelectedBranchId
		);
		if (fromNav?.name?.trim()) return fromNav.name.trim();
		const fromList = branches.find(
			(b) => b.id === navbarSelectedBranchId
		);
		return fromList?.name ?? navbarSelectedBranchId;
	});

	let branches = $state<{ id: string; name: string }[]>([]);
	let branchId = $state('');
	let loading = $state(false);
	let loadError = $state<string | null>(null);
	let saving = $state(false);

	let saleManualOnGrnLine = $state(false);
	let saleIncludeDiscount = $state(true);
	let saleIncludeTax = $state(true);
	let saleIncludeFreeQty = $state(false);
	let saleMarkupPercentStr = $state('0');

	let empManualOnGrnLine = $state(false);
	let empIncludeDiscount = $state(true);
	let empIncludeTax = $state(true);
	let empIncludeFreeQty = $state(true);
	let empMarkupPercentStr = $state('0');
	let empUsePercentOfSale = $state(false);
	let empPercentOfSaleStr = $state('100');

	const branchOptions = $derived(
		branches.map((b) => ({ label: b.name, value: b.id }))
	);

	const saleFormulaHelp = $derived.by(() => {
		if (saleManualOnGrnLine) return m.inv_pricing_config_sale_help_manual();
		const parts: string[] = [m.inv_pricing_config_formula_base_subtotal()];
		if (saleIncludeDiscount) parts.push(m.inv_pricing_config_formula_minus_discount());
		if (saleIncludeTax) parts.push(m.inv_pricing_config_formula_plus_tax());
		const denom = saleIncludeFreeQty
			? m.inv_pricing_config_formula_denom_received_plus_free()
			: m.inv_pricing_config_formula_denom_received();
		return `${parts.join(' ')} ÷ ${denom}${Number(saleMarkupPercentStr) > 0 ? ` × (1 + ${saleMarkupPercentStr}%)` : ''}`;
	});

	const empFormulaHelp = $derived.by(() => {
		if (empManualOnGrnLine) return m.inv_pricing_config_emp_help_manual();
		if (empUsePercentOfSale) {
			return m.inv_pricing_config_emp_help_percent({
				percent: empPercentOfSaleStr
			});
		}
		const parts: string[] = [m.inv_pricing_config_formula_base_subtotal()];
		if (empIncludeDiscount) parts.push(m.inv_pricing_config_formula_minus_discount());
		if (empIncludeTax) parts.push(m.inv_pricing_config_formula_plus_tax());
		const denom = empIncludeFreeQty
			? m.inv_pricing_config_formula_denom_received_plus_free()
			: m.inv_pricing_config_formula_denom_received();
		return `${parts.join(' ')} ÷ ${denom}${Number(empMarkupPercentStr) > 0 ? ` × (1 + ${empMarkupPercentStr}%)` : ''}`;
	});

	function apiBase() {
		return `/api/heka/hospital/${hospitalId}/home/inventory-setup/pricing-config`;
	}

	function syncForm(c: BranchPricingConfigDto) {
		saleManualOnGrnLine = c.saleManualOnGrnLine;
		saleIncludeDiscount = c.saleIncludeDiscount;
		saleIncludeTax = c.saleIncludeTax;
		saleIncludeFreeQty = c.saleIncludeFreeQty;
		saleMarkupPercentStr = c.saleMarkupPercent;
		empManualOnGrnLine = c.empManualOnGrnLine;
		empIncludeDiscount = c.empIncludeDiscount;
		empIncludeTax = c.empIncludeTax;
		empIncludeFreeQty = c.empIncludeFreeQty;
		empMarkupPercentStr = c.empMarkupPercent;
		empUsePercentOfSale = c.empUsePercentOfSale;
		empPercentOfSaleStr = c.empPercentOfSale;
	}

	async function loadBranches() {
		if (!hospitalId) return;
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/administration/branches?mode=all`,
			{ credentials: 'include', cache: 'no-store' }
		);
		if (!res.ok) {
			const t = await res.text().catch(() => '');
			throw new Error(t || `Load branches failed (${res.status})`);
		}
		const rows = (await res.json()) as {
			id: string;
			branchName?: string | null;
			name?: string | null;
		}[];
		branches = rows.map((r) => ({
			id: r.id,
			name: String(r.branchName ?? r.name ?? r.id).trim() || r.id
		}));
	}

	async function loadConfig() {
		if (!hospitalId || !branchId) return;
		loading = true;
		loadError = null;
		try {
			const res = await fetch(
				`${apiBase()}?branchId=${encodeURIComponent(branchId)}`,
				{ credentials: 'include', cache: 'no-store' }
			);
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Load failed (${res.status})`);
			}
			const b = (await res.json()) as { config: BranchPricingConfigDto };
			syncForm(b.config);
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Load failed';
		} finally {
			loading = false;
		}
	}

	async function saveConfig() {
		if (!hospitalId || !branchId || saving) return;
		const saleMarkup = Number(saleMarkupPercentStr);
		const empMarkup = Number(empMarkupPercentStr);
		const empPct = Number(empPercentOfSaleStr);
		if (!Number.isFinite(saleMarkup) || saleMarkup < 0 || saleMarkup > 999) {
			toastService.addToast(
				m.inv_pricing_config_invalid_markup(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!Number.isFinite(empMarkup) || empMarkup < 0 || empMarkup > 999) {
			toastService.addToast(
				m.inv_pricing_config_invalid_markup(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!Number.isFinite(empPct) || empPct <= 0 || empPct > 999) {
			toastService.addToast(
				m.inv_pricing_config_invalid_emp_percent(),
				StatusColorEnum.ERROR
			);
			return;
		}
		saving = true;
		try {
			const res = await fetch(apiBase(), {
				method: 'PUT',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					branchId,
					saleManualOnGrnLine,
					saleIncludeDiscount,
					saleIncludeTax,
					saleIncludeFreeQty,
					saleMarkupPercent: saleMarkup.toFixed(2),
					empManualOnGrnLine,
					empIncludeDiscount,
					empIncludeTax,
					empIncludeFreeQty,
					empMarkupPercent: empMarkup.toFixed(2),
					empUsePercentOfSale,
					empPercentOfSale: empPct.toFixed(2)
				})
			});
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Save failed (${res.status})`);
			}
			const b = (await res.json()) as { config: BranchPricingConfigDto };
			syncForm(b.config);
			toastService.addToast(
				m.inv_pricing_config_saved(),
				StatusColorEnum.SUCCESS
			);
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Save failed',
				StatusColorEnum.ERROR
			);
		} finally {
			saving = false;
		}
	}

	$effect(() => {
		void hospitalId;
		void (async () => {
			try {
				await loadBranches();
			} catch (e) {
				loadError =
					e instanceof Error ? e.message : 'Load branches failed';
			}
		})();
	});

	$effect(() => {
		void hospitalId;
		void branchId;
		if (branchId) void loadConfig();
	});

	/** When nav is a specific branch, lock config to that branch. */
	$effect(() => {
		if (
			!isAllBranchMode &&
			navbarSelectedBranchId &&
			navbarSelectedBranchId !== BRANCH_ALL
		) {
			branchId = navbarSelectedBranchId;
		}
	});
</script>

<div class="space-y-6">
	<div class="space-y-1">
		<h1 class="text-lg font-semibold">{m.inv_pricing_config_title()}</h1>
		<p class="text-sm opacity-70">{m.inv_pricing_config_subtitle()}</p>
	</div>

	{#if loadError}
		<div class="d-alert d-alert-error">
			<span>{loadError}</span>
		</div>
	{/if}

	<DaisyUiCard>
		<DaisyUiCardBody className="space-y-4">
			<div class="max-w-md space-y-1">
				<DaisyUiLabel className="font-semibold">
					{m.inv_pricing_config_branch()}
				</DaisyUiLabel>
				<DaisyUISearchSelect
					options={branchOptions}
					bind:value={branchId}
					placeholder={m.inv_pricing_config_branch_placeholder()}
					disabled={loading || saving || branchSelectDisabled}
				/>
				{#if branchSelectDisabled && lockedBranchLabel}
					<p class="text-xs opacity-70">
						{m.inv_pricing_config_branch_locked_hint({
							branch: lockedBranchLabel
						})}
					</p>
				{/if}
			</div>
		</DaisyUiCardBody>
	</DaisyUiCard>

	{#if branchId}
		<DaisyUiCard>
			<DaisyUiCardBody className="space-y-6">
				<div
					class="grid grid-cols-1 gap-6 lg:grid-cols-2"
				>
					<div class="min-w-0 space-y-4">
						<div class="space-y-1">
							<h2 class="text-base font-semibold">
								{m.inv_pricing_config_section_sale()}
							</h2>
							<p class="text-xs opacity-70">{saleFormulaHelp}</p>
						</div>
						<div class="flex flex-col gap-3">
					<label class="flex cursor-pointer items-center gap-2">
						<input
							type="checkbox"
							class="d-checkbox d-checkbox-sm"
							bind:checked={saleManualOnGrnLine}
							disabled={loading || saving}
						/>
						<span class="text-sm"
							>{m.inv_pricing_config_manual_on_grn()}</span
						>
					</label>
					{#if !saleManualOnGrnLine}
						<label class="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								class="d-checkbox d-checkbox-sm"
								bind:checked={saleIncludeDiscount}
								disabled={loading || saving}
							/>
							<span class="text-sm"
								>{m.inv_pricing_config_include_discount()}</span
							>
						</label>
						<label class="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								class="d-checkbox d-checkbox-sm"
								bind:checked={saleIncludeTax}
								disabled={loading || saving}
							/>
							<span class="text-sm"
								>{m.inv_pricing_config_include_tax()}</span
							>
						</label>
						<label class="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								class="d-checkbox d-checkbox-sm"
								bind:checked={saleIncludeFreeQty}
								disabled={loading || saving}
							/>
							<span class="text-sm"
								>{m.inv_pricing_config_include_free_qty()}</span
							>
						</label>
						<div class="max-w-xs space-y-1">
							<DaisyUiLabel className="font-semibold">
								{m.inv_pricing_config_sale_markup()}
							</DaisyUiLabel>
							<DaisyUiInputField
								bind:value={saleMarkupPercentStr}
								inputType="number"
								inputPlaceholderText="0"
								disabled={loading || saving}
							/>
						</div>
					{/if}
						</div>
					</div>

					<div class="min-w-0 space-y-4">
						<div class="space-y-1">
							<h2 class="text-base font-semibold">
								{m.inv_pricing_config_section_emp()}
							</h2>
							<p class="text-xs opacity-70">{empFormulaHelp}</p>
						</div>
						<div class="flex flex-col gap-3">
					<label class="flex cursor-pointer items-center gap-2">
						<input
							type="checkbox"
							class="d-checkbox d-checkbox-sm"
							bind:checked={empManualOnGrnLine}
							disabled={loading || saving}
						/>
						<span class="text-sm"
							>{m.inv_pricing_config_manual_on_grn()}</span
						>
					</label>
					{#if !empManualOnGrnLine}
						<label class="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								class="d-checkbox d-checkbox-sm"
								bind:checked={empUsePercentOfSale}
								disabled={loading || saving}
							/>
							<span class="text-sm"
								>{m.inv_pricing_config_emp_use_percent_of_sale()}</span
							>
						</label>
						{#if empUsePercentOfSale}
							<div class="max-w-xs space-y-1">
								<DaisyUiLabel className="font-semibold">
									{m.inv_pricing_config_emp_percent()}
								</DaisyUiLabel>
								<DaisyUiInputField
									bind:value={empPercentOfSaleStr}
									inputType="number"
									inputPlaceholderText="100"
									disabled={loading || saving}
								/>
							</div>
						{:else}
							<label class="flex cursor-pointer items-center gap-2">
								<input
									type="checkbox"
									class="d-checkbox d-checkbox-sm"
									bind:checked={empIncludeDiscount}
									disabled={loading || saving}
								/>
								<span class="text-sm"
									>{m.inv_pricing_config_include_discount()}</span
								>
							</label>
							<label class="flex cursor-pointer items-center gap-2">
								<input
									type="checkbox"
									class="d-checkbox d-checkbox-sm"
									bind:checked={empIncludeTax}
									disabled={loading || saving}
								/>
								<span class="text-sm"
									>{m.inv_pricing_config_include_tax()}</span
								>
							</label>
							<label class="flex cursor-pointer items-center gap-2">
								<input
									type="checkbox"
									class="d-checkbox d-checkbox-sm"
									bind:checked={empIncludeFreeQty}
									disabled={loading || saving}
								/>
								<span class="text-sm"
									>{m.inv_pricing_config_include_free_qty()}</span
								>
							</label>
							<div class="max-w-xs space-y-1">
								<DaisyUiLabel className="font-semibold">
									{m.inv_pricing_config_emp_markup()}
								</DaisyUiLabel>
								<DaisyUiInputField
									bind:value={empMarkupPercentStr}
									inputType="number"
									inputPlaceholderText="0"
									disabled={loading || saving}
								/>
							</div>
						{/if}
					{/if}
						</div>
					</div>
				</div>

				<div class="flex justify-end">
					<DaisyUiButton
						type="button"
						className="d-btn-primary d-btn-sm"
						disabled={loading || saving}
						loading={saving}
						onClick={() => void saveConfig()}
					>
						{m.inv_pricing_config_save()}
					</DaisyUiButton>
				</div>
			</DaisyUiCardBody>
		</DaisyUiCard>
	{:else}
		<p class="text-sm opacity-70">
			{m.inv_pricing_config_select_branch()}
		</p>
	{/if}
</div>
