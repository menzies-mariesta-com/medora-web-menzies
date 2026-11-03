<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTable from '$lib/component/wash/table/WashTable.svelte';
	import WashTableHeader from '$lib/component/wash/table/head/WashTableHeader.svelte';
	import WashTableBody from '$lib/component/wash/table/body/WashTableBody.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import {
		INV_APPROVAL_MODULE_CODES,
		type InvApprovalModule
	} from '$lib/model/type/medora/inv-approval.type';
	import type { InvApprovalStaffMatrixDto } from '$lib/model/type/medora/inv-approval-config.type';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { m } from '$lib/paraglide/messages';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { toastLine } from '$lib/util/toast-copy.util';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import {
		throwUserFacingHttpError,
		toUserFacingErrorDetail
	} from '$lib/util/user-facing-error.util';

	const toastService = new ToastService();
	const saveLock = createActionLock();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/inventory-setup/approval-config`
			: ''
	);

	let staffId = $state('');

	let stores = $state<InvApprovalStaffMatrixDto['stores']>([]);
	let modules = $state<InvApprovalModule[]>([...INV_APPROVAL_MODULE_CODES]);
	let canApproveByKey = $state<Record<string, boolean>>({});

	let matrixLoading = $state(false);
	let loadError = $state<string | null>(null);
	let storeFilterQuery = $state('');

	const filteredStores = $derived.by(() => {
		const q = storeFilterQuery.trim().toLowerCase();
		if (!q) return stores;
		return stores.filter((s) => {
			const label = String(s.storeName ?? s.id).toLowerCase();
			return label.includes(q);
		});
	});

	function matrixKey(storeId: number, module: InvApprovalModule): string {
		return `${storeId}:${module}`;
	}

	function invApprovalModuleLabel(mod: InvApprovalModule): string {
		switch (mod) {
			case 'PR':
				return m.inv_approval_config_module_pr();
			case 'PO':
				return m.inv_approval_config_module_po();
			case 'DI':
				return m.inv_approval_config_module_di();
			case 'DISS':
				return m.inv_approval_config_module_diss();
			case 'RFS':
				return m.inv_approval_config_module_rfs();
			case 'GRN':
				return m.inv_approval_config_module_grn();
			case 'DC':
				return m.inv_approval_config_module_dc();
			default: {
				const _n: never = mod;
				return _n;
			}
		}
	}

	function moduleHeaderShort(mod: InvApprovalModule): string {
		return mod;
	}

	async function loadMatrix(forStaffId: string) {
		if (!apiBase || !forStaffId) return;
		matrixLoading = true;
		loadError = null;
		storeFilterQuery = '';
		try {
			const res = await fetch(
				`${apiBase}?mode=staffMatrix&staffId=${encodeURIComponent(forStaffId)}`,
				{ credentials: 'include', cache: 'no-store' }
			);
			if (!res.ok) await throwUserFacingHttpError(res);
			const data = (await res.json()) as InvApprovalStaffMatrixDto;
			stores = data.stores ?? [];
			modules = data.modules?.length
				? data.modules
				: [...INV_APPROVAL_MODULE_CODES];
			const next: Record<string, boolean> = {};
			for (const cell of data.cells ?? []) {
				next[matrixKey(cell.storeId, cell.module)] = cell.canApprove;
			}
			canApproveByKey = next;
		} catch (err) {
			console.error(err);
			loadError =
				toUserFacingErrorDetail(err) ?? m.error_load_failed();
			stores = [];
			canApproveByKey = {};
		} finally {
			matrixLoading = false;
		}
	}

	$effect(() => {
		const id = staffId;
		if (id) {
			loadMatrix(id);
		} else {
			stores = [];
			canApproveByKey = {};
			loadError = null;
			storeFilterQuery = '';
		}
	});

	function setCell(
		storeId: number,
		module: InvApprovalModule,
		checked: boolean
	) {
		canApproveByKey = {
			...canApproveByKey,
			[matrixKey(storeId, module)]: checked
		};
	}

	function setBulkForStores(
		targetStores: InvApprovalStaffMatrixDto['stores'],
		checked: boolean
	) {
		const next: Record<string, boolean> = { ...canApproveByKey };
		for (const store of targetStores) {
			for (const module of modules) {
				next[matrixKey(store.id, module)] = checked;
			}
		}
		canApproveByKey = next;
	}

	function selectAllVisible() {
		setBulkForStores(filteredStores, true);
	}

	function deselectAllVisible() {
		setBulkForStores(filteredStores, false);
	}

	async function handleSave() {
		if (!apiBase || !staffId) {
			toastService.addToast(
				m.inv_approval_config_select_staff(),
				StatusColorEnum.WARNING
			);
			return;
		}
		await saveLock.run(async () => {
			const cells = stores.flatMap((store) =>
				modules.map((module) => ({
					storeId: store.id,
					module,
					canApprove:
						canApproveByKey[matrixKey(store.id, module)] ?? false
				}))
			);
			try {
				const res = await fetch(apiBase, {
					method: 'PUT',
					credentials: 'include',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ staffId, cells })
				});
				if (!res.ok) await throwUserFacingHttpError(res);
				toastService.addToast(
					toastLine(
						m.inv_page_approval_config_title(),
						m.toast_action_saved()
					),
					StatusColorEnum.SUCCESS
				);
				await loadMatrix(staffId);
			} catch (err) {
				console.error(err);
				toastService.addErrorToast(m.error_save_failed(), err);
			}
		});
	}
</script>

<div class="flex min-h-0 flex-col gap-3">
	<div class="flex shrink-0 flex-col gap-1 sm:max-w-md">
		<label class="text-xs opacity-70" for="a11y-approval-staff"
			>{m.inv_approval_config_staff_label()}</label
		>
		<SearchSelect
			inputId="a11y-approval-staff"
			placeholder={m.inv_approval_config_staff_placeholder()}
			className="input-sm w-full"
			bind:value={staffId}
			searchFn={async (q) => {
				if (!hospitalId) return [];
				const qEnc = encodeURIComponent(q.trim());
				const res = await fetch(
					`/api/medora/hospital/${hospitalId}/home/administration/staff/list?search=${qEnc}&pageSize=${AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT}`,
					{ credentials: 'include' }
				);
				if (!res.ok) return [];
				const data = await res.json();
				return (data.data ?? []).map(
					(s: {
						id: string;
						firstName?: string | null;
						middleName?: string | null;
						lastName?: string | null;
						code?: string | null;
					}) => {
						const name =
							StringUtil.fullName(
								s.firstName,
								s.middleName,
								s.lastName
							) || s.id;
						const code = (s.code ?? '').trim();
						const label =
							code && name ? `${code} — ${name}` : name || code;
						return { label, value: s.id };
					}
				);
			}}
		/>
	</div>

	<div class={TableEnum.HEIGHT}>
		<div
			class="border-base-300 flex h-full min-h-0 flex-col overflow-hidden rounded-box border bg-base-100 shadow-sm"
		>
			<div
				class="border-base-300 shrink-0 border-b px-3 py-2.5"
			>
				<h2 class="text-base font-bold">{m.inv_page_approval_config_title()}</h2>
				<p class="text-ink-muted mt-0.5 text-xs">
					{m.inv_approval_config_intro()}
				</p>
			</div>

			<div class="min-h-0 flex-1 overflow-auto">
				{#if !staffId}
					<p class="text-ink-muted p-4 text-sm">
						{m.inv_approval_config_select_staff()}
					</p>
				{:else if matrixLoading}
					<div class="flex justify-center p-10">
						<span class="loading loading-spinner loading-lg text-primary"
						></span>
					</div>
				{:else if loadError}
					<p class="text-error p-4 text-sm">{loadError}</p>
				{:else if stores.length === 0}
					<p class="text-ink-muted p-4 text-sm">—</p>
				{:else}
					<div
						class="border-base-300 bg-base-100 sticky top-0 z-20 flex flex-wrap items-end gap-2 border-b px-3 py-2"
					>
						<div class="form-control w-full max-w-xs min-w-48">
							<label class="label py-0" for="a11y-approval-store-filter">
								<span class="label-text text-xs">{m.inv_common_store()}</span>
							</label>
							<input
								id="a11y-approval-store-filter"
								type="search"
								class="input input-bordered input-sm w-full"
								placeholder={m.inv_approval_config_store_filter_placeholder()}
								bind:value={storeFilterQuery}
							/>
						</div>
						<WashButton
							type="button"
							className="btn-outline btn-sm"
							disabled={saveLock.pending || filteredStores.length === 0}
							onClick={selectAllVisible}
						>
							{m.inv_approval_config_select_all()}
						</WashButton>
						<WashButton
							type="button"
							className="btn-outline btn-sm"
							disabled={saveLock.pending || filteredStores.length === 0}
							onClick={deselectAllVisible}
						>
							{m.inv_approval_config_deselect_all()}
						</WashButton>
					</div>
					{#if filteredStores.length === 0}
						<p class="text-ink-muted p-4 text-sm">—</p>
					{:else}
					<WashTable
						useRecipe={false}
						className="table table-zebra w-max min-w-full"
					>
						<WashTableHeader className="bg-base-100 sticky top-0 z-10">
							<tr>
								<th class="text-left align-middle">
									<span class="font-bold"
										>{m.inv_approval_config_matrix_store_col()}</span
									>
								</th>
								{#each modules as mod (mod)}
									<th
										class="text-center align-middle whitespace-nowrap px-2"
										title={invApprovalModuleLabel(mod)}
									>
										<span class="text-xs font-bold"
											>{moduleHeaderShort(mod)}</span
										>
									</th>
								{/each}
							</tr>
						</WashTableHeader>
						<WashTableBody>
							{#each filteredStores as store (store.id)}
								<tr>
									<td class="whitespace-nowrap align-middle text-sm">
										{store.storeName ?? store.id}
									</td>
									{#each modules as mod (mod)}
										<td class="text-center align-middle">
											<input
												type="checkbox"
												class="checkbox checkbox-sm checkbox-primary"
												checked={canApproveByKey[
													matrixKey(store.id, mod)
												] ?? false}
												onchange={(e) =>
													setCell(
														store.id,
														mod,
														e.currentTarget.checked
													)}
												aria-label="{store.storeName ?? store.id} — {invApprovalModuleLabel(mod)}"
											/>
										</td>
									{/each}
								</tr>
							{/each}
						</WashTableBody>
					</WashTable>
					{/if}
				{/if}
			</div>

			{#if staffId && !matrixLoading && stores.length > 0}
				<div
					class="border-base-300 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t px-3 py-2.5"
				>
					<WashButton
						type="button"
						className="btn-primary"
						loading={saveLock.pending}
						disabled={saveLock.pending}
						onClick={handleSave}
					>
						{m.save()}
					</WashButton>
				</div>
			{/if}
		</div>
	</div>
</div>
