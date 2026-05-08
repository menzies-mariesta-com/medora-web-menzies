<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import MariTable, { type MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCardBodyAction from '$lib/component/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiCheckbox from '$lib/component/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import DaisyUiBadge from '$lib/component/daisyui/badge/DaisyUiBadge.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { toastLine } from '$lib/util/toast-copy.util';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import type { InvApprovalModule } from '$lib/model/type/heka/inv-approval.type';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);

	type AssigneeRow = {
		id: number;
		levelId: number;
		staffId: string;
		firstName: string | null;
		middleName: string | null;
		lastName: string | null;
		code: string | null;
	};

	type LevelRow = {
		id: number;
		storeId: number;
		module: InvApprovalModule;
		isRequired: boolean;
		assignees: AssigneeRow[];
	};

	let stores = $state<{ id: number; storeName: string | null }[]>([]);
	let storeId = $state<number | null>(null);
	let module = $state<InvApprovalModule>('PR');

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

	let items = $state<LevelRow[]>([]);
	let isLoading = $state(false);
	let viewMode = $state<'list' | 'create' | 'edit'>('list');
	let editingId = $state<number | null>(null);

	let isRequiredInput = $state(true);

	// Staff assignees state for creation/edit
	let assigneeStaffs = $state<{ id: string; name: string }[]>([]);

	const saveLock = createActionLock();
	const deleteLock = createActionLock();

	async function loadStores() {
		if (!hospitalId) return;
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/approval-config?mode=stores`,
			{ method: 'GET' }
		);
		stores = (await res.json()) as typeof stores;
		if (stores.length && storeId == null) storeId = stores[0].id;
	}

	async function fetchData() {
		if (!hospitalId || storeId == null) return;
		isLoading = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory-setup/approval-config?storeId=${storeId}&module=${module}`,
				{ method: 'GET' }
			);
			items = await res.json();
		} finally {
			isLoading = false;
		}
	}

	lifeCycleUtil.onMount(async () => {
		await loadStores();
		fetchData();
	});

	$effect(() => {
		if (storeId != null && module) {
			fetchData();
		}
	});

	function resetForm() {
		viewMode = 'list';
		editingId = null;
		isRequiredInput = true;
		assigneeStaffs = [];
	}

	function startCreate() {
		resetForm();
		viewMode = 'create';
	}

	function startEdit(item: LevelRow) {
		viewMode = 'edit';
		editingId = item.id;
		isRequiredInput = item.isRequired;
		assigneeStaffs = item.assignees.map((a) => ({
			id: a.staffId,
			name: StringUtil.fullName(a.firstName, a.middleName, a.lastName) || a.staffId
		}));
	}

	function addAssignee(staff: { id: string; name: string }) {
		if (!assigneeStaffs.find((s) => s.id === staff.id)) {
			assigneeStaffs = [...assigneeStaffs, staff];
		}
	}

	function removeAssignee(staffId: string) {
		assigneeStaffs = assigneeStaffs.filter((s) => s.id !== staffId);
	}

	async function handleSave() {
		if (storeId == null) {
			toastService.addToast(
				m.toast_field_required(),
				StatusColorEnum.WARNING,
				m.entity_store()
			);
			return;
		}

		await saveLock.run(async () => {
			const payload = {
				storeId,
				module,
				isRequired: isRequiredInput,
				id: editingId != null ? editingId : undefined,
				assigneeStaffIds: assigneeStaffs.map((s) => s.id)
			};
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory-setup/approval-config`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				}
			);
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as {
					message?: string;
					error?: string;
				};
				toastService.addToast(
					toastLine(
						m.inv_page_approval_config_title(),
						m.toast_action_saved_failed()
					),
					StatusColorEnum.ERROR,
					body.message || body.error || ''
				);
				return;
			}
			toastService.addToast(
				toastLine(
					m.inv_page_approval_config_title(),
					editingId != null
						? m.toast_action_updated()
						: m.toast_action_created()
				),
				StatusColorEnum.SUCCESS
			);
			resetForm();
			fetchData();
		});
	}

	async function handleDelete(item: LevelRow) {
		await deleteLock.run(async () => {
			const result = await dialogService.open({
				title: 'Delete Approval config',
				message: 'Are you sure you want to delete this approval config?',
				variant: DialogVariantEnum.CONFIRM
			});
			if (!result.confirmed) return;
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory-setup/approval-config`,
				{
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ levelId: item.id })
				}
			);
			if (!res.ok) {
				toastService.addToast(
					toastLine(
						m.inv_page_approval_config_title(),
						m.toast_action_deleted_failed()
					),
					StatusColorEnum.ERROR
				);
				return;
			}
			toastService.addToast(
				toastLine(
					m.inv_page_approval_config_title(),
					m.toast_action_deleted()
				),
				StatusColorEnum.SUCCESS
			);
			fetchData();
		});
	}

	const columns: MariTableColumn<LevelRow>[] = [
		{
			id: 'isRequired',
			header: 'Is Required',
			field: 'isRequired',
			format: (v, row) => (row.isRequired ? 'Yes' : 'No')
		},
		{
			id: 'assignees',
			header: 'Assignees',
			field: 'assignees',
			format: (v, row) => {
				return row.assignees
					.map((a) => StringUtil.fullName(a.firstName, a.middleName, a.lastName) || a.staffId)
					.join(', ') || '—';
			}
		}
	];
