<script lang="ts">
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiTooltip from '$lib/component/library/daisyui/tooltip/DaisyUiTooltip.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiTextarea from '$lib/component/library/daisyui/textarea/DaisyUiTextarea.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import LucideX from '$lib/component/library/lucide/LucideX.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { m } from '$lib/paraglide/messages';
	import type { PaginatedResult } from '$lib/remote/table/pagination-type';
	import {
		getDocumentSettingsPaginated,
		createDocumentSetting,
		updateDocumentSetting,
		deleteDocumentSetting,
		type DocumentSettingWithRelations
	} from '$lib/remote/table/master-table/document-setting.remote';
	import { getDocumentTypes } from '$lib/remote/table/master-table/document-type.remote';
	import type { DocumentTypeSchema } from '$lib/server/db/schema-type';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	let settingResult = $state<PaginatedResult<DocumentSettingWithRelations> | null>(null);
	let documentTypes = $state<DocumentTypeSchema[]>([]);
	let currentPage = $state(1);
	let filterPageSize = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);

	let isEditing = $state(false);
	let editingId = $state<number | null>(null);
	let nameInput = $state('');
	let codeInput = $state('');
	let descriptionInput = $state('');
	let documentTypeIdInput = $state('');

	const settingList = $derived(settingResult?.data ?? []);
	const total = $derived(settingResult?.total ?? 0);

	async function fetchData(opts?: { bustCache?: boolean }) {
		isLoading = true;
		const pageSize = Number(filterPageSize) || 10;
		try {
			settingResult = await getDocumentSettingsPaginated({
				page: currentPage,
				pageSize,
				...(opts?.bustCache && { _t: Date.now() })
			});
		} finally {
			isLoading = false;
		}
	}

	async function fetchDocumentTypes() {
		try {
			documentTypes = await getDocumentTypes();
		} catch (err) {
			console.error('Failed to load document types', err);
		}
	}

	lifeCycleUtil.onMount(() => {
		fetchData();
		fetchDocumentTypes();
	});

	function resetForm() {
		isEditing = false;
		editingId = null;
		nameInput = '';
		codeInput = '';
		descriptionInput = '';
		documentTypeIdInput = '';
	}

	function startEdit(item: DocumentSettingWithRelations) {
		isEditing = true;
		editingId = item.id;
		nameInput = item.name ?? '';
		codeInput = item.code ?? '';
		descriptionInput = item.description ?? '';
		documentTypeIdInput = item.documentTypeId ? String(item.documentTypeId) : '';
	}

	function startCreate() {
		resetForm();
		isEditing = true;
	}

	async function handleSave() {
		if (!nameInput.trim()) {
			toastService.addToast('Name is required', StatusColorEnum.WARNING);
			return;
		}
		try {
			const payload = {
				name: nameInput.trim(),
				code: codeInput.trim() || null,
				description: descriptionInput.trim() || null,
				documentTypeId: documentTypeIdInput ? Number(documentTypeIdInput) : null
			};

			if (editingId) {
				await updateDocumentSetting({
					id: editingId,
					...payload
				});
				toastService.addToast('Document setting updated', StatusColorEnum.SUCCESS);
			} else {
				await createDocumentSetting(payload);
				toastService.addToast('Document setting created', StatusColorEnum.SUCCESS);
			}
			resetForm();
			await fetchData({ bustCache: true });
		} catch (err) {
			console.error(err);
			toastService.addToast('Failed to save document setting', StatusColorEnum.ERROR);
		}
	}

	async function handleDelete(id: number) {
		try {
			const result = await dialogService.open({
				title: 'Delete Document Setting',
				message: 'Are you sure you want to delete this document setting?',
				variant: DialogVariantEnum.CONFIRM
			});
			if (result.confirmed) {
				await deleteDocumentSetting({ id });
				await fetchData({ bustCache: true });
				toastService.addToast('Document setting deleted', StatusColorEnum.SUCCESS);
			}
		} catch (err) {
			console.error(err);
			toastService.addToast('Failed to delete document setting', StatusColorEnum.ERROR);
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

	const columns: MariTableColumn<DocumentSettingWithRelations>[] = [
		{
			id: 'id',
			header: 'ID',
			widthClass: 'w-20 min-w-[5rem]'
		},
		{
			id: 'name',
			header: 'Name',
			widthClass: 'w-48 min-w-[12rem]'
		},
		{
			id: 'code',
			header: 'Code',
			widthClass: 'w-32 min-w-[8rem]'
		},
		{
			id: 'documentType',
			header: 'Document Type',
			widthClass: 'w-40 min-w-[10rem]',
			format: (_value, row) => row.documentType?.name ?? '—'
		},
		{
			id: 'description',
			header: 'Description',
			widthClass: 'w-64 min-w-[16rem]'
		},
		{
			id: 'createdAt',
			header: 'Created At',
			widthClass: 'w-40 min-w-[10rem]',
			format: (value) => formatDateTime(value as any)
		},
		{
			id: 'updatedAt',
			header: 'Updated At',
			widthClass: 'w-40 min-w-[10rem]',
			format: (value) => formatDateTime(value as any)
		}
	];
</script>

<div class="flex flex-col gap-4 p-4">
	<DaisyUiCard className="p-4">
		<h2 class="text-lg font-semibold mb-4">
			{isEditing
				? editingId
					? 'Edit Document Setting'
					: 'Create Document Setting'
				: 'Document Setting'}
		</h2>
		{#if isEditing}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
				<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
					<DaisyUiLabel forText="settingName" className="shrink-0 sm:w-32">Name <span class="text-error">*</span></DaisyUiLabel>
					<div class="flex-1">
						<DaisyUiInputField
							id="settingName"
							bind:value={nameInput}
							inputType="text"
							inputPlaceholderText="Enter setting name"
						/>
					</div>
				</div>
				<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
					<DaisyUiLabel forText="settingCode" className="shrink-0 sm:w-32">Code</DaisyUiLabel>
					<div class="flex-1">
						<DaisyUiInputField
							id="settingCode"
							bind:value={codeInput}
							inputType="text"
							inputPlaceholderText="Enter code"
						/>
					</div>
				</div>
				<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
					<DaisyUiLabel forText="settingDocType" className="shrink-0 sm:w-32">Document Type</DaisyUiLabel>
					<div class="flex-1">
						<DaisyUiSelect
							bind:value={documentTypeIdInput}
							optionHeader="Select document type ..."
						>
							{#each documentTypes as dt (dt.id)}
								<option value={String(dt.id)}>{dt.name}</option>
							{/each}
						</DaisyUiSelect>
					</div>
				</div>
				<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 md:col-span-2">
					<DaisyUiLabel forText="settingDescription" className="shrink-0 sm:w-32">Description</DaisyUiLabel>
					<div class="flex-1">
						<DaisyUiTextarea
							id="settingDescription"
							bind:value={descriptionInput}
							placeholder="Enter description"
						/>
					</div>
				</div>
			</div>
			<div class="flex justify-end gap-2">
				<DaisyUiButton className="d-btn-primary d-btn-sm" onClick={handleSave}>
					{editingId ? 'Update' : 'Create'}
				</DaisyUiButton>
				<DaisyUiButton className="d-btn-ghost d-btn-sm" onClick={resetForm}>
					<LucideX className="size-5" />
					Cancel
				</DaisyUiButton>
			</div>
		{:else}
			<div class="flex justify-end">
				<DaisyUiButton className="d-btn-primary d-btn-sm" onClick={startCreate}>
					<LucidePlus className="size-5" />
					{m.create()}
				</DaisyUiButton>
			</div>
		{/if}
	</DaisyUiCard>

	{#if isLoading && !settingResult}
		<div class="flex items-center justify-center">
			<DaisyUiLoading className="d-loading-xl" />
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
				refreshTooltip={m.refresh_data()}
				emptyMessage="No document settings found"
				showRowActions={true}
				actionsHeader={m.actions()}
				actionsVariant="none"
				enableColumnFilters={false}
				useRemoteFilters={true}
				on:refresh={() => fetchData({ bustCache: true })}
				on:pageSizeChange={() => {
					currentPage = 1;
					fetchData();
				}}
				on:pageChange={() => fetchData()}
			>
			<svelte:fragment slot="rowActions" let:row>
				{@const typedRow = row as DocumentSettingWithRelations}
				<td class="sticky left-0 z-2 w-16 min-w-[4rem] bg-base-100">
					<div class="flex flex-col items-center gap-1">
						<DaisyUiTooltip
							tooltipText={m.edit_data()}
							className="d-tooltip-accent d-tooltip-right"
						>
							<DaisyUiButton
								className="d-btn-sm d-btn-ghost d-btn-accent"
								onClick={() => startEdit(typedRow)}
							>
								<LucidePencil className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
						<DaisyUiTooltip
							tooltipText={m.delete_data()}
							className="d-tooltip-error d-tooltip-right"
						>
							<DaisyUiButton
								className="d-btn-ghost d-btn-sm d-btn-error"
								disabled={isLoading}
								onClick={() => handleDelete(typedRow.id)}
							>
								<LucideTrash2 className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
					</div>
				</td>
			</svelte:fragment>
			</MariTable>
		</div>
	{/if}
</div>
