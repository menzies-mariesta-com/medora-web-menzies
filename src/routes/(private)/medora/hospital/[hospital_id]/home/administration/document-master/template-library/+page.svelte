<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableViewEditDeleteActions from '$lib/component/own/library/menzies/table/MenziesTableViewEditDeleteActions.svelte';
	import DocumentMasterHtmlPrintEditor from '$lib/component/own/local/private/medora/administration/document-master/DocumentMasterHtmlPrintEditor.svelte';
	import type { DocumentSettingWithRelations } from '$lib/model/type/document-setting.type';
	import type { PrintDocumentLayoutInput } from '$lib/util/print-document-html.util';
	import { DocumentCatalogCategoryEnum } from '$lib/model/enum/document-catalog.enum';
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
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	type CatalogRow = {
		catalogCode: string;
		kind: string;
		category: string;
		title: string;
		description: string | null;
		documentTypeId: number;
		catalogVersion: number;
		defaultDocumentSettingId: number | null;
		statusId: number;
		documentNumber: string | null;
		createdAt: string;
		updatedAt: string;
	};

	let listResult = $state<PaginatedResult<CatalogRow> | null>(null);
	let documentTypes = $state<{ id: number; documentType: string | null }[]>([]);
	let documentSettings = $state<DocumentSettingWithRelations[]>([]);
	let currentPage = $state(1);
	let filterPageSize = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let submitting = $state(false);
	let searchFilter = $state('');
	let categoryFilter = $state('');

	type ViewMode = 'list' | 'create' | 'edit' | 'view';
	let viewMode = $state<ViewMode>('list');
	let editingCode = $state<string | null>(null);

	let catalogCodeInput = $state('');
	let categoryInput = $state(DocumentCatalogCategoryEnum.CONSENT_CLINICAL);
	let titleInput = $state('');
	let descriptionInput = $state('');
	let documentTypeIdInput = $state('');
	let documentSettingIdInput = $state('');
	let documentNumberInput = $state('');
	let documentTextInput = $state('');

	const apiBase = $derived(
		page.params.hospital_id
			? `/api/medora/hospital/${page.params.hospital_id}/home/administration/document-master/template-library`
			: ''
	);

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

	const rows = $derived(listResult?.data ?? []);
	const total = $derived(listResult?.total ?? 0);

	function documentSettingLabel(ds: DocumentSettingWithRelations): string {
		return ds.hospitalId == null ? `(System) ${ds.name}` : ds.name;
	}

	async function fetchData(opts?: { bustCache?: boolean }) {
		if (!apiBase) return;
		isLoading = true;
		const pageSize = Number(filterPageSize) || 10;
		try {
			const url = new URL(apiBase, window.location.origin);
			url.searchParams.set('page', String(currentPage));
			url.searchParams.set('pageSize', String(pageSize));
			if (searchFilter.trim()) url.searchParams.set('search', searchFilter.trim());
			if (categoryFilter) url.searchParams.set('category', categoryFilter);
			if (opts?.bustCache) url.searchParams.set('_t', String(Date.now()));
			const res = await fetch(url);
			if (!res.ok) await throwUserFacingHttpError(res);
			listResult = (await res.json()) as PaginatedResult<CatalogRow>;
		} finally {
			isLoading = false;
		}
	}

	async function fetchDocumentTypes() {
		const hospitalId = page.params.hospital_id;
		const res = await fetch(
			`/api/medora/hospital/${hospitalId}/home/administration/document-master/document-type`
		);
		if (res.ok) documentTypes = (await res.json()) as typeof documentTypes;
	}

	async function fetchDocumentSettings() {
		const hospitalId = page.params.hospital_id;
		const url = new URL(
			`/api/medora/hospital/${hospitalId}/home/administration/document-master/document-setting`,
			window.location.origin
		);
		url.searchParams.set('page', '1');
		url.searchParams.set('pageSize', '200');
		url.searchParams.set('includeGlobal', 'true');
		const res = await fetch(url);
		if (res.ok) {
			const result = (await res.json()) as PaginatedResult<DocumentSettingWithRelations>;
			documentSettings = result.data ?? [];
		}
	}

	lifeCycleUtil.onMount(() => {
		void fetchData();
		void fetchDocumentTypes();
		void fetchDocumentSettings();
	});

	function resetForm() {
		viewMode = 'list';
		editingCode = null;
		catalogCodeInput = '';
		categoryInput = DocumentCatalogCategoryEnum.CONSENT_CLINICAL;
		titleInput = '';
		descriptionInput = '';
		documentTypeIdInput = '';
		documentSettingIdInput = '';
		documentNumberInput = '';
		documentTextInput = '';
	}

	async function loadDetail(catalogCode: string, mode: 'view' | 'edit') {
		const res = await fetch(
			`${apiBase}?catalogCode=${encodeURIComponent(catalogCode)}`
		);
		if (!res.ok) await throwUserFacingHttpError(res);
		const d = (await res.json()) as {
			catalogCode: string;
			category: string;
			title: string;
			description: string | null;
			documentTypeId: number;
			defaultDocumentSettingId: number | null;
			documentNumber: string | null;
			documentText: string | null;
		};
		viewMode = mode;
		editingCode = catalogCode;
		catalogCodeInput = d.catalogCode;
		categoryInput = d.category;
		titleInput = d.title;
		descriptionInput = d.description ?? '';
		documentTypeIdInput = String(d.documentTypeId);
		documentSettingIdInput = d.defaultDocumentSettingId
			? String(d.defaultDocumentSettingId)
			: '';
		documentNumberInput = d.documentNumber ?? '';
		documentTextInput = d.documentText ?? '';
	}

	function startCreate() {
		resetForm();
		viewMode = 'create';
	}

	async function handleSave() {
		if (!catalogCodeInput.trim() && viewMode === 'create') {
			toastService.addToast('Catalog code is required', StatusColorEnum.WARNING);
			return;
		}
		if (!documentTypeIdInput || !documentSettingIdInput || !documentNumberInput.trim()) {
			toastService.addToast('Fill required fields', StatusColorEnum.WARNING);
			return;
		}
		submitting = true;
		try {
			const payload = {
				catalogCode: catalogCodeInput.trim(),
				category: categoryInput,
				title: titleInput.trim() || documentNumberInput.trim(),
				description: descriptionInput.trim() || null,
				documentTypeId: Number(documentTypeIdInput),
				defaultDocumentSettingId: Number(documentSettingIdInput),
				documentNumber: documentNumberInput.trim(),
				documentText: documentTextInput || null
			};
			if (viewMode === 'edit' && editingCode) {
				const res = await fetch(apiBase, {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				});
				if (!res.ok) await throwUserFacingHttpError(res);
				toastSuccess(toastService, msg.document_catalog_library_title(), m.toast_action_updated());
			} else {
				const res = await fetch(apiBase, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				});
				if (!res.ok) await throwUserFacingHttpError(res);
				toastSuccess(toastService, msg.document_catalog_library_title(), m.toast_action_created());
			}
			resetForm();
			await fetchData({ bustCache: true });
		} catch (err) {
			console.error(err);
			toastService.addToast('Failed to save template', StatusColorEnum.ERROR);
		} finally {
			submitting = false;
		}
	}

	async function handleDelete(catalogCode: string) {
		const result = await dialogService.open({
			title: msg.document_catalog_delete_confirm_title(),
			message: msg.document_catalog_delete_confirm_message(),
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		submitting = true;
		try {
			const res = await fetch(apiBase, {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ catalogCode })
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toastSuccess(toastService, msg.document_catalog_library_title(), m.toast_action_deleted());
			await fetchData({ bustCache: true });
		} finally {
			submitting = false;
		}
	}

	const columns: MenziesTableColumn<CatalogRow>[] = [
		{
			id: 'displayNo',
			header: 'No',
			widthClass: 'w-14',
			filterable: false,
			format: (_v, _r, i) =>
				(currentPage - 1) * (Number(filterPageSize) || 10) + i + 1
		},
		{
			id: 'title',
			header: msg.document_catalog_col_title(),
			widthClass: 'w-48',
			filterable: false
		},
		{
			id: 'catalogCode',
			header: 'Catalog code',
			widthClass: 'w-56',
			filterable: false
		},
		{
			id: 'category',
			header: msg.document_catalog_col_category(),
			widthClass: 'w-32',
			filterable: false
		},
		{
			id: 'catalogVersion',
			header: 'Version',
			widthClass: 'w-20',
			filterable: false
		},
		{
			id: 'statusId',
			header: msg.document_catalog_col_status(),
			widthClass: 'w-24',
			filterable: false,
			format: (v) =>
				v === StatusEnum.ACTIVE ? 'Active' : v === StatusEnum.INACTIVE ? 'Inactive' : '—'
		}
	];
</script>

<svelte:head><title>{msg.document_catalog_master_title()}</title></svelte:head>

<div class="space-y-4">
	<div class="alert alert-warning text-sm">
		{msg.document_catalog_legal_review_banner()}
	</div>
	<p class="text-sm text-base-content/70">{msg.document_catalog_master_hint()}</p>

	{#if viewMode === 'list'}
		<div class="flex flex-wrap gap-2">
			<input
				class="input input-bordered input-sm min-w-[12rem]"
				placeholder={msg.document_catalog_search()}
				bind:value={searchFilter}
			/>
			<select class="select select-bordered select-sm" bind:value={categoryFilter}>
				<option value="">{msg.document_catalog_all_categories()}</option>
				{#each Object.values(DocumentCatalogCategoryEnum) as cat (cat)}
					<option value={cat}>{cat}</option>
				{/each}
			</select>
			<WashButton
				type="button"
				className="btn-primary btn-sm cursor-pointer"
				onClick={() => {
					currentPage = 1;
					void fetchData({ bustCache: true });
				}}
			>
				{msg.document_catalog_refresh()}
			</WashButton>
		</div>
		<div class="{TableEnum.HEIGHT} overflow-auto">
			<MenziesTable
				title={msg.document_catalog_master_title()}
				rows={rows}
				{columns}
				{isLoading}
				bind:pageSize={filterPageSize}
				bind:currentPage
				totalRowCount={total}
				showRefreshButton={true}
				refreshTooltip={m.refresh_data()}
				emptyMessage={msg.document_catalog_empty()}
				showRowActions={true}
				actionsHeader={m.actions()}
				showAddButton={true}
				addLabel={m.create()}
				onAdd={startCreate}
				on:refresh={() => fetchData({ bustCache: true })}
				on:pageSizeChange={() => {
					currentPage = 1;
					void fetchData();
				}}
				on:pageChange={() => fetchData()}
			>
				{#snippet rowActions(row)}
					{@const typed = row as CatalogRow}
					<MenziesTableViewEditDeleteActions
						onView={() => void loadDetail(typed.catalogCode, 'view')}
						onEdit={() => void loadDetail(typed.catalogCode, 'edit')}
						onDelete={() => void handleDelete(typed.catalogCode)}
						deleteDisabled={submitting || typed.kind === 'transactional_print'}
						viewTooltip={m.view_data()}
						editTooltip={m.edit_data()}
						deleteTooltip={m.delete_data()}
					/>
				{/snippet}
			</MenziesTable>
		</div>
	{:else}
		<WashCard>
			<WashCardBody>
				<div class="mb-4 flex items-center justify-between">
					<h2 class="card-title text-primary font-bold">
						{#if viewMode === 'view'}
							{msg.document_catalog_view()}
						{:else if viewMode === 'edit'}
							{msg.document_catalog_edit()}
						{:else}
							{msg.document_catalog_create()}
						{/if}
					</h2>
					<WashButton type="button" className="btn-ghost btn-sm cursor-pointer" onClick={resetForm}>
						<LucideX className="size-3.5" />
						Back
					</WashButton>
				</div>
				<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label class="label" for="catalogCode">
							<span class="label-text">
								Catalog code<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span>
							</span>
						</label>
						<input
							id="catalogCode"
							class="input input-bordered w-full"
							bind:value={catalogCodeInput}
							disabled={viewMode !== 'create'}
							placeholder="CATALOG_CUSTOM_EXAMPLE"
						/>
					</div>
					<div>
						<label class="label" for="category">
							<span class="label-text">
								Category<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span>
							</span>
						</label>
						<select
							id="category"
							class="select select-bordered w-full"
							bind:value={categoryInput}
							disabled={viewMode === 'view'}
						>
							{#each Object.values(DocumentCatalogCategoryEnum) as cat (cat)}
								<option value={cat}>{cat}</option>
							{/each}
						</select>
					</div>
					<div>
						<label class="label" for="title">
							<span class="label-text">Display title</span>
						</label>
						<input id="title" class="input input-bordered w-full" bind:value={titleInput} disabled={viewMode === 'view'} />
					</div>
					<div>
						<label class="label" for="docName">
							<span class="label-text">
								Document name<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span>
							</span>
						</label>
						<input
							id="docName"
							class="input input-bordered w-full"
							bind:value={documentNumberInput}
							disabled={viewMode === 'view'}
						/>
					</div>
					<div>
						<label class="label" for="docType">
							<span class="label-text">
								Document type<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span>
							</span>
						</label>
						<WashSelect bind:value={documentTypeIdInput} disabled={viewMode === 'view'}>
							{#each documentTypes as dt (dt.id)}
								<option value={String(dt.id)}>{dt.documentType}</option>
							{/each}
						</WashSelect>
					</div>
					<div>
						<label class="label" for="docSetting">
							<span class="label-text">
								Layout (document setting)<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span>
							</span>
						</label>
						<WashSelect bind:value={documentSettingIdInput} disabled={viewMode === 'view'}>
							{#each documentSettings as ds (ds.id)}
								<option value={String(ds.id)}>{documentSettingLabel(ds)}</option>
							{/each}
						</WashSelect>
					</div>
				</div>
				<div class="mb-4">
					<DocumentMasterHtmlPrintEditor
						bind:html={documentTextInput}
						documentTitle={documentNumberInput || 'Template'}
						setting={selectedPrintLayout}
						readOnly={viewMode === 'view'}
					/>
				</div>
				{#if viewMode !== 'view'}
					<div class="flex justify-end gap-2 border-t border-base-300 pt-4">
						<WashButton type="button" className="btn-ghost cursor-pointer" onClick={resetForm}>
							Cancel
						</WashButton>
						<WashButton
							type="button"
							className="btn-primary cursor-pointer"
							loading={submitting}
							disabled={submitting}
							onClick={() => void handleSave()}
						>
							{viewMode === 'edit' ? m.update() : m.create()}
						</WashButton>
					</div>
				{/if}
			</WashCardBody>
		</WashCard>
	{/if}
</div>
