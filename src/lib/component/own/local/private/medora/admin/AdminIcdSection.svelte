<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
	import {
		DIAGNOSIS_CODING_SYSTEM_VALUES,
		DiagnosisCodingSystemEnum,
		type DiagnosisCodingSystem
	} from '$lib/model/enum/diagnosis-coding-system.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type {
		AdminIcdCodeRow,
		AdminIcdListResponse,
		AdminIcdReseedResponse
	} from '$lib/model/type/medora/admin-icd.type';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { paraglideMessages } from '$lib/util/paraglide-msg.util';

	const msg = paraglideMessages();
	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	type SystemTab = DiagnosisCodingSystem;

	let activeSystem = $state<SystemTab>(DiagnosisCodingSystemEnum.ICD10);
	let listResult = $state<AdminIcdListResponse | null>(null);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(true);
	let reseeding = $state(false);
	let tableFilters = $state<Record<string, string>>({});

	const rows = $derived(listResult?.data ?? []);
	const total = $derived(listResult?.total ?? 0);
	const systemTotals = $derived(
		listResult?.systemTotals ?? {
			ICD10: 0,
			ICD10_CM: 0,
			ICD11: 0
		}
	);

	function systemTabLabel(system: DiagnosisCodingSystem): string {
		if (system === DiagnosisCodingSystemEnum.ICD10_CM) {
			return msg.hospital_coding_system_icd10_cm();
		}
		if (system === DiagnosisCodingSystemEnum.ICD11) {
			return msg.hospital_coding_system_icd11();
		}
		return msg.hospital_coding_system_icd10();
	}
	const latestRelease = $derived(
		listResult?.latestReleases?.find((r) => r.system === activeSystem) ??
			null
	);

	const isSystemAdmin = $derived(
		(page.data as { userRoleId?: number | null })?.userRoleId ===
			RoleEnum.SYSTEM_ADMIN
	);

	const icdColumns: MenziesTableColumn<AdminIcdCodeRow>[] = [
		{
			id: 'code',
			header: msg.admin_icd_col_code(),
			widthClass: 'w-28 min-w-[6rem]',
			filterable: true,
			filterType: 'text',
			field: 'code',
			format: (v) => (v != null && String(v).trim() ? String(v) : '-')
		},
		{
			id: 'description',
			header: msg.admin_icd_col_description(),
			widthClass: 'min-w-[16rem]',
			filterable: true,
			filterType: 'text',
			field: 'description',
			format: (v) => (v != null && String(v).trim() ? String(v) : '-')
		},
		{
			id: 'system',
			header: msg.admin_icd_col_version(),
			widthClass: 'w-28 min-w-[6rem]',
			filterable: false,
			field: 'system',
			format: (v) => String(v ?? '-')
		},
		{
			id: 'releaseId',
			header: msg.admin_icd_col_release(),
			widthClass: 'w-36 min-w-[8rem]',
			filterable: false,
			field: 'releaseId',
			format: (v) => (v != null && String(v).trim() ? String(v) : '-')
		},
		{
			id: 'statusId',
			header: msg.status(),
			widthClass: 'w-28 min-w-[7rem]',
			filterable: true,
			filterType: 'select',
			filterOptions: [
				{ label: msg.active_label(), value: String(StatusEnum.ACTIVE) },
				{
					label: msg.inactive_label(),
					value: String(StatusEnum.INACTIVE)
				}
			],
			defaultFilterValue: String(StatusEnum.ACTIVE),
			format: (_v, row) =>
				row.statusId === StatusEnum.ACTIVE
					? msg.active_label()
					: row.statusId === StatusEnum.INACTIVE
						? msg.inactive_label()
						: `${msg.status()} ${row.statusId ?? msg.unknown_label()}`
		}
	];

	async function loadCodes(forceRefresh = false) {
		isLoading = true;
		try {
			const pageSize = Number(pageSizeStr) || 10;
			const parsedStatusId = tableFilters.statusId
				? Number(tableFilters.statusId)
				: undefined;
			const url = new URL(
				'/api/medora/admin/icd',
				window.location.origin
			);
			url.searchParams.set('page', String(currentPage));
			url.searchParams.set('pageSize', String(pageSize));
			url.searchParams.set('system', activeSystem);
			if (tableFilters.code?.trim()) {
				url.searchParams.set('code', tableFilters.code.trim());
			}
			if (tableFilters.description?.trim()) {
				url.searchParams.set(
					'description',
					tableFilters.description.trim()
				);
			}
			if (
				parsedStatusId != null &&
				Number.isFinite(parsedStatusId)
			) {
				url.searchParams.set('statusId', String(parsedStatusId));
			}
			if (forceRefresh) {
				url.searchParams.set('_t', String(Date.now()));
			}
			const res = await fetch(url, {
				method: 'GET',
				credentials: 'include'
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			listResult = (await res.json()) as AdminIcdListResponse;
		} finally {
			isLoading = false;
		}
	}

	function selectSystem(system: SystemTab) {
		if (activeSystem === system) return;
		activeSystem = system;
		currentPage = 1;
		void loadCodes(true);
	}

	async function confirmReseed() {
		if (!isSystemAdmin || reseeding) return;
		const result = await dialogService.open({
			title: msg.admin_icd_reseed_title(),
			message: msg.admin_icd_reseed_confirm({
				system: activeSystem
			}),
			variant: DialogVariantEnum.CONFIRM,
			tone: 'error'
		});
		if (!result.confirmed) return;

		reseeding = true;
		try {
			const res = await fetch('/api/medora/admin/icd', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ system: activeSystem })
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			const body = (await res.json()) as AdminIcdReseedResponse;
			toastService.addToast(
				msg.admin_icd_reseed_success({
					inserted: String(body.inserted),
					updated: String(body.updated),
					total: String(body.total)
				}),
				StatusColorEnum.SUCCESS
			);
			await loadCodes(true);
		} catch (err) {
			const errMsg =
				err instanceof Error
					? err.message
					: msg.admin_icd_reseed_failed();
			toastService.addToast(errMsg, StatusColorEnum.ERROR);
		} finally {
			reseeding = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		void loadCodes();
	});
</script>

<div class="flex flex-col gap-3">
	<div
		class="flex flex-col gap-3 rounded-box border border-ink-border bg-base-100/80 p-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
	>
		<div
			role="tablist"
			class="tabs tabs-box tabs-sm w-full max-w-3xl flex-wrap"
			aria-label={msg.admin_icd_tabs_aria()}
		>
			{#each DIAGNOSIS_CODING_SYSTEM_VALUES as system (system)}
				<button
					type="button"
					role="tab"
					class="tab cursor-pointer"
					class:tab-active={activeSystem === system}
					aria-selected={activeSystem === system}
					onclick={() => selectSystem(system)}
				>
					{systemTabLabel(system)}
					<span class="badge badge-ghost badge-sm ml-1">
						{systemTotals[system] ?? 0}
					</span>
				</button>
			{/each}
		</div>

		{#if isSystemAdmin}
			<WashButton
				variant="error"
				size="sm"
				className={reseeding ? 'cursor-not-allowed' : 'cursor-pointer'}
				disabled={reseeding}
				loading={reseeding}
				onClick={confirmReseed}
			>
				{msg.admin_icd_reseed_action()}
			</WashButton>
		{/if}
	</div>

	{#if latestRelease}
		<p class="text-xs text-base-content/60">
			{msg.admin_icd_release_meta({
				releaseId: latestRelease.releaseId,
				source: latestRelease.source,
				titleCount: String(latestRelease.titleCount)
			})}
		</p>
	{/if}

	<div class="{TableEnum.HEIGHT} min-h-[24rem]">
		<MenziesTable
			title={msg.admin_icd_table_title({ system: activeSystem })}
			wash={true}
			showAddButton={false}
			rows={rows}
			columns={icdColumns}
			{isLoading}
			bind:pageSize={pageSizeStr}
			bind:currentPage
			totalRowCount={total}
			showRefreshButton={true}
			refreshTooltip={msg.refresh_data()}
			emptyMessage={msg.admin_icd_empty()}
			showRowActions={false}
			enableColumnFilters={true}
			on:refresh={() => loadCodes(true)}
			on:pageSizeChange={() => {
				currentPage = 1;
				void loadCodes(true);
			}}
			on:pageChange={() => void loadCodes(true)}
			on:filtersChange={(e) => {
				tableFilters = e.detail.filters;
				currentPage = 1;
				void loadCodes(true);
			}}
		/>
	</div>

	<p class="text-xs text-base-content/55">
		{msg.icd_who_attribution()}
	</p>
	<p class="text-xs text-base-content/55">
		{msg.icd_cm_attribution()}
	</p>
	<p class="text-xs text-base-content/50">
		{msg.admin_icd_reseed_hint()}
	</p>
</div>
