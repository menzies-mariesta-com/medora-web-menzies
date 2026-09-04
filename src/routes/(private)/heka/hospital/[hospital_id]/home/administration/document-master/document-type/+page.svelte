<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { m } from '$lib/paraglide/messages';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import { page } from '$app/state';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	type DocumentTypeRow = {
		id: number;
		documentType: string | null;
		statusId: number | null;
		createdAt?: string | null;
		updatedAt?: string | null;
	};

	let docTypeResult = $state<PaginatedResult<DocumentTypeRow> | null>(
		null
	);
	let currentPage = $state(1);
	let filterPageSize = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);
	let isLoading = $state(false);

	let isEditing = $state(false);
	let editingId = $state<number | null>(null);
	let nameInput = $state('');

	const docTypeList = $derived(docTypeResult?.data ?? []);
	const total = $derived(docTypeResult?.total ?? 0);

	let tableFilters = $state<Record<string, string>>({});

	async function fetchData(opts?: { bustCache?: boolean }) {
		isLoading = true;
		const pageSize = Number(filterPageSize) || 10;
		const parsedStatusId = tableFilters.status
			? Number(tableFilters.status)
			: undefined;
		try {
			const hospitalId = page.params.hospital_id;
			const url = new URL(
				`/api/heka/hospital/${hospitalId}/home/administration/document-master/document-type`,
				window.location.origin
			);
			url.searchParams.set('page', String(currentPage));
			url.searchParams.set('pageSize', String(pageSize));
			if (parsedStatusId != null && Number.isFinite(parsedStatusId)) {
				url.searchParams.set('statusId', String(parsedStatusId));
			}
			if (opts?.bustCache)
				url.searchParams.set('_t', String(Date.now()));

			const res = await fetch(url, { method: 'GET' });
			if (!res.ok) throw new Error(await res.text());
			docTypeResult =
				(await res.json()) as PaginatedResult<DocumentTypeRow>;
		} finally {
			isLoading = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		fetchData();
	});

	function resetForm() {
		isEditing = false;
		editingId = null;
		nameInput = '';
	}

	function startEdit(item: DocumentTypeRow) {
		isEditing = true;
		editingId = item.id;
		nameInput = item.documentType ?? '';
	}

	function startCreate() {
		resetForm();
		isEditing = true;
	}

	async function handleSave() {
		if (!nameInput.trim()) {
			toastService.addToast(
				'Name is required',
				StatusColorEnum.WARNING
			);
			return;
		}
		try {
			const hospitalId = page.params.hospital_id;
			const baseUrl = `/api/heka/hospital/${hospitalId}/home/administration/document-master/document-type`;
			if (editingId) {
				const res = await fetch(baseUrl, {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						id: editingId,
						documentType: nameInput.trim()
					})
				});
				if (!res.ok) throw new Error(await res.text());
				toastSuccess(
					toastService,
					m.entity_document_type(),
					m.toast_action_updated()
				);
			} else {
				const res = await fetch(baseUrl, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						documentType: nameInput.trim()
					})
				});
				if (!res.ok) throw new Error(await res.text());
				toastSuccess(
					toastService,
					m.entity_document_type(),
					m.toast_action_created()
				);
			}
			resetForm();
			await fetchData({ bustCache: true });
		} catch (err) {
			console.error(err);
			toastService.addToast(
				'Failed to save document type',
				StatusColorEnum.ERROR
			);
		}
	}

	async function handleDelete(id: number) {
		try {
			const result = await dialogService.open({
				title: 'Delete Document Type',
				message:
					'Are you sure you want to delete this document type?',
				variant: DialogVariantEnum.CONFIRM
			});
			if (result.confirmed) {
				const hospitalId = page.params.hospital_id;
				const res = await fetch(
					`/api/heka/hospital/${hospitalId}/home/administration/document-master/document-type`,
					{
						method: 'DELETE',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ id })
					}
				);
				if (!res.ok) throw new Error(await res.text());
				await fetchData({ bustCache: true });
				toastSuccess(
					toastService,
					m.entity_document_type(),
					m.toast_action_deleted()
				);
			}
		} catch (err) {
			console.error(err);
			toastService.addToast(
				'Failed to delete document type',
				StatusColorEnum.ERROR
			);
		}
	}

	function formatDateTime(value: unknown): string {
		if (value == null || value === '') return '—';
		const s =
			typeof value === 'string'
				? value
				: value instanceof Date
					? value.toISOString()
					: String(value);
		try {
			const d = new Date(s);
			return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
		} catch {
			return '—';
		}
	}

	const columns: MariTableColumn<DocumentTypeRow>[] = [
		{
			id: 'displayNo',
			header: 'No',
			widthClass: 'w-14 min-w-[3.5rem]',
			filterable: false,
			format: (_v, _row, rowIndex) =>
				(currentPage - 1) *
					(Number(filterPageSize) ||
						AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE) +
				rowIndex +
				1
		},
		{
			id: 'documentType',
			header: 'Name',
			widthClass: 'w-64 min-w-[16rem]',
			filterable: false
		},
		{
			id: 'status',
			header: 'Status',
			widthClass: 'w-28 min-w-[7rem]',
			filterable: true,
			filterType: 'select',
			filterOptions: [
				{ label: 'Active', value: String(StatusEnum.ACTIVE) },
				{ label: 'Inactive', value: String(StatusEnum.INACTIVE) }
			],
			defaultFilterValue: String(StatusEnum.ACTIVE),
			format: (_value, row) =>
				row.statusId === StatusEnum.ACTIVE
					? 'Active'
					: row.statusId === StatusEnum.INACTIVE
						? 'Inactive'
						: row.statusId === StatusEnum.DELETED
							? 'Deleted'
							: `Status ${row.statusId ?? 'Unknown'}`
		},
		{
			id: 'createdAt',
			header: 'Created At',
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (value) => formatDateTime(value)
		},
		{
			id: 'updatedAt',
			header: 'Updated At',
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (value) => formatDateTime(value)
		}
	];
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">Document types</h1>
		<DaisyUiButton
			className="d-btn-outline d-btn-sm d-btn-square"
			onClick={startCreate}
		>
			<LucidePlus />
		</DaisyUiButton>
	</div>

	{#if isEditing}
		<DaisyUiCard>
			<DaisyUiCardBody>
				<div class="mb-3 text-base font-semibold">
					{editingId ? 'Edit document type' : 'Create document type'}
				</div>
				<div class="flex flex-col gap-4">
					<div class="flex min-w-0 flex-1 flex-col gap-1">
						<DaisyUiLabel
							forText="docTypeName"
							className="text-sm font-medium"
						>
							Name <span class="text-error">*</span>
						</DaisyUiLabel>
						<DaisyUiInputField
							id="docTypeName"
							bind:value={nameInput}
							inputType="text"
							inputPlaceholderText="Enter document type name"
							className="d-input-sm w-full"
						/>
					</div>
					<div
						class="flex justify-end gap-2 border-t border-base-300 pt-4"
					>
						<DaisyUiButton
							className="d-btn-ghost d-btn-sm"
							onClick={resetForm}
						>
							<LucideX className="size-4" />
							{m.cancel()}
						</DaisyUiButton>
						<DaisyUiButton
							className="d-btn-primary d-btn-sm"
							onClick={handleSave}
						>
							{editingId ? m.update() : m.create()}
						</DaisyUiButton>
					</div>
				</div>
			</DaisyUiCardBody>
		</DaisyUiCard>
	{/if}

	<DaisyUiCard>
		<DaisyUiCardBody>
			<div class="{TableEnum.HEIGHT} overflow-auto">
				<MariTable
					rows={docTypeList}
					{columns}
					{isLoading}
					bind:pageSize={filterPageSize}
					bind:currentPage
					totalRowCount={total}
					showRefreshButton={true}
					refreshTooltip={m.refresh_data()}
					emptyMessage="No document types found"
					showRowActions={true}
					actionsHeader={m.actions()}
					actionsVariant="none"
					enableColumnFilters={true}
					useRemoteFilters={true}
					on:refresh={() => fetchData({ bustCache: true })}
					on:pageSizeChange={() => {
						currentPage = 1;
						fetchData();
					}}
					on:pageChange={() => fetchData()}
					on:filtersChange={(e) => {
						tableFilters = e.detail.filters;
						currentPage = 1;
						fetchData();
					}}
				>
					{#snippet rowActions(row, rowIndex)}
						{@const typedRow = row as DocumentTypeRow}
						<td class="w-24 shrink-0 text-right">
							<div class="flex justify-end gap-1">
								<DaisyUiTooltip
									tooltipText={m.edit_data()}
									className="d-tooltip-accent"
								>
									<DaisyUiButton
										className="d-btn-sm d-btn-ghost d-btn-accent"
										onClick={() => startEdit(typedRow)}
									>
										<LucidePencil className="size-4" />
									</DaisyUiButton>
								</DaisyUiTooltip>
								<DaisyUiTooltip
									tooltipText={m.delete_data()}
									className="d-tooltip-error"
								>
									<DaisyUiButton
										className="d-btn-ghost d-btn-sm d-btn-error"
										disabled={isLoading}
										onClick={() => handleDelete(typedRow.id)}
									>
										<LucideTrash2 className="size-4" />
									</DaisyUiButton>
								</DaisyUiTooltip>
							</div>
						</td>
					{/snippet}
				</MariTable>
			</div>
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>
