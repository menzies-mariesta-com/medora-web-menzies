<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import MenziesTableViewEditDeleteActions from '$lib/component/own/library/menzies/table/MenziesTableViewEditDeleteActions.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import LucideCopy from '$lib/component/own/library/lucide/LucideCopy.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { DOCUMENT_TEMPLATE_PLACEHOLDERS } from '$lib/util/document-placeholder.util';
	import {
		appendPlaceholderToHtml,
		formatHtmlForEditor
	} from '$lib/util/format-html.util';
	import { buildDocumentMasterPreviewHtml } from '$lib/util/document-master-preview.util.svelte';
	import type { PrintDocumentLayoutInput } from '$lib/util/print-document-html.util';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { m } from '$lib/paraglide/messages';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import type {
		DocumentSettingRow,
		DocumentSettingWithRelations,
		DocumentTypeRow
	} from '$lib/model/type/document-setting.type';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(page.params.hospital_id ?? '');

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

	function documentSettingApiUrl(
		params?: Record<string, string | number>
	) {
		const base = `/api/medora/hospital/${hospitalId}/home/administration/document-master/document-setting`;
		if (!params) return base;
		const usp = new URLSearchParams();
		for (const [k, v] of Object.entries(params)) {
			if (v == null) continue;
			usp.set(k, String(v));
		}
		const qs = usp.toString();
		return qs ? `${base}?${qs}` : base;
	}

	function documentTypeApiUrl() {
		return `/api/medora/hospital/${hospitalId}/home/administration/document-master/document-type`;
	}

	const PAGE_SIZES = ['A4', 'A5', 'Letter', 'Legal'] as const;
	const ORIENTATIONS = ['portrait', 'landscape'] as const;

	let settingResult =
		$state<PaginatedResult<DocumentSettingWithRelations> | null>(
			null
		);
	let documentTypes = $state<DocumentTypeRow[]>([]);
	let currentPage = $state(1);
	let filterPageSize = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);
	let isLoading = $state(false);
	const saveLock = createActionLock();
	const deleteLock = createActionLock();
	let deletingId = $state<number | null>(null);

	type ViewMode = 'list' | 'create' | 'edit' | 'view';
	let viewMode = $state<ViewMode>('list');
	let editingId = $state<number | null>(null);

	let nameInput = $state('');
	let documentTypeIdInput = $state('');
	let descriptionInput = $state('');

	let marginTop = $state(20);
	let marginBottom = $state(20);
	let marginLeft = $state(15);
	let marginRight = $state(15);
	let paddingTop = $state(10);
	let paddingBottom = $state(10);
	let paddingLeft = $state(10);
	let paddingRight = $state(10);
	let pageSizeInput = $state('A4');
	let pageOrientation = $state('portrait');
	let showHeader = $state(true);
	let showFooter = $state(true);
	let headerHtml = $state('');
	let footerHtml = $state('');

	let showPlaceholderPanel = $state(false);
	let activeEditorTarget = $state<'header' | 'footer' | null>(null);
	let layoutPreviewIframe = $state<HTMLIFrameElement | null>(null);
	let editingIsSystem = $state(false);

	const currentPrintLayout = $derived.by((): PrintDocumentLayoutInput => ({
		marginTop,
		marginBottom,
		marginLeft,
		marginRight,
		paddingTop,
		paddingBottom,
		paddingLeft,
		paddingRight,
		pageSize: pageSizeInput,
		pageOrientation,
		showHeader,
		showFooter
	}));

	const layoutPreviewHtml = $derived(
		buildDocumentMasterPreviewHtml({
			documentHtml:
				'<p><em>Document body appears here when printing.</em></p>',
			documentTitle: nameInput || 'Document setting preview',
			headerHtml: showHeader ? headerHtml : '',
			footerHtml: showFooter ? footerHtml : '',
			setting: currentPrintLayout
		})
	);

	$effect(() => {
		const iframe = layoutPreviewIframe;
		const content = layoutPreviewHtml;
		if (!iframe) return;
		const doc = iframe.contentDocument;
		if (!doc) return;
		doc.open();
		doc.write(content);
		doc.close();
	});

	function settingDisplayName(item: DocumentSettingWithRelations): string {
		return item.hospitalId == null ? `(System) ${item.name}` : item.name;
	}

	function isSystemSetting(item: DocumentSettingWithRelations): boolean {
		return item.hospitalId == null;
	}

	const settingList = $derived(settingResult?.data ?? []);
	const total = $derived(settingResult?.total ?? 0);

	let tableFilters = $state<Record<string, string>>({});

	async function fetchData(opts?: { bustCache?: boolean }) {
		if (!hospitalId) return;
		isLoading = true;
		const pageSize = Number(filterPageSize) || 10;
		const parsedStatusId = tableFilters.status
			? Number(tableFilters.status)
			: undefined;
		try {
			settingResult = await apiFetch<
				PaginatedResult<DocumentSettingWithRelations>
			>(
				documentSettingApiUrl({
					page: currentPage,
					pageSize,
					includeGlobal: 'true',
					...(parsedStatusId != null &&
					Number.isFinite(parsedStatusId)
						? { statusId: parsedStatusId }
						: {}),
					...(opts?.bustCache ? { _t: Date.now() } : {})
				})
			);
		} finally {
			isLoading = false;
		}
	}

	async function fetchDocumentTypes() {
		if (!hospitalId) return;
		try {
			documentTypes = await apiFetch<DocumentTypeRow[]>(
				documentTypeApiUrl()
			);
		} catch (err) {
			console.error('Failed to load document types', err);
		}
	}

	lifeCycleUtil.onMount(() => {
		fetchData();
		fetchDocumentTypes();
	});

	function resetForm() {
		viewMode = 'list';
		editingId = null;
		nameInput = '';
		documentTypeIdInput = '';
		descriptionInput = '';
		marginTop = 20;
		marginBottom = 20;
		marginLeft = 15;
		marginRight = 15;
		paddingTop = 10;
		paddingBottom = 10;
		paddingLeft = 10;
		paddingRight = 10;
		pageSizeInput = 'A4';
		pageOrientation = 'portrait';
		showHeader = true;
		showFooter = true;
		headerHtml = '';
		footerHtml = '';
		showPlaceholderPanel = false;
		activeEditorTarget = null;
		editingIsSystem = false;
	}

	function startCreate() {
		resetForm();
		viewMode = 'create';
	}

	function loadFormFromItem(item: DocumentSettingWithRelations) {
		editingId = item.id;
		nameInput = item.name ?? '';
		documentTypeIdInput = item.documentTypeId
			? String(item.documentTypeId)
			: '';
		descriptionInput = item.description ?? '';
		marginTop = item.marginTop ?? 20;
		marginBottom = item.marginBottom ?? 20;
		marginLeft = item.marginLeft ?? 15;
		marginRight = item.marginRight ?? 15;
		paddingTop = item.paddingTop ?? 10;
		paddingBottom = item.paddingBottom ?? 10;
		paddingLeft = item.paddingLeft ?? 10;
		paddingRight = item.paddingRight ?? 10;
		pageSizeInput = item.pageSize ?? 'A4';
		pageOrientation = item.pageOrientation ?? 'portrait';
		showHeader = item.showHeader ?? true;
		showFooter = item.showFooter ?? true;
		headerHtml = item.headerHtml ?? '';
		footerHtml = item.footerHtml ?? '';
	}

	function startEdit(item: DocumentSettingWithRelations) {
		if (isSystemSetting(item)) {
			startView(item);
			return;
		}
		loadFormFromItem(item);
		viewMode = 'edit';
		editingIsSystem = false;
	}

	function startView(item: DocumentSettingWithRelations) {
		loadFormFromItem(item);
		viewMode = 'view';
		editingIsSystem = isSystemSetting(item);
	}

	async function handleSave() {
		if (!nameInput.trim()) {
			toastService.addToast(
				'Name is required',
				StatusColorEnum.WARNING
			);
			return;
		}
		await saveLock.run(async () => {
			try {
				const payload = {
					hospitalId,
					name: nameInput.trim(),
					documentTypeId: documentTypeIdInput
						? Number(documentTypeIdInput)
						: null,
					description: descriptionInput.trim() || null,
					marginTop,
					marginBottom,
					marginLeft,
					marginRight,
					paddingTop,
					paddingBottom,
					paddingLeft,
					paddingRight,
					pageSize: pageSizeInput,
					pageOrientation,
					showHeader,
					showFooter,
					headerHtml: headerHtml || null,
					footerHtml: footerHtml || null
				};

				if (editingId) {
					await apiFetch(documentSettingApiUrl(), {
						method: 'PUT',
						body: JSON.stringify({ id: editingId, ...payload })
					});
					toastSuccess(
						toastService,
						m.entity_document_setting(),
						m.toast_action_updated()
					);
				} else {
					await apiFetch(documentSettingApiUrl(), {
						method: 'POST',
						body: JSON.stringify(payload)
					});
					toastSuccess(
						toastService,
						m.entity_document_setting(),
						m.toast_action_created()
					);
				}
				resetForm();
				fetchData({ bustCache: true });
			} catch (err) {
				console.error(err);
				toastService.addToast(
					'Failed to save document setting',
					StatusColorEnum.ERROR
				);
			}
		});
	}

	async function handleDelete(item: DocumentSettingRow) {
		await deleteLock.run(async () => {
			deletingId = item.id;
			try {
				const result = await dialogService.open({
					title: 'Confirm delete',
					message: `Delete="${item.name}"?`,
					variant: DialogVariantEnum.CONFIRM
				});
				if (!result?.confirmed) return;

				await apiFetch(documentSettingApiUrl(), {
					method: 'DELETE',
					body: JSON.stringify({ id: item.id })
				});
				toastSuccess(
					toastService,
					m.entity_document_setting(),
					m.toast_action_deleted()
				);
				fetchData({ bustCache: true });
			} catch (err) {
				console.error(err);
				toastService.addErrorToast(
					'Could not delete this document setting',
					err
				);
			} finally {
				deletingId = null;
			}
		});
	}

	function copyPlaceholder(placeholder: string) {
		navigator.clipboard.writeText(placeholder);
		toastService.addToast(
			'Placeholder copied to clipboard',
			StatusColorEnum.INFO,
			placeholder
		);
	}

	function insertPlaceholder(placeholder: string) {
		if (activeEditorTarget === 'header') {
			headerHtml = appendPlaceholderToHtml(headerHtml, placeholder);
		} else if (activeEditorTarget === 'footer') {
			footerHtml = appendPlaceholderToHtml(footerHtml, placeholder);
		}

		toastService.addToast(
			`Inserted: ${placeholder}`,
			StatusColorEnum.INFO
		);
	}

	function formatHeaderHtml() {
		headerHtml = formatHtmlForEditor(headerHtml);
	}

	function formatFooterHtml() {
		footerHtml = formatHtmlForEditor(footerHtml);
	}

	const columns: MenziesTableColumn<DocumentSettingWithRelations>[] = [
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
			id: 'name',
			header: 'Name',
			widthClass: 'w-48 min-w-[12rem]',
			filterable: false,
			format: (_value, row) => settingDisplayName(row)
		},
		{
			id: 'documentType',
			header: 'Document Type',
			widthClass: 'w-32 min-w-[8rem]',
			filterable: false,
			format: (_value, row) => row.documentType?.documentType ?? '—'
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
			id: 'pageSize',
			header: 'Page',
			widthClass: 'w-24 min-w-[6rem]',
			filterable: false,
			format: (value, row) =>
				`${value ?? 'A4'} ${row.pageOrientation === 'landscape' ? '↔' : '↕'}`
		}
	];
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">Document settings</h1>
		{#if viewMode === 'list'}
			<WashButton
				className="btn-outline btn-sm btn-square"
				onClick={startCreate}
			>
				<LucidePlus />
			</WashButton>
		{/if}
	</div>

	{#if viewMode !== 'list'}
		<WashCard>
			<WashCardBody>
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-lg font-semibold">
						{viewMode === 'view'
							? editingIsSystem
								? 'View system document setting'
								: 'View'
							: editingId
								? 'Edit'
								: 'Create'} Document Setting
					</h2>
					<WashButton
						className="btn-xs btn-ghost btn-square"
						onClick={resetForm}
					>
						<LucideX className="w-4 h-4" />
					</WashButton>
				</div>

				<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<!-- Left Column: Basic Info + Page Layout -->
					<div class="space-y-4">
						<div class="rounded-lg bg-base-200 p-4">
							<h3 class="mb-3 font-medium">Basic Information</h3>
							<div class="space-y-3">
								<div class="flex flex-col gap-1">
									<label for="name">Name <span class="text-error">*</span
										></label>
									<WashInputField
										id="name"
										bind:value={nameInput}
										inputType="text"
										inputPlaceholderText="e.g., OPD Consent Form"
										disabled={viewMode === 'view'}
									/>
								</div>
								<div class="flex flex-col gap-1">
									<label for="documentType">Document Type</label>
									<WashSelect
										bind:value={documentTypeIdInput}
										optionHeader="Select type..."
										disabled={viewMode === 'view'}
									>
										{#each documentTypes as dt (dt.id)}
											<option value={String(dt.id)}
												>{dt.documentType}</option
											>
										{/each}
									</WashSelect>
								</div>
								<div class="flex flex-col gap-1">
									<label for="description">Description</label>
									<textarea
										id="description"
										bind:value={descriptionInput}
										placeholder="Optional description..."
										disabled={viewMode === 'view'}
										class="textarea h-16"
									></textarea>
								</div>
							</div>
						</div>

						<div class="rounded-lg bg-base-200 p-4">
							<h3 class="mb-3 font-medium">Page Layout</h3>
							<div class="grid grid-cols-2 gap-3">
								<div class="flex flex-col gap-1">
									<label for="pageSize">Page Size</label>
									<WashSelect
										bind:value={pageSizeInput}
										disabled={viewMode === 'view'}
									>
										{#each PAGE_SIZES as size (size)}
											<option value={size}>{size}</option>
										{/each}
									</WashSelect>
								</div>
								<div class="flex flex-col gap-1">
									<label for="pageOrientation">Orientation</label>
									<WashSelect
										bind:value={pageOrientation}
										disabled={viewMode === 'view'}
									>
										{#each ORIENTATIONS as orient (orient)}
											<option value={orient}>{orient}</option>
										{/each}
									</WashSelect>
								</div>
							</div>

							<h4 class="mt-4 mb-2 text-sm font-medium">
								Margins (mm)
							</h4>
							<div class="grid grid-cols-4 gap-2">
								<div class="flex flex-col gap-1">
									<label
										for="marginTop"
										class="text-xs text-base-content/70">Top</label
									>
									<input
										id="marginTop"
										type="number"
										class="medora-number-input input-bordered input h-9 w-full text-[0.98rem]"
										bind:value={marginTop}
										disabled={viewMode === 'view'}
									/>
								</div>
								<div class="flex flex-col gap-1">
									<label
										for="marginBottom"
										class="text-xs text-base-content/70">Bottom</label
									>
									<input
										id="marginBottom"
										type="number"
										class="medora-number-input input-bordered input h-9 w-full text-[0.98rem]"
										bind:value={marginBottom}
										disabled={viewMode === 'view'}
									/>
								</div>
								<div class="flex flex-col gap-1">
									<label
										for="marginLeft"
										class="text-xs text-base-content/70">Left</label
									>
									<input
										id="marginLeft"
										type="number"
										class="medora-number-input input-bordered input h-9 w-full text-[0.98rem]"
										bind:value={marginLeft}
										disabled={viewMode === 'view'}
									/>
								</div>
								<div class="flex flex-col gap-1">
									<label
										for="marginRight"
										class="text-xs text-base-content/70">Right</label
									>
									<input
										id="marginRight"
										type="number"
										class="medora-number-input input-bordered input h-9 w-full text-[0.98rem]"
										bind:value={marginRight}
										disabled={viewMode === 'view'}
									/>
								</div>
							</div>

							<h4 class="mt-4 mb-2 text-sm font-medium">
								Padding (mm)
							</h4>
							<div class="grid grid-cols-4 gap-2">
								<div class="flex flex-col gap-1">
									<label
										for="paddingTop"
										class="text-xs text-base-content/70">Top</label
									>
									<input
										id="paddingTop"
										type="number"
										class="medora-number-input input-bordered input h-9 w-full text-[0.98rem]"
										bind:value={paddingTop}
										disabled={viewMode === 'view'}
									/>
								</div>
								<div class="flex flex-col gap-1">
									<label
										for="paddingBottom"
										class="text-xs text-base-content/70">Bottom</label
									>
									<input
										id="paddingBottom"
										type="number"
										class="medora-number-input input-bordered input h-9 w-full text-[0.98rem]"
										bind:value={paddingBottom}
										disabled={viewMode === 'view'}
									/>
								</div>
								<div class="flex flex-col gap-1">
									<label
										for="paddingLeft"
										class="text-xs text-base-content/70">Left</label
									>
									<input
										id="paddingLeft"
										type="number"
										class="medora-number-input input-bordered input h-9 w-full text-[0.98rem]"
										bind:value={paddingLeft}
										disabled={viewMode === 'view'}
									/>
								</div>
								<div class="flex flex-col gap-1">
									<label
										for="paddingRight"
										class="text-xs text-base-content/70">Right</label
									>
									<input
										id="paddingRight"
										type="number"
										class="medora-number-input input-bordered input h-9 w-full text-[0.98rem]"
										bind:value={paddingRight}
										disabled={viewMode === 'view'}
									/>
								</div>
							</div>
						</div>
					</div>

					<!-- Middle Column: Header & Footer Editors -->
					<div class="space-y-4 lg:col-span-2">
						<!-- Header Section -->
						<div class="rounded-lg bg-base-200 p-4">
							<div class="mb-3 flex items-center justify-between">
								<div class="flex items-center gap-3">
									<h3 class="font-medium">Header Section</h3>
									<label class="flex items-center gap-2 text-sm">
										<input
											type="checkbox"
											class="checkbox checkbox-sm"
											bind:checked={showHeader}
											disabled={viewMode === 'view'}
										/>
										Show Header
									</label>
								</div>
								{#if viewMode !== 'view'}
									<button
										type="button"
										class="btn btn-ghost btn-xs"
										onclick={() => {
											activeEditorTarget = 'header';
											showPlaceholderPanel = !showPlaceholderPanel;
										}}
									>
										Insert Placeholder
									</button>
								{/if}
							</div>
							{#if showHeader}
								<div class="space-y-2">
									{#if viewMode !== 'view'}
										<button
											type="button"
											class="btn btn-outline btn-xs"
											onclick={formatHeaderHtml}
										>
											Format HTML
										</button>
									{/if}
									<textarea
										class="textarea-bordered textarea min-h-[150px] w-full font-mono text-sm"
										bind:value={headerHtml}
										disabled={viewMode === 'view'}
										placeholder="Header HTML with placeholders..."
									></textarea>
								</div>
							{:else}
								<div
									class="p-4 text-center text-sm text-base-content/50 italic"
								>
									Header is disabled
								</div>
							{/if}
						</div>

						<!-- Footer Section -->
						<div class="rounded-lg bg-base-200 p-4">
							<div class="mb-3 flex items-center justify-between">
								<div class="flex items-center gap-3">
									<h3 class="font-medium">Footer Section</h3>
									<label class="flex items-center gap-2 text-sm">
										<input
											type="checkbox"
											class="checkbox checkbox-sm"
											bind:checked={showFooter}
											disabled={viewMode === 'view'}
										/>
										Show Footer
									</label>
								</div>
								{#if viewMode !== 'view'}
									<button
										type="button"
										class="btn btn-ghost btn-xs"
										onclick={() => {
											activeEditorTarget = 'footer';
											showPlaceholderPanel = !showPlaceholderPanel;
										}}
									>
										Insert Placeholder
									</button>
								{/if}
							</div>
							{#if showFooter}
								<div class="space-y-2">
									{#if viewMode !== 'view'}
										<button
											type="button"
											class="btn btn-outline btn-xs"
											onclick={formatFooterHtml}
										>
											Format HTML
										</button>
									{/if}
									<textarea
										class="textarea-bordered textarea min-h-[150px] w-full font-mono text-sm"
										bind:value={footerHtml}
										disabled={viewMode === 'view'}
										placeholder="Footer HTML with placeholders..."
									></textarea>
								</div>
							{:else}
								<div
									class="p-4 text-center text-sm text-base-content/50 italic"
								>
									Footer is disabled
								</div>
							{/if}
						</div>

						<!-- Placeholder Panel -->
						{#if showPlaceholderPanel && viewMode !== 'view'}
							<div class="rounded-lg bg-base-200 p-4">
								<div class="mb-3 flex items-center justify-between">
									<h3 class="font-medium">Template Placeholders</h3>
									<button
										type="button"
										class="btn btn-ghost btn-xs"
										onclick={() => (showPlaceholderPanel = false)}
									>
										<LucideX className="w-3 h-3" />
									</button>
								</div>
								<p class="mb-3 text-xs text-base-content/70">
									Click to copy, or click="Insert" to add to {activeEditorTarget}
									editor.
								</p>
								<div
									class="grid max-h-64 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2 xl:grid-cols-3"
								>
									{#each DOCUMENT_TEMPLATE_PLACEHOLDERS as category (category.category)}
										<div class="space-y-1">
											<h4 class="text-xs font-semibold text-primary">
												{category.category}
											</h4>
											{#each category.placeholders as ph (ph.key)}
												<div
													class="flex items-center justify-between rounded bg-base-100 px-2 py-1 text-xs"
												>
													<div class="min-w-0 flex-1">
														<code
															class="font-mono text-[10px] text-primary"
															>{ph.key}</code
														>
														<p class="truncate text-base-content/60">
															{ph.desc}
														</p>
													</div>
													<div class="ml-2 flex items-center gap-1">
														<button
															type="button"
															class="btn p-1 btn-ghost btn-xs"
															onclick={() => copyPlaceholder(ph.key)}
															title="Copy"
														>
															<LucideCopy className="w-3 h-3" />
														</button>
														<button
															type="button"
															class="btn p-1 btn-xs btn-primary"
															onclick={() =>
																insertPlaceholder(ph.key)}
															title="Insert"
														>
															<LucidePlus className="w-3 h-3" />
														</button>
													</div>
												</div>
											{/each}
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<div class="rounded-lg bg-base-200 p-4">
							<h3 class="mb-3 font-medium">Layout preview</h3>
							<div
								class="overflow-hidden rounded-lg border border-base-300 bg-white"
							>
								<iframe
									bind:this={layoutPreviewIframe}
									title="Document setting layout preview"
									class="min-h-[320px] w-full border-0 bg-white"
									sandbox="allow-same-origin"
								></iframe>
							</div>
						</div>
					</div>
				</div>

				{#if viewMode !== 'view'}
					<div
						class="mt-6 flex justify-end gap-2 border-t border-base-300 pt-4"
					>
						<WashButton
							className="btn-ghost btn-sm"
							onClick={resetForm}
							disabled={saveLock.pending || deleteLock.pending}
						>
							Cancel
						</WashButton>
						<WashButton
							className="btn-primary btn-sm"
							onClick={handleSave}
							loading={saveLock.pending}
							disabled={isLoading}
						>
							{editingId ? m.update() : m.create()}
						</WashButton>
					</div>
				{/if}
			</WashCardBody>
		</WashCard>
	{/if}

	<WashCard>
		<WashCardBody>
			<div class="{TableEnum.HEIGHT} overflow-auto">
				<MenziesTable
					rows={settingList}
					{columns}
					{isLoading}
					bind:pageSize={filterPageSize}
					bind:currentPage
					totalRowCount={total}
					showRefreshButton={true}
					refreshTooltip="Refresh"
					emptyMessage="No document settings found"
					showRowActions={true}
					actionsHeader="Actions"
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
						{@const typedRow = row as DocumentSettingWithRelations}
						<MenziesTableViewEditDeleteActions
							onView={() => startView(typedRow)}
							onEdit={() => startEdit(typedRow)}
							onDelete={() => handleDelete(typedRow)}
							viewDisabled={deleteLock.pending}
							editDisabled={deleteLock.pending || isSystemSetting(typedRow)}
							deleteDisabled={deleteLock.pending ||
								isLoading ||
								isSystemSetting(typedRow)}
							deleteLoading={deletingId === typedRow.id}
							viewTooltip={m.view_data()}
							editTooltip={m.edit_data()}
							deleteTooltip={m.delete_data()}
						/>
					{/snippet}
				</MenziesTable>
			</div>
		</WashCardBody>
	</WashCard>
</div>

<style>
	/* Native number spinners are small/janky on some browsers; bump their clickable area. */
	.medora-number-input::-webkit-inner-spin-button,
	.medora-number-input::-webkit-outer-spin-button {
		height: 1.25rem;
		opacity: 1;
	}
</style>