</script>

{#if viewMode === 'list'}
	<div class="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<h1 class="text-lg font-semibold">{m.inv_page_approval_config_title()}</h1>
			<p class="text-sm text-base-content/70">
				{m.inv_approval_config_intro()}
			</p>
			<p class="text-sm font-medium text-base-content/80 mt-1">
				{invApprovalModuleLabel(module)}
			</p>
		</div>
		<div class="flex items-center gap-3">
			<label class="form-control w-full max-w-xs">
				<div class="label"><span class="label-text">{m.inv_common_store()}</span></div>
				<DaisyUiSelect className="select-sm" bind:value={storeId}>
					{#each stores as s (s.id)}
						<option value={s.id}>{s.storeName ?? s.id}</option>
					{/each}
				</DaisyUiSelect>
			</label>
			<label class="form-control w-full min-w-48 max-w-sm">
				<div class="label"><span class="label-text">{m.inv_approval_config_module_label()}</span></div>
				<DaisyUiSelect className="select-sm" bind:value={module}>
					<option value="PR">{m.inv_approval_config_module_pr()}</option>
					<option value="PO">{m.inv_approval_config_module_po()}</option>
					<option value="DI">{m.inv_approval_config_module_di()}</option>
					<option value="DISS">{m.inv_approval_config_module_diss()}</option>
					<option value="RFS">{m.inv_approval_config_module_rfs()}</option>
					<option value="GRN">{m.inv_approval_config_module_grn()}</option>
					<option value="DC">{m.inv_approval_config_module_dc()}</option>
				</DaisyUiSelect>
			</label>
			<div class="flex items-end mt-7">
				<DaisyUiButton
					className="d-btn-primary d-btn-sm"
					disabled={items.length > 0}
					onClick={startCreate}
				>
					<LucidePlus className="size-4" />
					Create
				</DaisyUiButton>
			</div>
		</div>
	</div>

	<div class={TableEnum.HEIGHT}>
		<MariTable {columns} rows={items} {isLoading} showRowActions={true} actionsVariant="none">
			{#snippet rowActions(row, rowIndex)}
				<div class="flex flex-col items-center gap-1" data-row-index={rowIndex}>
					<DaisyUiTooltip tooltipText={m.inv_line_items_tooltip_edit()} className="d-tooltip-accent d-tooltip-right">
						<DaisyUiButton
							type="button"
							className="d-btn-sm d-btn-ghost d-btn-accent"
							onClick={() => startEdit(row)}
						>
							<LucidePencil className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>
					<DaisyUiTooltip tooltipText={m.inv_line_items_tooltip_delete()} className="d-tooltip-error d-tooltip-right">
						<DaisyUiButton
							type="button"
							className="d-btn-ghost d-btn-sm d-btn-error"
							onClick={() => handleDelete(row)}
						>
							<LucideTrash2 className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>
				</div>
			{/snippet}
		</MariTable>
	</div>
{:else}
	<DaisyUiCard>
		<DaisyUiCardBody>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSave();
				}}
			>
				<fieldset class="m-0 min-w-0 border-0 p-0">
					<DaisyUiCardBodyTitle className="mb-5">
						{editingId != null ? 'Edit Approval config' : 'Create Approval config'}
					</DaisyUiCardBodyTitle>
				</fieldset>
				<div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
					<fieldset class="m-0 min-w-0 flex-1 border-0 p-0">
						<div class="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
							<div class="flex flex-col gap-4">
								<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
									<DaisyUiLabel className="shrink-0 sm:w-36">Is Required</DaisyUiLabel>
									<div class="max-w-80 flex-1 flex items-center">
										<DaisyUiCheckbox bind:checked={isRequiredInput} />
									</div>
								</div>
							</div>
							<div class="flex flex-col gap-4">
								<div class="font-medium text-sm mb-1 text-base-content/70">Assignees</div>
								<div class="flex flex-wrap gap-2">
									{#each assigneeStaffs as s (s.id)}
										<DaisyUiBadge className="d-badge-primary d-badge-outline gap-1.5 py-3 hover:bg-primary/5 transition-colors">
											<span class="text-xs font-medium">{s.name}</span>
											<button
												type="button"
												class="hover:text-error transition-colors ml-0.5"
												onclick={() => removeAssignee(s.id)}
												aria-label="Remove assignee"
											>
												<LucideX className="size-3" />
											</button>
										</DaisyUiBadge>
									{:else}
										<div class="text-xs italic opacity-50 mb-1">No assignees added.</div>
									{/each}
								</div>
								
								<div class="mt-2">
									<DaisyUiLabel className="text-xs mb-1.5 opacity-70">Add Assignee</DaisyUiLabel>
									<DaisyUISearchSelect
										placeholder="Search staff by name or code..."
										className="input-sm w-full"
										searchFn={async (q) => {
											const qEnc = encodeURIComponent(q.trim());
											const res = await fetch(
												`/api/heka/hospital/${hospitalId}/home/administration/staff/list?search=${qEnc}&pageSize=${AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT}`
											);
											const data = await res.json();
											return (data.data ?? []).map((s: any) => {
												const name =
													StringUtil.fullName(s.firstName, s.middleName, s.lastName) || s.id;
												return {
													label: name,
													value: JSON.stringify({ id: s.id, name })
												};
											});
										}}
										onChange={(v) => {
											if (v) {
												try {
													const staff = JSON.parse(v);
													addAssignee(staff);
												} catch (e) {}
											}
										}}
										invalidateKey={viewMode}
									/>
								</div>
							</div>
						</div>
					</fieldset>
				</div>

				<DaisyUiCardBodyAction className="mt-6 flex flex-wrap gap-3">
					<DaisyUiButton
						type="submit"
						className="d-btn-wide {editingId != null ? 'd-btn-accent' : 'd-btn-primary'}"
					>
						{editingId != null ? m.update() : m.create()}
					</DaisyUiButton>
					<DaisyUiButton type="button" className="d-btn-outline d-btn-wide" onClick={resetForm}>
						{m.cancel()}
					</DaisyUiButton>
				</DaisyUiCardBodyAction>
			</form>
		</DaisyUiCardBody>
	</DaisyUiCard>
{/if}
