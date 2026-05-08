<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCardBodyAction from '$lib/component/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import type { FinancialYearListRow } from '$lib/model/type/heka/ui-rows.type';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' && page.params.hospital_id
			? page.params.hospital_id
			: ''
	);

	async function apiFetch<T>(
		url: string,
		init?: RequestInit
	): Promise<T> {
		const res = await fetch(url, {
			...init,
			headers: {
				...(init?.headers ?? {}),
				...(init?.body ? { 'content-type': 'application/json' } : {})
			}
		});
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(text || res.statusText);
		}
		return (await res.json()) as T;
	}

	function financialYearApiUrl() {
		return `/api/heka/hospital/${hospitalId}/home/administration/financial-year`;
	}

	let items = $state<FinancialYearListRow[]>([]);
	let isLoading = $state(false);
	let viewMode = $state<'list' | 'create' | 'edit'>('list');
	let editingId = $state<number | null>(null);

	let codeInput = $state('');
	let startDateInput = $state('');
	let endDateInput = $state('');

	const saveLock = createActionLock();
	const deleteLock = createActionLock();

	async function fetchData(opts?: { bustCache?: boolean }) {
		if (!hospitalId) return;
		isLoading = true;
		try {
			items = await apiFetch<FinancialYearListRow[]>(financialYearApiUrl());
		} finally {
			isLoading = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		fetchData();
	});

	function resetForm() {
		viewMode = 'list';
		editingId = null;
		codeInput = '';
		startDateInput = '';
		endDateInput = '';
	}

	function startCreate() {
		resetForm();
		viewMode = 'create';
	}

	function startEdit(item: FinancialYearListRow) {
		viewMode = 'edit';
		editingId = item.id;
		codeInput = item.code ?? '';
		startDateInput = item.startDate ? String(item.startDate).slice(0, 10) : '';
		endDateInput = item.endDate ? String(item.endDate).slice(0, 10) : '';
	}

	async function handleSave() {
		if (!codeInput.trim()) {
			toastService.addToast(
				m.toast_code_required(),
				StatusColorEnum.WARNING
			);
			return;
		}

		const isValidDate = (v: string) => !v || /^\d{4}-\d{2}-\d{2}(T|$)/.test(v);
		if (startDateInput && !isValidDate(startDateInput)) {
			toastService.addToast(
				m.toast_invalid_date_format_full(),
				StatusColorEnum.WARNING
			);
			return;
		}
		if (endDateInput && !isValidDate(endDateInput)) {
			toastService.addToast(
				m.toast_invalid_date_format_full(),
				StatusColorEnum.WARNING
			);
			return;
		}
		await saveLock.run(async () => {
			if (!hospitalId) {
				toastService.addToast(
					m.toast_missing_hospital_context(),
					StatusColorEnum.WARNING
				);
				return;
			}
			const payload = {
				code: codeInput.trim(),
				startDate: startDateInput || null,
				endDate: endDateInput || null
			};
			if (editingId != null) {
				await apiFetch(financialYearApiUrl(), {
					method: 'PUT',
					body: JSON.stringify({ id: editingId, ...payload })
				});
				toastSuccess(
					toastService,
					m.entity_financial_year(),
					m.toast_action_updated()
				);
			} else {
				await apiFetch(financialYearApiUrl(), {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				toastSuccess(
					toastService,
					m.entity_financial_year(),
					m.toast_action_created()
				);
			}
			resetForm();
			fetchData({ bustCache: true });
		});
	}

	async function handleDelete(item: FinancialYearListRow) {
		await deleteLock.run(async () => {
			const result = await dialogService.open({
				title: 'Delete financial year',
				message: `Are you sure you want to delete ${item.code ?? ''}?`,
				variant: DialogVariantEnum.CONFIRM
			});
			if (!result.confirmed) return;
			await apiFetch(financialYearApiUrl(), {
				method: 'DELETE',
				body: JSON.stringify({ id: item.id })
			});
			toastSuccess(
				toastService,
				m.entity_financial_year(),
				m.toast_action_deleted()
			);
			fetchData({ bustCache: true });
		});
	}

	const columns: MariTableColumn<FinancialYearListRow>[] = [
		{
			id: 'code',
			header: 'Code',
			field: 'code',
			format: (v, row) => row.code ?? ''
		},
		{
			id: 'startDate',
			header: 'Start Date',
			field: 'startDate',
			format: (v, row) => row.startDate ?? ''
		},
		{
			id: 'endDate',
			header: 'End Date',
			field: 'endDate',
			format: (v, row) => row.endDate ?? ''
		}
	];
</script>

{#if viewMode === 'list'}
	<div class="mb-4 flex items-center justify-between">
		<div>
			<h1 class="text-lg font-semibold">Financial Year</h1>
			<p class="text-sm text-base-content/70">
				Configure financial years for this hospital.
			</p>
		</div>
		<DaisyUiButton
			className="d-btn-primary d-btn-sm"
			onClick={startCreate}
		>
			<LucidePlus className="size-4" />
			Create
		</DaisyUiButton>
	</div>

	<div class={TableEnum.HEIGHT}>
		<MariTable
			{columns}
			rows={items}
			{isLoading}
			showRowActions={true}
			actionsVariant="none"
		>
			{#snippet rowActions(row, rowIndex)}
				<div class="flex items-center gap-2">
					<DaisyUiButton
						className="d-btn-ghost d-btn-sm"
						onClick={() => startEdit(row)}
					>
						<LucidePencil className="size-4" />
					</DaisyUiButton>
					<DaisyUiButton
						className="d-btn-ghost d-btn-sm d-btn-error"
						onClick={() => handleDelete(row)}
					>
						<LucideTrash2 className="size-4" />
					</DaisyUiButton>
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
						{editingId != null ? 'Edit Financial Year' : 'Create Financial Year'}
					</DaisyUiCardBodyTitle>
				</fieldset>
				<div
					class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10"
				>
					<fieldset class="m-0 min-w-0 flex-1 border-0 p-0">
						<div
							class="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3"
						>
							<div class="flex flex-col gap-4">
								<div
									class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
								>
									<DaisyUiLabel className="shrink-0 sm:w-36"
										>Code</DaisyUiLabel
									>
									<div class="max-w-80 flex-1">
										<DaisyUiInputField
											bind:value={codeInput}
											inputType="text"
											inputPlaceholderText="FY24-25"
										/>
									</div>
								</div>
								<div
									class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
								>
									<DaisyUiLabel className="shrink-0 sm:w-36"
										>Start Date</DaisyUiLabel
									>
									<div class="max-w-80 flex-1">
										<DaisyUiInputField
											inputType="date"
											bind:value={startDateInput}
										/>
									</div>
								</div>
								<div
									class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
								>
									<DaisyUiLabel className="shrink-0 sm:w-36"
										>End Date</DaisyUiLabel
									>
									<div class="max-w-80 flex-1">
										<DaisyUiInputField
											inputType="date"
											bind:value={endDateInput}
										/>
									</div>
								</div>
							</div>
						</div>
					</fieldset>
				</div>

				<DaisyUiCardBodyAction className="mt-6 flex flex-wrap gap-3">
					<DaisyUiButton
						type="submit"
						className="d-btn-wide {editingId != null
							? 'd-btn-accent'
							: 'd-btn-primary'}"
					>
						{editingId != null ? m.update() : m.create()}
					</DaisyUiButton>
					<DaisyUiButton
						type="button"
						className="d-btn-outline d-btn-wide"
						onClick={resetForm}
					>
						{m.cancel()}
					</DaisyUiButton>
				</DaisyUiCardBodyAction>
			</form>
		</DaisyUiCardBody>
	</DaisyUiCard>
{/if}
