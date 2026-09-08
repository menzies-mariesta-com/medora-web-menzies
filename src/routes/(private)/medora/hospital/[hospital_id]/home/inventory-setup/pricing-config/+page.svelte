<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashSearchSelect from '$lib/component/wash/search-select/WashSearchSelect.svelte';
	import PricingAssignmentViewDialog from '$lib/component/own/local/private/medora/inventory-setup/pricing/PricingAssignmentViewDialog.svelte';
	import PricingFormulaDisplay from '$lib/component/own/local/private/medora/inventory-setup/pricing/PricingFormulaDisplay.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import {
		INV_PRICING_MODULE_CODES,
		type InvPricingModuleCode
	} from '$lib/model/type/medora/inv-pricing-module.type';
	import type {
		ModulePricingAssignmentDto,
		ModulePricingAssignmentOverviewRow,
		PricingFormulaTemplateDto,
		PricingFormulaTemplateListRow
	} from '$lib/model/type/medora/pricing-formula-template.type';
	import { applyMenziesTableClientFilters } from '$lib/tool/menzies/menzies-table-client-filter.util';
	import { m } from '$lib/paraglide/messages';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

	const BRANCH_ALL = '__all__';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);

	const currentHospitalName = $derived(
		typeof (page.data as { currentHospitalName?: string | null })
			?.currentHospitalName === 'string'
			? ((page.data as { currentHospitalName?: string | null })
					.currentHospitalName ?? '')
			: ''
	);

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
		const fromNav = navBranches.find((b) => b.id === navbarSelectedBranchId);
		if (fromNav?.name?.trim()) return fromNav.name.trim();
		const fromList = branches.find((b) => b.id === navbarSelectedBranchId);
		return fromList?.name ?? navbarSelectedBranchId;
	});

	const configApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/inventory-setup/pricing-config`
			: ''
	);
	const templatesApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/inventory-setup/pricing-formula-templates`
			: ''
	);

	let branches = $state<{ id: string; name: string }[]>([]);
	let branchId = $state('');
	let activeModule = $state<InvPricingModuleCode>('IS');
	let templates = $state<PricingFormulaTemplateListRow[]>([]);
	let assignment = $state<ModulePricingAssignmentDto | null>(null);
	let selectedTemplate = $state<PricingFormulaTemplateDto | null>(null);
	let templateIdStr = $state('');
	let assignmentLoading = $state(false);
	let saving = $state(false);

	let allOverviewRows = $state<ModulePricingAssignmentOverviewRow[]>([]);
	let overviewLoading = $state(false);
	let overviewPage = $state(1);
	let overviewPageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let overviewTableFilters = $state<Record<string, string>>({});

	let assignmentSectionEl = $state<HTMLElement | null>(null);
	let showAssignmentPanel = $state(false);

	const branchOptions = $derived(
		branches.map((b) => ({ label: b.name, value: b.id }))
	);

	const overviewBranchFilter = $derived(
		isAllBranchMode ? '' : (navbarSelectedBranchId ?? '')
	);

	function moduleLabel(mod: InvPricingModuleCode): string {
		if (mod === 'IS') return m.inv_pricing_assignment_module_is();
		if (mod === 'ES') return m.inv_pricing_assignment_module_es();
		return m.inv_pricing_assignment_module_dc();
	}

	const overviewColumns = $derived.by((): MenziesTableColumn<ModulePricingAssignmentOverviewRow>[] => [
		{
			id: 'branchId',
			header: m.inv_pricing_config_branch(),
			field: 'branchId',
			widthClass: 'w-44 min-w-[10rem]',
			filterable: isAllBranchMode,
			filterType: 'select',
			filterOptions: branchOptions.map((b) => ({
				label: b.label,
				value: b.value
			})),
			format: (_v, row) => row.branchName
		},
		{
			id: 'module',
			header: m.inv_pricing_assignment_module(),
			field: 'module',
			widthClass: 'w-40 min-w-[9rem]',
			filterable: true,
			filterType: 'select',
			filterOptions: INV_PRICING_MODULE_CODES.map((mod) => ({
				label: moduleLabel(mod),
				value: mod
			})),
			format: (_v, row) => moduleLabel(row.module)
		},
		{
			id: 'formulaTemplateName',
			header: m.inv_pricing_assignment_template(),
			field: 'formulaTemplateName',
			widthClass: 'min-w-[14rem]',
			filterable: true,
			format: (_v, row) =>
				row.formulaTemplateName ??
				m.inv_pricing_assignment_overview_unassigned()
		},
		{
			id: 'assigned',
			header: m.status(),
			field: 'assigned',
			widthClass: 'w-32',
			filterable: true,
			filterType: 'select',
			filterOptions: [
				{ label: m.active_label(), value: 'assigned' },
				{ label: m.inv_pricing_assignment_overview_unassigned(), value: 'unassigned' }
			],
			format: (_v, row) =>
				row.formulaTemplateId != null
					? m.active_label()
					: m.inv_pricing_assignment_overview_unassigned()
		}
	]);

	const overviewRowsForTable = $derived(
		allOverviewRows.map((row) => ({
			...row,
			assigned: row.formulaTemplateId != null ? 'assigned' : 'unassigned',
			formulaTemplateName: row.formulaTemplateName ?? ''
		}))
	);

	const filteredOverviewRows = $derived(
		applyMenziesTableClientFilters(
			overviewRowsForTable as (ModulePricingAssignmentOverviewRow & {
				assigned: string;
			})[],
			overviewTableFilters,
			overviewColumns
		)
	);

	const templateOptions = $derived(
		templates
			.filter((t) => t.statusId === StatusEnum.ACTIVE)
			.map((t) => ({
				label: `${t.name} (MSL ${t.mslMarkupPercent}%)`,
				value: String(t.id)
			}))
	);

	async function fetchBranches(hid: string) {
		const res = await fetch(
			`/api/medora/hospital/${hid}/home/administration/branches?mode=all`,
			{ credentials: 'include' }
		);
		if (!res.ok) throw new Error(`Branches (${res.status})`);
		const rows = (await res.json()) as {
			id: string;
			name?: string | null;
			code?: string | null;
		}[];
		branches = rows.map((b) => ({
			id: b.id,
			name: b.name ?? b.code ?? b.id
		}));
	}

	async function loadTemplates() {
		if (!templatesApi) return;
		const res = await fetch(templatesApi, { credentials: 'include' });
		if (!res.ok) throw new Error(`Templates (${res.status})`);
		const json = (await res.json()) as { data: PricingFormulaTemplateListRow[] };
		templates = json.data ?? [];
	}

	async function loadAssignment() {
		if (!configApi || !branchId) return;
		assignmentLoading = true;
		try {
			const res = await fetch(
				`${configApi}?branchId=${encodeURIComponent(branchId)}&module=${activeModule}`,
				{ credentials: 'include' }
			);
			if (!res.ok) throw new Error(`Config (${res.status})`);
			const json = (await res.json()) as {
				assignment: ModulePricingAssignmentDto | null;
				template: PricingFormulaTemplateDto | null;
			};
			assignment = json.assignment;
			selectedTemplate = json.template;
			templateIdStr =
				json.assignment != null
					? String(json.assignment.formulaTemplateId)
					: '';
		} catch (err) {
			toastService.addToast(
				err instanceof Error ? err.message : m.loading(),
				StatusColorEnum.ERROR
			);
		} finally {
			assignmentLoading = false;
		}
	}

	async function loadOverview() {
		if (!configApi || !hospitalId) return;
		overviewLoading = true;
		try {
			const params = new URLSearchParams({ mode: 'overview' });
			if (overviewBranchFilter) {
				params.set('branchId', overviewBranchFilter);
			}
			const res = await fetch(`${configApi}?${params}`, {
				credentials: 'include'
			});
			if (!res.ok) throw new Error(`Overview (${res.status})`);
			const json = (await res.json()) as {
				data: ModulePricingAssignmentOverviewRow[];
			};
			allOverviewRows = json.data ?? [];
		} catch (err) {
			toastService.addToast(
				err instanceof Error ? err.message : m.loading(),
				StatusColorEnum.ERROR
			);
		} finally {
			overviewLoading = false;
		}
	}

	lifeCycleUtil.onMount(async () => {
		if (!hospitalId) return;
		try {
			await fetchBranches(hospitalId);
			await loadTemplates();
			syncBranchFromNav();
			await loadOverview();
		} catch (err) {
			toastService.addToast(
				err instanceof Error ? err.message : m.loading(),
				StatusColorEnum.ERROR
			);
		}
	});

	function syncBranchFromNav() {
		if (navbarSelectedBranchId && navbarSelectedBranchId !== BRANCH_ALL) {
			branchId = navbarSelectedBranchId;
		} else if (branches.length > 0 && !branchId) {
			branchId = branches[0].id;
		}
	}

	$effect(() => {
		const navBranch = navbarSelectedBranchId;
		void branches.length;
		if (!navBranch) return;
		if (navBranch !== BRANCH_ALL) {
			branchId = navBranch;
		} else if (!branchId && branches.length > 0) {
			branchId = branches[0].id;
		}
	});

	$effect(() => {
		const navBranch = navbarSelectedBranchId;
		void navBranch;
		if (hospitalId && configApi) {
			void loadOverview();
		}
	});

	$effect(() => {
		const bid = branchId;
		const mod = activeModule;
		if (bid && configApi) {
			void loadAssignment();
		}
		void mod;
	});

	function configureFromOverview(row: ModulePricingAssignmentOverviewRow) {
		branchId = row.branchId;
		activeModule = row.module;
		showAssignmentPanel = true;
		assignmentSectionEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	async function openOverviewView(row: ModulePricingAssignmentOverviewRow) {
		await dialogService.open({
			title: `${row.branchName} · ${moduleLabel(row.module)}`,
			component: PricingAssignmentViewDialog,
			props: { row, moduleLabel },
			variant: DialogVariantEnum.ALERT
		});
	}

	async function saveAssignment() {
		if (!configApi || !branchId || saving) return;
		const tid = Number(templateIdStr);
		if (!Number.isFinite(tid) || tid <= 0) {
			toastService.addToast(
				m.inv_pricing_assignment_template_placeholder(),
				StatusColorEnum.ERROR
			);
			return;
		}
		saving = true;
		try {
			const res = await fetch(configApi, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					branchId,
					module: activeModule,
					formulaTemplateId: tid
				})
			});
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Save failed (${res.status})`);
			}
			toastService.addToast(
				m.inv_pricing_assignment_saved(),
				StatusColorEnum.SUCCESS
			);
			await loadAssignment();
			await loadTemplates();
			await loadOverview();
		} catch (err) {
			toastService.addToast(
				err instanceof Error ? err.message : m.delete_failed(),
				StatusColorEnum.ERROR
			);
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex flex-col gap-4 p-4">
	<div>
		<h1 class="text-xl font-semibold">{m.inv_pricing_config_title()}</h1>
		{#if currentHospitalName}
			<p class="mt-1 text-sm opacity-70">
				{m.inv_pricing_assignment_filter_hospital()}: {currentHospitalName}
			</p>
		{/if}
	</div>

	<div
		bind:this={assignmentSectionEl}
		class:hidden={!showAssignmentPanel}
		class="flex flex-col gap-4"
	>
		<WashCard>
			<WashCardBody className="flex flex-col gap-4">
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
				<label class="shrink-0 sm:w-40">{m.inv_pricing_config_branch()}</label>
				<div class="max-w-md flex-1">
					{#if branchSelectDisabled && lockedBranchLabel}
						<p class="text-sm">{lockedBranchLabel}</p>
						<p class="text-xs opacity-60">
							{m.inv_pricing_config_branch_locked_hint({
								branch: lockedBranchLabel
							})}
						</p>
					{:else}
						<WashSearchSelect
							bind:value={branchId}
							options={branchOptions}
							placeholder={m.inv_pricing_config_branch_placeholder()}
							disabled={branchSelectDisabled}
						/>
					{/if}
				</div>
			</div>

			<div class="flex flex-wrap gap-2">
				{#each INV_PRICING_MODULE_CODES as mod (mod)}
					<button
						type="button"
						class="btn btn-sm {activeModule === mod
							? 'btn-primary'
							: 'btn-ghost'}"
						onclick={() => {
							activeModule = mod;
						}}
					>
						{moduleLabel(mod)}
					</button>
				{/each}
			</div>

			{#if !branchId}
				<p class="text-sm text-warning">
					{m.inv_pricing_config_select_branch()}
				</p>
			{:else if assignmentLoading}
				<div class="flex justify-center py-10">
					<span class="loading loading-spinner loading-lg text-primary"></span>
				</div>
			{:else}
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<label class="shrink-0 sm:w-40">{m.inv_pricing_assignment_template()}</label>
					<div class="max-w-lg flex-1">
						<WashSearchSelect
							bind:value={templateIdStr}
							options={templateOptions}
							placeholder={m.inv_pricing_assignment_template_placeholder()}
						/>
					</div>
				</div>

				{#if templateOptions.length === 0}
					<p class="text-sm text-warning">
						{m.inv_pricing_assignment_unassigned_warning()}
					</p>
				{/if}

				{#if !assignment}
					<p class="text-sm text-warning">
						{m.inv_pricing_assignment_unassigned_warning()}
					</p>
				{/if}

				{#if selectedTemplate}
					<div class="rounded-md border border-base-300 p-3 text-sm">
						<p class="mb-2 font-medium">{m.inv_pricing_template_formula()}</p>
						<PricingFormulaDisplay
							input={{
								includeDiscount: selectedTemplate.includeDiscount,
								includeTax: selectedTemplate.includeTax,
								includeFreeQty: selectedTemplate.includeFreeQty,
								includeItemMarkup: selectedTemplate.includeItemMarkup,
								includeStoreMarkup: selectedTemplate.includeStoreMarkup,
								mslMarkupPercent: selectedTemplate.mslMarkupPercent
							}}
						/>
					</div>
				{/if}

				<div class="flex justify-end">
					<WashButton
						type="button"
						className="btn-primary"
						loading={saving}
						onClick={() => saveAssignment()}
					>
						{m.inv_pricing_config_save()}
					</WashButton>
				</div>
			{/if}
		</WashCardBody>
	</WashCard>
	</div>

	<WashCard>
		<WashCardBody className="flex flex-col gap-3">
			<div class={TableEnum.HEIGHT}>
				<MenziesTable
					rows={filteredOverviewRows}
					columns={overviewColumns}
					isLoading={overviewLoading}
					bind:pageSize={overviewPageSizeStr}
					bind:currentPage={overviewPage}
					bind:columnFilters={overviewTableFilters}
					showRefreshButton={true}
					refreshTooltip={m.refresh_data()}
					emptyMessage="—"
					showRowActions={true}
					actionsVariant="crud"
					enableColumnFilters={true}
					useRemoteFilters={false}
					crudDeleteDisabled={() => true}
					rowClassGetter={(row) =>
						(row as ModulePricingAssignmentOverviewRow).formulaTemplateId ==
						null
							? 'bg-warning/10'
							: ''}
					on:refresh={() => loadOverview()}
					on:view={(e) => void openOverviewView(e.detail)}
					on:edit={(e) => configureFromOverview(e.detail)}
					on:filtersChange={(e) => {
						overviewTableFilters = e.detail.filters;
						overviewPage = 1;
					}}
				/>
			</div>
		</WashCardBody>
	</WashCard>
</div>
