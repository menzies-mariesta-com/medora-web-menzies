<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import DocumentMasterHtmlPrintEditor from '$lib/component/own/local/private/medora/administration/document-master/DocumentMasterHtmlPrintEditor.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableViewEditDeleteActions from '$lib/component/own/library/menzies/table/MenziesTableViewEditDeleteActions.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { AdminPageKeyEnum, RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import type { AdminPagePermissionFlags } from '$lib/model/type/medora/admin-team.type';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { adminPermissionAllows } from '$lib/util/admin-permission.util';
	import { paraglideMsg } from '$lib/util/paraglide-msg.util';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	type GlobalDocumentRow = {
		id: number;
		code: string | null;
		locale: string | null;
		documentNumber: string | null;
		documentText: string | null;
		clinicalSection: string | null;
		statusId: number | null;
		status?: { status?: string | null } | null;
	};

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const apiBase = '/api/medora/admin/global-documents';

	let listResult = $state<PaginatedResult<GlobalDocumentRow> | null>(null);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(true);
	let reseeding = $state(false);
	let tableFilters = $state<Record<string, string>>({});

	let viewMode = $state<'list' | 'edit' | 'view'>('list');
	let editingId = $state<number | null>(null);
	let codeInput = $state('');
	let localeInput = $state('en');
	let documentNumberInput = $state('');
	let documentTextInput = $state('');

	const rows = $derived(listResult?.data ?? []);
	const total = $derived(listResult?.total ?? 0);

	const userRoleId = $derived(
		(page.data as { userRoleId?: number | null })?.userRoleId ?? null
	);
	const adminPermissions = $derived(
		(page.data as { adminPermissions?: AdminPagePermissionFlags[] | null })
			?.adminPermissions ?? null
	);
	const canEdit = $derived(
		adminPermissionAllows(
			userRoleId,
			adminPermissions,
			AdminPageKeyEnum.GLOBAL_DOCUMENTS,
			'edit'
		)
	);
	const isSystemAdmin = $derived(userRoleId === RoleEnum.SYSTEM_ADMIN);

	async function loadDocuments(bustCache = false) {
		isLoading = true;
		const pageSize = Number(pageSizeStr) || AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE;
		const statusId = tableFilters.status
			? Number(tableFilters.status)
			: undefined;
		try {
			const url = new URL(apiBase, window.location.origin);
			url.searchParams.set('page', String(currentPage));
			url.searchParams.set('pageSize', String(pageSize));
			if (statusId != null && Number.isFinite(statusId)) {
				url.searchParams.set('statusId', String(statusId));
			}
			if (bustCache) url.searchParams.set('_', String(Date.now()));
			const res = await fetch(url);
			if (!res.ok) await throwUserFacingHttpError(res);
			listResult = (await res.json()) as PaginatedResult<GlobalDocumentRow>;
		} catch (err) {
			console.error(err);
			toastService.addToast(
				paraglideMsg(
					'admin_global_documents_load_failed',
					'Could not load global documents.'
				),
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	}

	function resetEditor() {
		viewMode = 'list';
		editingId = null;
		codeInput = '';
		localeInput = 'en';
		documentNumberInput = '';
		documentTextInput = '';
	}

	function openEdit(row: GlobalDocumentRow) {
		viewMode = 'edit';
		editingId = row.id;
		codeInput = row.code ?? '';
		localeInput = row.locale ?? 'en';
		documentNumberInput = row.documentNumber ?? '';
		documentTextInput = row.documentText ?? '';
	}

	function openView(row: GlobalDocumentRow) {
		viewMode = 'view';
		editingId = row.id;
		codeInput = row.code ?? '';
		localeInput = row.locale ?? 'en';
		documentNumberInput = row.documentNumber ?? '';
		documentTextInput = row.documentText ?? '';
	}

	async function handleSave() {
		if (!editingId) return;
		if (!documentNumberInput.trim()) {
			toastService.addToast(
				paraglideMsg(
					'admin_global_documents_name_required',
					'Document name is required.'
				),
				StatusColorEnum.WARNING
			);
			return;
		}
		try {
			const res = await fetch(apiBase, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					id: editingId,
					code: codeInput.trim() || null,
					locale: localeInput.trim() || 'en',
					documentNumber: documentNumberInput.trim(),
					documentText: documentTextInput || null
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toastSuccess(toastService, m.entity_document(), m.toast_action_updated());
			resetEditor();
			await loadDocuments(true);
		} catch (err) {
			console.error(err);
			toastService.addToast(
				paraglideMsg(
					'admin_global_documents_save_failed',
					'Could not save document.'
				),
				StatusColorEnum.ERROR
			);
		}
	}

	async function confirmReseed() {
		const result = await dialogService.open({
			title: paraglideMsg(
				'admin_global_documents_reseed_title',
				'Reseed global catalog'
			),
			message: paraglideMsg(
				'admin_global_documents_reseed_confirm',
				'Insert missing templates from the built-in catalog? Existing codes are not overwritten.'
			),
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		reseeding = true;
		try {
			const res = await fetch(apiBase, { method: 'POST' });
			if (!res.ok) await throwUserFacingHttpError(res);
			const body = (await res.json()) as { inserted: number; skipped: number };
			toastService.addToast(
				paraglideMsg(
					'admin_global_documents_reseed_success',
					`Catalog reseed finished. Inserted ${body.inserted}, skipped ${body.skipped}.`
				),
				StatusColorEnum.SUCCESS
			);
			await loadDocuments(true);
		} catch (err) {
			const errMsg =
				err instanceof Error
					? err.message
					: paraglideMsg(
							'admin_global_documents_reseed_failed',
							'Could not reseed catalog.'
						);
			toastService.addToast(errMsg, StatusColorEnum.ERROR);
		} finally {
			reseeding = false;
		}
	}

	const columns: MenziesTableColumn<GlobalDocumentRow>[] = [
		{
			id: 'code',
			header: paraglideMsg('admin_global_documents_col_code', 'Code'),
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			field: 'code',
			format: (v) => (v != null && String(v).trim() ? String(v) : '—')
		},
		{
			id: 'locale',
			header: paraglideMsg('admin_global_documents_col_locale', 'Locale'),
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			field: 'locale',
			format: (v) => (v != null && String(v).trim() ? String(v) : '—')
		},
		{
			id: 'documentNumber',
			header: paraglideMsg(
				'admin_global_documents_col_name',
				'Document name'
			),
			widthClass: 'min-w-[12rem]',
			filterable: false,
			field: 'documentNumber',
			format: (v) => (v != null && String(v).trim() ? String(v) : '—')
		},
		{
			id: 'clinicalSection',
			header: paraglideMsg(
				'admin_global_documents_col_section',
				'Clinical section'
			),
			widthClass: 'w-36 min-w-[9rem]',
			filterable: false,
			field: 'clinicalSection',
			format: (v) => (v != null && String(v).trim() ? String(v) : '—')
		},
		{
			id: 'status',
			header: paraglideMsg('status', 'Status'),
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
							: `Status ${row.statusId ?? '—'}`
		}
	];

	lifeCycleUtil.onMount(() => {
		void loadDocuments();
	});
</script>

<div class="flex flex-col gap-3">
	<div
		class="flex flex-col gap-2 rounded-box border border-ink-border bg-base-100/80 p-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
	>
		<p class="text-xs text-base-content/60">
			{paraglideMsg(
				'admin_global_documents_hint',
				'Raw HTML only — hospitals attach type and print layout separately.'
			)}
		</p>
		{#if isSystemAdmin && canEdit}
			<WashButton
				variant="secondary"
				size="sm"
				className={reseeding ? 'cursor-not-allowed' : 'cursor-pointer'}
				disabled={reseeding}
				loading={reseeding}
				onClick={confirmReseed}
			>
				{paraglideMsg(
					'admin_global_documents_reseed_action',
					'Reseed from catalog'
				)}
			</WashButton>
		{/if}
	</div>

	<div class="{TableEnum.HEIGHT} min-h-[24rem]">
		<MenziesTable
			title={paraglideMsg(
				'admin_global_documents_table_title',
				'Global document templates'
			)}
			wash={true}
			showAddButton={false}
			rows={rows}
			{columns}
			{isLoading}
			bind:pageSize={pageSizeStr}
			bind:currentPage
			totalRowCount={total}
			showRefreshButton={true}
			refreshTooltip={paraglideMsg('refresh_data', 'Refresh')}
			emptyMessage={paraglideMsg(
				'admin_global_documents_empty',
				'No global documents yet. Use Reseed from catalog or run the DB seed.'
			)}
			showRowActions={true}
			enableColumnFilters={true}
			on:refresh={() => loadDocuments(true)}
			on:pageSizeChange={() => {
				currentPage = 1;
				void loadDocuments(true);
			}}
			on:pageChange={() => void loadDocuments(true)}
			on:filtersChange={(e) => {
				tableFilters = e.detail.filters;
				currentPage = 1;
				void loadDocuments(true);
			}}
		>
			{#snippet rowActions(row, _rowIndex)}
				{@const typedRow = row as GlobalDocumentRow}
				<MenziesTableViewEditDeleteActions
					onView={() => openView(typedRow)}
					onEdit={() => openEdit(typedRow)}
					onDelete={() => {}}
					editDisabled={!canEdit}
					deleteDisabled={true}
				/>
			{/snippet}
		</MenziesTable>
	</div>

	{#if viewMode !== 'list'}
		<WashCard className="border border-ink-border">
			<WashCardBody className="flex flex-col gap-4">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 class="text-lg font-semibold text-primary">
						{viewMode === 'view'
							? paraglideMsg(
									'admin_global_documents_view',
									'View template'
								)
							: paraglideMsg(
									'admin_global_documents_edit',
									'Edit template'
								)}
					</h2>
					<WashButton variant="ghost" size="sm" onClick={resetEditor}>
						{paraglideMsg('close', 'Close')}
					</WashButton>
				</div>
				<div class="grid gap-3 sm:grid-cols-3">
					<label class="form-control w-full">
						<span class="label-text">
							{paraglideMsg('admin_global_documents_col_code', 'Code')}
						</span>
						<input
							type="text"
							class="input-bordered input w-full"
							bind:value={codeInput}
							disabled={viewMode === 'view'}
						/>
					</label>
					<label class="form-control w-full">
						<span class="label-text">
							{paraglideMsg(
								'admin_global_documents_col_locale',
								'Locale'
							)}
						</span>
						<input
							type="text"
							class="input-bordered input w-full"
							bind:value={localeInput}
							disabled={viewMode === 'view'}
						/>
					</label>
					<label class="form-control w-full">
						<span class="label-text">
							{paraglideMsg(
								'admin_global_documents_col_name',
								'Document name'
							)}
						</span>
						<input
							type="text"
							class="input-bordered input w-full"
							bind:value={documentNumberInput}
							disabled={viewMode === 'view'}
						/>
					</label>
				</div>
				<DocumentMasterHtmlPrintEditor
					bind:html={documentTextInput}
					documentTitle={documentNumberInput || 'Document'}
					setting={null}
					readOnly={viewMode === 'view'}
					showPlaceholders={viewMode === 'edit'}
				/>
				{#if viewMode === 'edit' && canEdit}
					<div class="flex justify-end gap-2">
						<WashButton variant="ghost" onClick={resetEditor}>
							{paraglideMsg('cancel', 'Cancel')}
						</WashButton>
						<WashButton variant="primary" onClick={handleSave}>
							{paraglideMsg('save', 'Save')}
						</WashButton>
					</div>
				{/if}
			</WashCardBody>
		</WashCard>
	{/if}
</div>
