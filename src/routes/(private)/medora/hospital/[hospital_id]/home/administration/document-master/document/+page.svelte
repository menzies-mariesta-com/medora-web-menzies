<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableViewEditDeleteActions from '$lib/component/own/library/menzies/table/MenziesTableViewEditDeleteActions.svelte';
	import DocumentMasterHtmlPrintEditor from '$lib/component/own/local/private/medora/administration/document-master/DocumentMasterHtmlPrintEditor.svelte';
	import type { DocumentSettingWithRelations } from '$lib/model/type/document-setting.type';
	import type { PrintDocumentLayoutInput } from '$lib/util/print-document-html.util';
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

	let documentResult =
		$state<PaginatedResult<DocumentWithRelations> | null>(null);
	let documentTypes = $state<DocumentTypeRow[]>([]);
	let documentSettings = $state<DocumentSettingWithRelations[]>([]);
	let currentPage = $state(1);
	let filterPageSize = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);
	let isLoading = $state(false);

	type ViewMode = 'list' | 'create' | 'edit' | 'view';
	let viewMode = $state<ViewMode>('list');
	let editingId = $state<number | null>(null);
	let documentTypeIdInput = $state('');
	let documentSettingIdInput = $state('');
	let documentCodeInput = $state('');
	let documentNumberInput = $state('');
	let documentTextInput = $state('');

	const selectedPrintLayout = $derived.by((): PrintDocumentLayoutInput | null => {
		const id = Number(documentSettingIdInput);
		if (!Number.isFinite(id) || id <= 0) return null;
		const row = documentSettings.find((s) => s.id === id);
		if (!row) return null;
		return {
			marginTop: row.marginTop,
			marginBottom: row.marginBottom,
			marginLeft: row.marginLeft,
			marginRight: row.marginRight,
			paddingTop: row.paddingTop,
			paddingBottom: row.paddingBottom,
			paddingLeft: row.paddingLeft,
			paddingRight: row.paddingRight,
			pageSize: row.pageSize,
			pageOrientation: row.pageOrientation,
			showHeader: row.showHeader,
			showFooter: row.showFooter
		};
	});

	function documentSettingLabel(ds: DocumentSettingWithRelations): string {
		return ds.hospitalId == null ? `(System) ${ds.name}` : ds.name;
	}

	type DocumentTypeRow = { id: number; documentType: string | null };
	type DocumentWithRelations = {
		id: number;
		documentTypeId: number;
		documentSettingId: number | null;
		code: string | null;
		documentNumber: string | null;
		documentText: string | null;
		statusId: number | null;
		createdAt?: string | null;
		documentType?: { id: number; documentType: string | null } | null;
		documentSetting?: { id: number; name: string } | null;
	};

	const documentList = $derived(documentResult?.data ?? []);
	const total = $derived(documentResult?.total ?? 0);

	async function fetchData(opts?: { bustCache?: boolean }) {
		isLoading = true;
		const pageSize = Number(filterPageSize) || 10;
		const parsedStatusId = tableFilters.status
			? Number(tableFilters.status)
			: undefined;
		try {
			const hospitalId = page.params.hospital_id;
			const url = new URL(
				`/api/medora/hospital/${hospitalId}/home/administration/document-master/document`,
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
			documentResult =
				(await res.json()) as PaginatedResult<DocumentWithRelations>;
		} finally {
			isLoading = false;
		}
	}

	async function fetchDocumentTypes() {
		try {
			const hospitalId = page.params.hospital_id;
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/administration/document-master/document-type`,
				{ method: 'GET' }
			);
			if (!res.ok) throw new Error(await res.text());
			documentTypes = (await res.json()) as DocumentTypeRow[];
		} catch (err) {
			console.error('Failed to load document types', err);
		}
	}

	async function fetchDocumentSettings() {
		try {
			const hospitalId = page.params.hospital_id;
			const url = new URL(
				`/api/medora/hospital/${hospitalId}/home/administration/document-master/document-setting`,
				window.location.origin
			);
			url.searchParams.set('page', '1');
			url.searchParams.set('pageSize', '200');
			url.searchParams.set('includeGlobal', 'true');
			url.searchParams.set('_t', String(Date.now()));

			const res = await fetch(url, { method: 'GET' });
			if (!res.ok) throw new Error(await res.text());
			const result =
				(await res.json()) as PaginatedResult<DocumentSettingWithRelations>;
			documentSettings = result.data ?? [];
		} catch (err) {
			console.error('Failed to load document settings', err);
		}
	}

	lifeCycleUtil.onMount(() => {
		fetchData();
		fetchDocumentTypes();
		fetchDocumentSettings();
	});

	function resetForm() {
		viewMode = 'list';
		editingId = null;
		documentTypeIdInput = '';
		documentSettingIdInput = '';
		documentCodeInput = '';
		documentNumberInput = '';
		documentTextInput = '';
	}

	function startEdit(item: DocumentWithRelations) {
		viewMode = 'edit';
		editingId = item.id;
		documentTypeIdInput = item.documentTypeId
			? String(item.documentTypeId)
			: '';
		documentSettingIdInput = item.documentSettingId
			? String(item.documentSettingId)
			: '';
		documentCodeInput = item.code ?? '';
		documentNumberInput = item.documentNumber ?? '';
		documentTextInput = item.documentText ?? '';
	}

	function startView(item: DocumentWithRelations) {
		viewMode = 'view';
		editingId = item.id;
		documentTypeIdInput = item.documentTypeId
			? String(item.documentTypeId)
			: '';
		documentSettingIdInput = item.documentSettingId
			? String(item.documentSettingId)
			: '';
		documentCodeInput = item.code ?? '';
		documentNumberInput = item.documentNumber ?? '';
		documentTextInput = item.documentText ?? '';
	}

	function startCreate() {
		resetForm();
		viewMode = 'create';
	}

	async function handleSave() {
		if (!documentTypeIdInput) {
			toastService.addToast(
				'Document type is required',
				StatusColorEnum.WARNING
			);
			return;
		}
		if (!documentSettingIdInput) {
			toastService.addToast(
				'Document setting is required',
				StatusColorEnum.WARNING
			);
			return;
		}
		if (!documentNumberInput.trim()) {
			toastService.addToast(
				'Document number/name is required',
				StatusColorEnum.WARNING
			);
			return;
		}
		try {
			const hospitalId = page.params.hospital_id;
			const baseUrl = `/api/medora/hospital/${hospitalId}/home/administration/document-master/document`;
			const payload = {
				documentTypeId: Number(documentTypeIdInput),
				documentSettingId: Number(documentSettingIdInput),
				code: documentCodeInput.trim() || null,
				documentNumber: documentNumberInput.trim(),
				documentText: documentTextInput || null
			};

			if (editingId) {
				const res = await fetch(baseUrl, {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ id: editingId, ...payload })
				});
				if (!res.ok) throw new Error(await res.text());
				toastSuccess(
					toastService,
					m.entity_document(),
					m.toast_action_updated()
				);
			} else {
				const res = await fetch(baseUrl, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				});
				if (!res.ok) throw new Error(await res.text());
				toastSuccess(
					toastService,
					m.entity_document(),
					m.toast_action_created()
				);
			}
			resetForm();
			await fetchData({ bustCache: true });
		} catch (err) {
			console.error(err);
			toastService.addToast(
				'Failed to save document',
				StatusColorEnum.ERROR
			);
		}
	}

	async function handleDelete(id: number) {
		try {
			const result = await dialogService.open({
				title: 'Delete Document',
				message: 'Are you sure you want to delete this document?',
				variant: DialogVariantEnum.CONFIRM
			});
			if (result.confirmed) {
				const hospitalId = page.params.hospital_id;
				const res = await fetch(
					`/api/medora/hospital/${hospitalId}/home/administration/document-master/document`,
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
					m.entity_document(),
					m.toast_action_deleted()
				);
			}
		} catch (err) {
			console.error(err);
			toastService.addToast(
				'Failed to delete document',
				StatusColorEnum.ERROR
			);
		}
	}

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return '—';
		try {
			const d = new Date(value);
			return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
		} catch {
			return '—';
		}
	}

	function truncateText(
		text: string | null | undefined,
		maxLength: number = 100
	): string {
		if (!text) return '—';
		const stripped = text.replace(/<[^>]*>/g, '');
		if (stripped.length <= maxLength) return stripped;
		return stripped.substring(0, maxLength) + '...';
	}

	let tableFilters = $state<Record<string, string>>({});

	const columns: MenziesTableColumn<DocumentWithRelations>[] = [
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
			id: 'documentNumber',
			header: 'Document Name',
			widthClass: 'w-48 min-w-[12rem]',
			filterable: false
		},
		{
			id: 'code',
			header: 'Document Code',
			widthClass: 'w-32 min-w-[8rem]',
			filterable: false
		},
		{
			id: 'documentType',
			header: 'Document Type',
			widthClass: 'w-32 min-w-[8rem]',
			filterable: false,
			format: (_value, row) => row.documentType?.documentType ?? '—'
		},
		{
			id: 'documentSetting',
			header: 'Document Setting',
			widthClass: 'w-48 min-w-[12rem]',
			filterable: false,
			format: (_value, row) => row.documentSetting?.name ?? '—'
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
			id: 'documentText',
			header: 'Content Preview',
			widthClass: 'w-64 min-w-[16rem]',
			filterable: false,
			format: (value) => truncateText(value as string)
		},
		{
			id: 'createdAt',
			header: 'Created At',
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (value) => formatDateTime(value as any)
		}
	];
</script>

<div class="space-y-6">
	{#if viewMode === 'list'}
		<div class="flex flex-wrap items-center justify-between gap-4">
			<h1 class="text-2xl font-bold">Documents</h1>
			<WashButton
				className="btn-outline btn-sm btn-square"
				onClick={startCreate}
			>
				<LucidePlus />
			</WashButton>
		</div>

		<WashCard>
			<WashCardBody>
				<div class="{TableEnum.HEIGHT} overflow-auto">
					<MenziesTable
						rows={documentList}
						{columns}
						{isLoading}
						bind:pageSize={filterPageSize}
						bind:currentPage
						totalRowCount={total}
						showRefreshButton={true}
						refreshTooltip={m.refresh_data()}
						emptyMessage="No documents found"
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
							{@const typedRow = row as DocumentWithRelations}
							<MenziesTableViewEditDeleteActions
								onView={() => startView(typedRow)}
								onEdit={() => startEdit(typedRow)}
								onDelete={() => handleDelete(typedRow.id)}
								deleteDisabled={isLoading}
								viewTooltip={m.view_data()}
								editTooltip={m.edit_data()}
								deleteTooltip={m.delete_data()}
							/>
						{/snippet}
					</MenziesTable>
				</div>
			</WashCardBody>
		</WashCard>
	{:else}
		<WashCard>
			<WashCardBody>
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-lg font-semibold">
						{#if viewMode === 'view'}
							View Document
						{:else if viewMode === 'edit'}
							Edit Document
						{:else}
							Create Document
						{/if}
					</h2>
					<WashButton
						className="btn-ghost btn-sm"
						onClick={resetForm}
					>
						<LucideX className="size-3.5" />
						Back to List
					</WashButton>
				</div>

				<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<label for="documentType" class="shrink-0 sm:w-32">
							Document Type <span class="text-error">*</span>
						</label>
						<div class="flex-1">
							<WashSelect
								bind:value={documentTypeIdInput}
								optionHeader="Select document type ..."
								disabled={viewMode === 'view'}
							>
								{#each documentTypes as dt (dt.id)}
									<option value={String(dt.id)}
										>{dt.documentType}</option
									>
								{/each}
							</WashSelect>
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<label for="documentCode" class="shrink-0 sm:w-32">
							Document Code
						</label>
						<div class="flex-1">
							<input
								id="documentCode"
								type="text"
								class="input-bordered input w-full"
								placeholder="Enter document code"
								bind:value={documentCodeInput}
								disabled={viewMode === 'view'}
							/>
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<label for="documentSetting" class="shrink-0 sm:w-32">
							Document Setting <span class="text-error">*</span>
						</label>
						<div class="flex-1">
							<WashSelect
								bind:value={documentSettingIdInput}
								optionHeader="Select document setting ..."
								disabled={viewMode === 'view'}
							>
								{#each documentSettings as ds (ds.id)}
									<option value={String(ds.id)}
										>{documentSettingLabel(ds)}</option
									>
								{/each}
							</WashSelect>
						</div>
					</div>
					<div
						class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
					>
						<label for="documentNumber" class="shrink-0 sm:w-32">
							Document Name <span class="text-error">*</span>
						</label>
						<div class="flex-1">
							<input
								id="documentNumber"
								type="text"
								class="input-bordered input w-full"
								placeholder="Enter document name"
								bind:value={documentNumberInput}
								disabled={viewMode === 'view'}
							/>
						</div>
					</div>
				</div>

				<div class="mb-4">
					<label for="documentContent" class="mb-2 block">
						Document Content
					</label>

					<DocumentMasterHtmlPrintEditor
						bind:html={documentTextInput}
						documentTitle={documentNumberInput || 'Document'}
						setting={selectedPrintLayout}
						readOnly={viewMode === 'view'}
						placeholder="Edit document HTML with placeholders..."
					/>
				</div>

				{#if viewMode !== 'view'}
					<div
						class="flex justify-end gap-2 border-t border-base-300 pt-4"
					>
						<WashButton
							className="btn-ghost btn-sm"
							onClick={resetForm}
						>
							Cancel
						</WashButton>
						<WashButton
							className="btn-primary btn-sm"
							onClick={handleSave}
						>
							{editingId ? m.update() : m.create()}
						</WashButton>
					</div>
				{/if}
			</WashCardBody>
		</WashCard>
	{/if}
</div>
