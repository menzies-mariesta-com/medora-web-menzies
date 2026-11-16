<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import DocumentMasterHtmlPrintEditor from '$lib/component/own/local/private/medora/administration/document-master/DocumentMasterHtmlPrintEditor.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import MenziesTableRowActionGroup from '$lib/component/own/library/menzies/table/MenziesTableRowActionGroup.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucideLink from '$lib/component/own/library/lucide/LucideLink.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import type { DocumentSettingWithRelations } from '$lib/model/type/document-setting.type';
	import type {
		GlobalDocumentLinkListResponse,
		GlobalDocumentLinkRow,
		GlobalDocumentPreview
	} from '$lib/model/type/medora/global-document-link.type';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { paraglideMsg } from '$lib/util/paraglide-msg.util';
	import { m } from '$lib/paraglide/messages';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	type DocumentTypeRow = { id: number; documentType: string | null };

	let listResult = $state<GlobalDocumentLinkListResponse | null>(null);
	let documentTypes = $state<DocumentTypeRow[]>([]);
	let documentSettings = $state<DocumentSettingWithRelations[]>([]);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(true);
	let tableFilters = $state<Record<string, string>>({});

	let legalAck = $state(false);
	let linkOpenFor = $state<GlobalDocumentLinkRow | null>(null);
	let documentTypeIdInput = $state('');
	let documentSettingIdInput = $state('');
	let linkSaving = $state(false);
	let viewOpenFor = $state<GlobalDocumentPreview | null>(null);
	let viewLoading = $state(false);
	type ScreenMode = 'list' | 'view';
	let screenMode = $state<ScreenMode>('list');

	const rows = $derived(listResult?.data ?? []);
	const total = $derived(listResult?.total ?? 0);
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/document-master/reusable-global-documents`
			: ''
	);
	const canLink = $derived(legalAck);

	const documentListUrl = $derived(
		hospitalId
			? medoraHospitalPageUrl(
					hospitalId,
					'/medora/home/administration/document-master/document'
				)
			: null
	);

	async function loadList(bustCache = false) {
		if (!apiBase) return;
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
			if (bustCache) url.searchParams.set('_t', String(Date.now()));
			const res = await fetch(url);
			if (!res.ok) await throwUserFacingHttpError(res);
			listResult = (await res.json()) as GlobalDocumentLinkListResponse;
		} catch (err) {
			console.error(err);
			toastService.addToast(
				paraglideMsg('load_failed', 'Failed to load data.'),
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	}

	async function loadLookups() {
		if (!hospitalId) return;
		try {
			const [typesRes, settingsRes] = await Promise.all([
				fetch(
					`/api/medora/hospital/${hospitalId}/home/administration/document-master/document-type`
				),
				fetch(
					`/api/medora/hospital/${hospitalId}/home/administration/document-master/document-setting?page=1&pageSize=500`
				)
			]);
			if (typesRes.ok) {
				documentTypes = (await typesRes.json()) as DocumentTypeRow[];
			}
			if (settingsRes.ok) {
				const payload = (await settingsRes.json()) as {
					data?: DocumentSettingWithRelations[];
				};
				documentSettings = payload.data ?? [];
			}
		} catch (err) {
			console.error(err);
		}
	}

	function openLink(row: GlobalDocumentLinkRow) {
		linkOpenFor = row;
		documentTypeIdInput = row.documentTypeId
			? String(row.documentTypeId)
			: '';
		documentSettingIdInput = row.documentSettingId
			? String(row.documentSettingId)
			: '';
	}

	function closeLink() {
		linkOpenFor = null;
		documentTypeIdInput = '';
		documentSettingIdInput = '';
	}

	function closeView() {
		screenMode = 'list';
		viewOpenFor = null;
	}

	async function openView(row: GlobalDocumentLinkRow) {
		if (!apiBase) return;
		screenMode = 'view';
		viewLoading = true;
		viewOpenFor = null;
		try {
			const url = new URL(apiBase, window.location.origin);
			url.searchParams.set('documentId', String(row.id));
			const res = await fetch(url);
			if (!res.ok) await throwUserFacingHttpError(res);
			viewOpenFor = (await res.json()) as GlobalDocumentPreview;
		} catch (err) {
			console.error(err);
			screenMode = 'list';
			toastService.addToast(
				paraglideMsg('load_failed', 'Failed to load data.'),
				StatusColorEnum.ERROR
			);
		} finally {
			viewLoading = false;
		}
	}

	async function submitLink() {
		if (!linkOpenFor || !apiBase) return;
		if (!canLink) {
			toastService.addToast(
				paraglideMsg(
					'document_reusable_ack_required_hint',
					'Confirm the legal acknowledgement to add templates.'
				),
				StatusColorEnum.WARNING
			);
			return;
		}
		if (!documentTypeIdInput || !documentSettingIdInput) {
			toastService.addToast(
				'Document type and print layout are required.',
				StatusColorEnum.WARNING
			);
			return;
		}
		linkSaving = true;
		try {
			const res = await fetch(apiBase, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					documentId: linkOpenFor.id,
					documentTypeId: Number(documentTypeIdInput),
					documentSettingId: Number(documentSettingIdInput),
					locale: linkOpenFor.locale ?? 'en'
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			const title =
				linkOpenFor.documentNumber ?? linkOpenFor.code ?? String(linkOpenFor.id);
			toastService.addToast(
				m.document_reusable_add_success({ title }),
				StatusColorEnum.SUCCESS
			);
			closeLink();
			await loadList(true);
		} catch (err) {
			console.error(err);
			toastService.addToast(
				err instanceof Error ? err.message : 'Could not link document.',
				StatusColorEnum.ERROR
			);
		} finally {
			linkSaving = false;
		}
	}

	async function unlink(row: GlobalDocumentLinkRow) {
		if (!apiBase) return;
		const result = await dialogService.open({
			title: paraglideMsg(
				'document_reusable_remove_from_hospital',
				'Remove from hospital'
			),
			message: `Stop using “${row.documentNumber ?? row.code ?? row.id}” at this hospital? The global template is not deleted.`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			const res = await fetch(apiBase, {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ documentId: row.id })
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			await loadList(true);
			toastService.addToast('Removed hospital link.', StatusColorEnum.SUCCESS);
		} catch (err) {
			console.error(err);
			toastService.addToast(
				err instanceof Error ? err.message : 'Could not unlink.',
				StatusColorEnum.ERROR
			);
		}
	}

	const columns: MenziesTableColumn<GlobalDocumentLinkRow>[] = [
		{
			id: 'code',
			header: 'Code',
			widthClass: 'w-36 min-w-[9rem]',
			field: 'code',
			format: (v) => (v != null && String(v).trim() ? String(v) : '—')
		},
		{
			id: 'documentNumber',
			header: 'Name',
			widthClass: 'min-w-[12rem]',
			field: 'documentNumber',
			format: (v) => (v != null && String(v).trim() ? String(v) : '—')
		},
		{
			id: 'locale',
			header: 'Locale',
			widthClass: 'w-20',
			field: 'locale'
		},
		{
			id: 'linked',
			header: 'Hospital',
			widthClass: 'w-32',
			field: 'linked',
			format: (_v, row) =>
				row.linked
					? paraglideMsg('document_reusable_status_on_hospital', 'On hospital')
					: paraglideMsg(
							'document_reusable_status_not_on_hospital',
							'Not added'
						)
		},
		{
			id: 'status',
			header: m.status(),
			widthClass: 'w-28',
			filterable: true,
			filterType: 'select',
			filterOptions: [
				{ label: 'Active', value: String(StatusEnum.ACTIVE) },
				{ label: 'Inactive', value: String(StatusEnum.INACTIVE) }
			],
			defaultFilterValue: String(StatusEnum.ACTIVE),
			format: (_v, row) =>
				row.statusId === StatusEnum.ACTIVE
					? 'Active'
					: row.statusId === StatusEnum.INACTIVE
						? 'Inactive'
						: '—'
		}
	];

	lifeCycleUtil.onMount(() => {
		void loadLookups();
		void loadList();
	});
</script>

<div class="flex flex-col gap-4">
	{#if screenMode === 'list'}
	<header class="flex flex-col gap-1">
		<h1 class="text-xl font-semibold text-primary">
			{paraglideMsg(
				'document_reusable_global_documents_title',
				'Reusable global documents'
			)}
		</h1>
		<p class="text-sm text-base-content/70">
			{paraglideMsg(
				'document_reusable_global_documents_hint',
				'Medora-wide templates from system admin. Link them here with document type and print layout.'
			)}
		</p>
	</header>

	<div
		class="rounded-box border border-warning/30 bg-warning/10 p-3 text-sm"
		role="note"
	>
		<p class="mb-2 font-medium">
			{paraglideMsg(
				'document_catalog_legal_review_banner',
				'Review each template with hospital legal and clinical policy before use.'
			)}
		</p>
		<label class="flex cursor-pointer items-start gap-2">
			<input
				type="checkbox"
				class="checkbox checkbox-sm mt-0.5"
				bind:checked={legalAck}
			/>
			<span>
				{paraglideMsg(
					'document_catalog_legal_ack',
					'I confirm our hospital has reviewed this template for appropriate use.'
				)}
			</span>
		</label>
	</div>

	{#if documentListUrl}
		<div class="flex justify-end">
			<a class="btn btn-ghost btn-sm" href={documentListUrl}>
				{paraglideMsg(
					'document_reusable_open_document_list',
					'Open hospital documents'
				)}
			</a>
		</div>
	{/if}

	<div class="{TableEnum.HEIGHT} min-h-[20rem]">
		<MenziesTable
			title="Global templates"
			wash={true}
			showAddButton={false}
			rows={rows}
			{columns}
			{isLoading}
			bind:pageSize={pageSizeStr}
			bind:currentPage
			totalRowCount={total}
			showRefreshButton={true}
			showRowActions={true}
			enableColumnFilters={true}
			on:refresh={() => loadList(true)}
			on:pageSizeChange={() => {
				currentPage = 1;
				void loadList(true);
			}}
			on:pageChange={() => void loadList(true)}
			on:filtersChange={(e) => {
				tableFilters = e.detail.filters;
				currentPage = 1;
				void loadList(true);
			}}
		>
			{#snippet rowActions(row, _index)}
				{@const typedRow = row as GlobalDocumentLinkRow}
				<MenziesTableRowActionGroup>
					<MenziesTableIconAction
						tooltipText={m.view_data()}
						color="primary"
						disabled={viewLoading}
						onClick={() => openView(typedRow)}
					>
						{#snippet icon()}
							<LucideEye className="size-3.5" />
						{/snippet}
					</MenziesTableIconAction>
					{#if typedRow.linked}
						<MenziesTableIconAction
							tooltipText={paraglideMsg(
								'document_reusable_remove_from_hospital',
								'Remove from hospital'
							)}
							color="error"
							onClick={() => unlink(typedRow)}
						>
							{#snippet icon()}
								<LucideTrash2 className="size-3.5" />
							{/snippet}
						</MenziesTableIconAction>
					{:else}
						<MenziesTableIconAction
							tooltipText={paraglideMsg(
								'document_reusable_add_to_hospital',
								'Add to hospital'
							)}
							color="primary"
							disabled={!canLink}
							onClick={() => openLink(typedRow)}
						>
							{#snippet icon()}
								<LucideLink className="size-3.5" />
							{/snippet}
						</MenziesTableIconAction>
					{/if}
				</MenziesTableRowActionGroup>
			{/snippet}
		</MenziesTable>
	</div>
	{:else}
		<WashCard>
			<WashCardBody className="flex flex-col gap-4">
				<div class="flex items-center justify-between gap-2">
					<h2 class="text-lg font-semibold">
						{m.view_data()}
						{#if viewOpenFor}
							<span class="font-normal text-base-content/70">
								—
								{viewOpenFor.documentNumber ??
									viewOpenFor.code ??
									viewOpenFor.id}
							</span>
						{/if}
					</h2>
					<WashButton
						className="btn-ghost btn-sm"
						onClick={closeView}
					>
						<LucideX className="size-3.5" />
						{paraglideMsg('inv_common_back_to_list', 'Back to list')}
					</WashButton>
				</div>
				{#if viewLoading}
					<div class="flex min-h-[24rem] items-center justify-center">
						<span class="loading loading-spinner loading-md"></span>
					</div>
				{:else if viewOpenFor}
					<p class="text-xs text-base-content/60">
						{viewOpenFor.code ?? '—'} · {viewOpenFor.locale ?? 'en'}
						{#if viewOpenFor.clinicalSection}
							· {viewOpenFor.clinicalSection}
						{/if}
						·
						{viewOpenFor.linked
							? paraglideMsg(
									'document_reusable_status_on_hospital',
									'On hospital'
								)
							: paraglideMsg(
									'document_reusable_status_not_on_hospital',
									'Not added'
								)}
					</p>
					<div class="mb-2">
						<span class="text-sm font-medium">Document Content</span>
					</div>
					<DocumentMasterHtmlPrintEditor
						html={viewOpenFor.documentText ?? ''}
						documentTitle={viewOpenFor.documentNumber ?? 'Document'}
						setting={null}
						readOnly={true}
						showPlaceholders={false}
					/>
				{/if}
			</WashCardBody>
		</WashCard>
	{/if}

	{#if linkOpenFor}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-base-300/50 p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="link-global-doc-title"
		>
			<div
				class="flex w-full max-w-lg flex-col gap-4 rounded-box border border-ink-border bg-base-100 p-4 shadow-lg"
			>
				<h2 id="link-global-doc-title" class="text-lg font-semibold">
					{paraglideMsg('document_reusable_add_to_hospital', 'Add to hospital')}
				</h2>
				<p class="text-sm text-base-content/70">
					{linkOpenFor.documentNumber ?? linkOpenFor.code ?? linkOpenFor.id}
					{#if linkOpenFor.code}
						<span class="opacity-60">({linkOpenFor.code})</span>
					{/if}
				</p>
				<div class="flex flex-col gap-3">
					<div class="flex flex-col gap-1">
						<span class="text-sm font-medium">
							Document type <span class="text-error">*</span>
						</span>
						<WashSelect
							bind:value={documentTypeIdInput}
							optionHeader="Select document type…"
						>
							{#each documentTypes as dt (dt.id)}
								<option value={String(dt.id)}>{dt.documentType}</option>
							{/each}
						</WashSelect>
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-sm font-medium">
							Document setting (print layout) <span class="text-error">*</span>
						</span>
						<WashSelect
							bind:value={documentSettingIdInput}
							optionHeader="Select document setting…"
						>
							{#each documentSettings as ds (ds.id)}
								<option value={String(ds.id)}>{ds.name}</option>
							{/each}
						</WashSelect>
					</div>
				</div>
				<div class="flex justify-end gap-2">
					<WashButton variant="ghost" disabled={linkSaving} onClick={closeLink}>
						{m.cancel()}
					</WashButton>
					<WashButton
						variant="primary"
						loading={linkSaving}
						disabled={linkSaving || !canLink}
						onClick={submitLink}
					>
						{paraglideMsg('document_reusable_add_to_hospital', 'Add to hospital')}
					</WashButton>
				</div>
			</div>
		</div>
	{/if}
</div>
