<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiLoading from '$lib/component/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucideCopy from '$lib/component/own/library/lucide/LucideCopy.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import TinyMceEditor from '$lib/component/own/tinymce/TinyMceEditor.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { m } from '$lib/paraglide/messages';
	import { remoteInvoke } from '$lib/api/remote-invoke-client';
	import type { PaginatedResult } from '$lib/remote/table/pagination-type';
	import type { PaginatedResult } from '$lib/tool/remote/table/pagination-type';
	import {
		getDocumentSettingsPaginated,
		createDocumentSetting,
		updateDocumentSetting,
		deleteDocumentSetting,
	} from '$lib/tool/remote/table/information-table/document-setting.http.tool.svelte';
	import type { DocumentSettingWithRelations } from '$lib/remote/table/information-table/document-setting.remote';
	import type { DocumentTypeSchema } from '$lib/server/db/schema-type';
	import type {
		DocumentSettingSchema
	} from '$lib/server/db/schema-type';
	import { DOCUMENT_TEMPLATE_PLACEHOLDERS } from '$lib/util/document-placeholder.util';
	import { StatusEnum } from '$lib/model/enum/db-link';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const DOCUMENT_SETTING_MODULE =
		'table/information-table/document-setting.remote.ts';
	const DOCUMENT_TYPE_MODULE =
		'table/information-table/document-type.remote.ts';

	async function createDocumentSettingApi(
		payload: any
	) {
		return remoteInvoke({
			module: DOCUMENT_SETTING_MODULE,
			fn: 'createDocumentSetting',
			args: [payload]
		});
	}

	async function updateDocumentSettingApi(payload: any) {
		return remoteInvoke({
			module: DOCUMENT_SETTING_MODULE,
			fn: 'updateDocumentSetting',
			args: [payload]
		});
	}

	async function deleteDocumentSettingApi(payload: { id: number }) {
		return remoteInvoke({
			module: DOCUMENT_SETTING_MODULE,
			fn: 'deleteDocumentSetting',
			args: [payload]
		});
	}

	const PAGE_SIZES = ['A4', 'A5', 'Letter', 'Legal'] as const;
	const ORIENTATIONS = ['portrait', 'landscape'] as const;

	let settingResult =
		$state<PaginatedResult<DocumentSettingWithRelations> | null>(
			null
		);
	let documentTypes = $state<DocumentTypeSchema[]>([]);
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

	const settingList = $derived(settingResult?.data ?? []);
	const total = $derived(settingResult?.total ?? 0);

	let tableFilters = $state<Record<string, string>>({});

	async function fetchData(opts?: { bustCache?: boolean }) {
		isLoading = true;
		const pageSize = Number(filterPageSize) || 10;
		const parsedStatusId = tableFilters.status
			? Number(tableFilters.status)
			: undefined;
		try {
			settingResult =
				await remoteInvoke<PaginatedResult<DocumentSettingWithRelations>>({
					module: DOCUMENT_SETTING_MODULE,
					fn: 'getDocumentSettingsPaginated',
					args: [
						{
							page: currentPage,
							pageSize,
							statusId:
								parsedStatusId != null &&
								Number.isFinite(parsedStatusId)
									? parsedStatusId
									: undefined,
							...(opts?.bustCache && { _t: Date.now() })
						}
					]
				});
		} finally {
			isLoading = false;
		}
	}

	async function fetchDocumentTypes() {
		try {
			documentTypes = await remoteInvoke<DocumentTypeSchema[]>({
				module: DOCUMENT_TYPE_MODULE,
				fn: 'getDocumentTypes',
				args: []
			});
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
	}

	function startCreate() {
		resetForm();
		viewMode = 'create';
	}

	function startEdit(item: DocumentSettingWithRelations) {
		viewMode = 'edit';
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

	function startView(item: DocumentSettingWithRelations) {
		startEdit(item);
		viewMode = 'view';
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
					await updateDocumentSettingApi({
						id: editingId,
						...payload
					});
					toastService.addToast(
						'Document setting updated',
						StatusColorEnum.SUCCESS
					);
				} else {
					await createDocumentSettingApi(payload);
					toastService.addToast(
						'Document setting created',
						StatusColorEnum.SUCCESS
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

	async function handleDelete(item: DocumentSettingSchema) {
		await deleteLock.run(async () => {
			deletingId = item.id;
			try {
				const result = await dialogService.open({
					title: 'Confirm delete',
					message: `Delete "${item.name}"?`,
					variant: DialogVariantEnum.CONFIRM
				});
				if (!result?.confirmed) return;

				await deleteDocumentSettingApi({ id: item.id });
				toastService.addToast(
					'Document setting deleted',
					StatusColorEnum.SUCCESS
				);
				fetchData({ bustCache: true });
			} catch (err) {
				console.error(err);
				toastService.addToast('Failed to delete', StatusColorEnum.ERROR);
			} finally {
				deletingId = null;
			}
		});
	}

	function copyPlaceholder(placeholder: string) {
		navigator.clipboard.writeText(placeholder);
		toastService.addToast(
			`Copied: ${placeholder}`,
			StatusColorEnum.INFO
		);
	}

	function insertPlaceholder(placeholder: string) {
		function appendPlaceholderToHtml(
			currentHtml: string,
			nextPlaceholder: string
		): string {
			const current = currentHtml ?? '';
			const trimmed = current.trim();
			if (!trimmed) return nextPlaceholder;

			const lastChar = trimmed[trimmed.length - 1] ?? '';
			const needsSpace =
				!/\s/.test(lastChar) && lastChar !== '>';

			return current + (needsSpace ? ' ' : '') + nextPlaceholder;
		}

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

	const columns: MariTableColumn<DocumentSettingWithRelations>[] = [
		{
			id: 'displayNo',
			header: 'No',
			widthClass: 'w-14 min-w-[3.5rem]',
			filterable: false,
			format: (_v, _row, rowIndex) =>
				(currentPage - 1) *
					(Number(filterPageSize) || AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE) +
				rowIndex +
				1
		},
		{
			id: 'name',
			header: 'Name',
			widthClass: 'w-48 min-w-[12rem]',
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
			<DaisyUiButton
				className="d-btn-outline d-btn-sm d-btn-square"
				onClick={startCreate}
			>
				<LucidePlus />
			</DaisyUiButton>
		{/if}
	</div>

	{#if viewMode !== 'list'}
		<DaisyUiCard>
			<DaisyUiCardBody>
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-lg font-semibold">
						{viewMode === 'view'
							? 'View'
							: editingId
								? 'Edit'
								: 'Create'} Document Setting
					</h2>
					<DaisyUiButton
						className="d-btn-ghost d-btn-sm"
						onClick={resetForm}
					>
						<LucideX className="w-4 h-4" />
					</DaisyUiButton>
				</div>

				<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<!-- Left Column: Basic Info + Page Layout -->
					<div class="space-y-4">
						<div class="rounded-lg bg-base-200 p-4">
							<h3 class="mb-3 font-medium">Basic Information</h3>
							<div class="space-y-3">
								<div class="flex flex-col gap-1">
									<DaisyUiLabel forText="name"
										>Name <span class="text-error">*</span
										></DaisyUiLabel
									>
									<DaisyUiInputField
										id="name"
										bind:value={nameInput}
										inputType="text"
										inputPlaceholderText="e.g., OPD Consent Form"
										disabled={viewMode === 'view'}
									/>
								</div>
								<div class="flex flex-col gap-1">
									<DaisyUiLabel forText="documentType"
										>Document Type</DaisyUiLabel
									>
									<DaisyUiSelect
										bind:value={documentTypeIdInput}
										optionHeader="Select type..."
										disabled={viewMode === 'view'}
									>
										{#each documentTypes as dt (dt.id)}
											<option value={String(dt.id)}
												>{dt.documentType}</option
											>
										{/each}
									</DaisyUiSelect>
								</div>
								<div class="flex flex-col gap-1">
									<DaisyUiLabel forText="description"
										>Description</DaisyUiLabel
									>
									<textarea
										id="description"
										bind:value={descriptionInput}
										placeholder="Optional description..."
										disabled={viewMode === 'view'}
										class="d-textarea h-16"
									></textarea>
								</div>
							</div>
						</div>

						<div class="rounded-lg bg-base-200 p-4">
							<h3 class="mb-3 font-medium">Page Layout</h3>
							<div class="grid grid-cols-2 gap-3">
								<div class="flex flex-col gap-1">
									<DaisyUiLabel forText="pageSize"
										>Page Size</DaisyUiLabel
									>
									<DaisyUiSelect
										bind:value={pageSizeInput}
										disabled={viewMode === 'view'}
									>
										{#each PAGE_SIZES as size (size)}
											<option value={size}>{size}</option>
										{/each}
									</DaisyUiSelect>
								</div>
								<div class="flex flex-col gap-1">
									<DaisyUiLabel forText="pageOrientation"
										>Orientation</DaisyUiLabel
									>
									<DaisyUiSelect
										bind:value={pageOrientation}
										disabled={viewMode === 'view'}
									>
										{#each ORIENTATIONS as orient (orient)}
											<option value={orient}>{orient}</option>
										{/each}
									</DaisyUiSelect>
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
										class="heka-number-input d-input-bordered d-input w-full h-9 text-[0.98rem]"
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
										class="heka-number-input d-input-bordered d-input w-full h-9 text-[0.98rem]"
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
										class="heka-number-input d-input-bordered d-input w-full h-9 text-[0.98rem]"
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
										class="heka-number-input d-input-bordered d-input w-full h-9 text-[0.98rem]"
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
										class="heka-number-input d-input-bordered d-input w-full h-9 text-[0.98rem]"
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
										class="heka-number-input d-input-bordered d-input w-full h-9 text-[0.98rem]"
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
										class="heka-number-input d-input-bordered d-input w-full h-9 text-[0.98rem]"
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
										class="heka-number-input d-input-bordered d-input w-full h-9 text-[0.98rem]"
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
											class="d-checkbox d-checkbox-sm"
											bind:checked={showHeader}
											disabled={viewMode === 'view'}
										/>
										Show Header
									</label>
								</div>
								{#if viewMode !== 'view'}
									<button
										type="button"
										class="d-btn d-btn-ghost d-btn-xs"
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
								<TinyMceEditor
									bind:value={headerHtml}
									className="min-h-[150px] p-1"
									disabled={viewMode === 'view'}
									conf={{
										height: 150,
										min_height: 120,
										menubar: true
									}}
								/>
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
											class="d-checkbox d-checkbox-sm"
											bind:checked={showFooter}
											disabled={viewMode === 'view'}
										/>
										Show Footer
									</label>
								</div>
								{#if viewMode !== 'view'}
									<button
										type="button"
										class="d-btn d-btn-ghost d-btn-xs"
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
								<TinyMceEditor
									bind:value={footerHtml}
									className="min-h-[150px] p-1"
									disabled={viewMode === 'view'}
									conf={{
										height: 150,
										min_height: 120,
										menubar: true
									}}
								/>
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
										class="d-btn d-btn-ghost d-btn-xs"
										onclick={() => (showPlaceholderPanel = false)}
									>
										<LucideX className="w-3 h-3" />
									</button>
								</div>
								<p class="mb-3 text-xs text-base-content/70">
									Click to copy, or click "Insert" to add to {activeEditorTarget}
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
															class="d-btn p-1 d-btn-ghost d-btn-xs"
															onclick={() => copyPlaceholder(ph.key)}
															title="Copy"
														>
															<LucideCopy className="w-3 h-3" />
														</button>
														<button
															type="button"
															class="d-btn p-1 d-btn-xs d-btn-primary"
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
					</div>
				</div>

				{#if viewMode !== 'view'}
					<div
						class="mt-6 flex justify-end gap-2 border-t border-base-300 pt-4"
					>
						<DaisyUiButton
							className="d-btn-ghost d-btn-sm"
							onClick={resetForm}
							disabled={saveLock.pending || deleteLock.pending}
						>
							Cancel
						</DaisyUiButton>
						<DaisyUiButton
							className="d-btn-primary d-btn-sm"
							onClick={handleSave}
							loading={saveLock.pending}
							disabled={isLoading}
						>
							{editingId ? 'Update' : 'Create'}
						</DaisyUiButton>
					</div>
				{/if}
			</DaisyUiCardBody>
		</DaisyUiCard>
	{/if}

	<DaisyUiCard>
		<DaisyUiCardBody>
			{#if isLoading && !settingResult}
				<div class="flex justify-center py-8">
					<DaisyUiLoading />
				</div>
			{:else}
				<div class="{TableEnum.HEIGHT} overflow-auto">
					<MariTable
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
							<td class="w-32 shrink-0 text-right">
								<div class="flex justify-end gap-1">
									<DaisyUiButton
										className="d-btn-ghost d-btn-xs"
										onClick={() => startView(typedRow)}
										disabled={deleteLock.pending}
										loadingText=""
									>
										<LucideEye className="w-3 h-3" />
									</DaisyUiButton>
									<DaisyUiButton
										className="d-btn-ghost d-btn-xs d-btn-accent"
										onClick={() => startEdit(typedRow)}
										disabled={deleteLock.pending}
										loadingText=""
									>
										<LucidePencil className="w-3 h-3" />
									</DaisyUiButton>
									<DaisyUiButton
										className="d-btn-ghost d-btn-xs d-btn-error"
										onClick={() => handleDelete(typedRow)}
										loading={deletingId === typedRow.id}
										loadingText=""
										disabled={deleteLock.pending || isLoading}
									>
										<LucideTrash2 className="w-3 h-3" />
									</DaisyUiButton>
								</div>
							</td>
						{/snippet}
					</MariTable>
				</div>
			{/if}
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>

<style>
	/* Native number spinners are small/janky on some browsers; bump their clickable area. */
	.heka-number-input::-webkit-inner-spin-button,
	.heka-number-input::-webkit-outer-spin-button {
		height: 1.25rem;
		opacity: 1;
	}
</style>
