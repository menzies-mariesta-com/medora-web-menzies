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
	import LucideMoveUp from '$lib/component/own/library/lucide/LucideMoveUp.svelte';
	import LucideMoveDown from '$lib/component/own/library/lucide/LucideMoveDown.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCardBodyAction from '$lib/component/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import {
		PREFIX_PURPOSES,
		type PrefixPurposeDefinition
	} from '$lib/model/const/prefix-purpose.const';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { PrefixFieldPath } from '$lib/model/type/heka/prefix-format.type';
	import type { PrefixFormatListRow } from '$lib/model/type/heka/ui-rows.type';
	import { YesNoEnum } from '$lib/model/enum/db-link';
	import {
		defaultFormatPartsForStorageKey,
		fieldPathsForEdit,
		formatSpecToUi,
		newPartId,
		previewExample,
		uiToFormatSpec,
		type UiFormatPart
	} from '$lib/tool/prefix/prefix-format-ui.util';
	import { defaultCounterScopeForStorageKey } from '$lib/tool/prefix/prefix-counter-scope.util';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
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

	function prefixConfigurationApiUrl() {
		return `/api/heka/hospital/${hospitalId}/home/administration/prefix-configuration`;
	}

	type PurposeListRow = {
		purpose: PrefixPurposeDefinition;
		config: PrefixFormatListRow | null;
	};

	let items = $state<PrefixFormatListRow[]>([]);
	let isLoading = $state(false);
	let viewMode = $state<'list' | 'edit'>('list');
	let editingId = $state<number | null>(null);
	let editingPurpose = $state<PrefixPurposeDefinition | null>(null);

	let descriptionInput = $state('');
	let counterIncludeBranch = $state(false);
	let counterIncludeFinancialYear = $state(true);
	let counterIncludeVisitType = $state(false);
	let counterIncludeVisit = $state(false);
	let formatParts = $state<UiFormatPart[]>(
		defaultFormatPartsForStorageKey('PATIENT_CODE')
	);

	const formatPreview = $derived(previewExample(formatParts));

	function findActiveConfigForKey(
		storageKey: string
	): PrefixFormatListRow | null {
		return (
			items.find(
				(r) => r.key === storageKey && r.deletedAt == null
			) ?? null
		);
	}

	const fieldPathOptions = $derived(
		editingPurpose
			? fieldPathsForEdit(editingPurpose.storageKey, formatParts)
			: ([] as PrefixFieldPath[])
	);

	const purposeListRows = $derived.by((): PurposeListRow[] => {
		return PREFIX_PURPOSES.map((purpose) => ({
			purpose,
			config: findActiveConfigForKey(purpose.storageKey)
		}));
	});

	function purposeLabel(p: PrefixPurposeDefinition): string {
		if (p.id === 'patient')
			return m.prefix_configuration_purpose_patient();
		if (p.id === 'visit')
			return m.prefix_configuration_purpose_visit();
		if (p.id === 'pr') return m.prefix_configuration_purpose_pr();
		if (p.id === 'po') return m.prefix_configuration_purpose_po();
		if (p.id === 'di') return m.prefix_configuration_purpose_di();
		if (p.id === 'di_issue')
			return m.prefix_configuration_purpose_di_issue();
		if (p.id === 'dc') return m.prefix_configuration_purpose_dc();
		if (p.id === 'med_order_batch')
			return m.prefix_configuration_purpose_med_order_batch();
		return m.prefix_configuration_purpose_order();
	}

	function purposeHelp(p: PrefixPurposeDefinition): string {
		if (p.id === 'patient') {
			return m.prefix_configuration_purpose_patient_help();
		}
		if (p.id === 'visit') {
			return m.prefix_configuration_purpose_visit_help();
		}
		if (p.id === 'pr') {
			return m.prefix_configuration_purpose_pr_help();
		}
		if (p.id === 'po') {
			return m.prefix_configuration_purpose_po_help();
		}
		if (p.id === 'di') {
			return m.prefix_configuration_purpose_di_help();
		}
		if (p.id === 'di_issue') {
			return m.prefix_configuration_purpose_di_issue_help();
		}
		if (p.id === 'dc') {
			return m.prefix_configuration_purpose_dc_help();
		}
		if (p.id === 'med_order_batch') {
			return m.prefix_configuration_purpose_med_order_batch_help();
		}
		return m.prefix_configuration_purpose_order_help();
	}

	function editTitle(p: PrefixPurposeDefinition): string {
		if (p.id === 'patient')
			return m.prefix_configuration_edit_patient_title();
		if (p.id === 'visit')
			return m.prefix_configuration_edit_visit_title();
		if (p.id === 'pr') return m.prefix_configuration_edit_pr_title();
		if (p.id === 'po') return m.prefix_configuration_edit_po_title();
		if (p.id === 'di') return m.prefix_configuration_edit_di_title();
		if (p.id === 'di_issue')
			return m.prefix_configuration_edit_di_issue_title();
		if (p.id === 'dc') return m.prefix_configuration_edit_dc_title();
		if (p.id === 'med_order_batch')
			return m.prefix_configuration_edit_med_order_batch_title();
		return m.prefix_configuration_edit_order_title();
	}

	function fieldPathLabel(path: PrefixFieldPath): string {
		switch (path) {
			case 'financial_year.code':
				return m.prefix_configuration_field_financial_year();
			case 'hospital.code':
				return m.prefix_configuration_field_hospital();
			case 'branch.code':
				return m.prefix_configuration_field_branch();
			case 'visit_type.code':
				return m.prefix_configuration_field_visit_type();
			case 'order_date.year_2digit':
				return m.prefix_configuration_field_order_date_yy();
			case 'visit.order_key':
				return m.prefix_configuration_field_visit_order_key();
		}
	}

	function setPartKind(index: number, kind: UiFormatPart['kind']) {
		const id = formatParts[index].id;
		if (kind === 'literal') {
			formatParts[index] = { id, kind: 'literal', value: '' };
		} else if (kind === 'field') {
			formatParts[index] = {
				id,
				kind: 'field',
				path: 'hospital.code'
			};
		} else {
			formatParts[index] = { id, kind: 'sequence', padStart: 6 };
		}
	}

	function movePart(index: number, delta: -1 | 1) {
		const j = index + delta;
		if (j < 0 || j >= formatParts.length) return;
		const next = [...formatParts];
		[next[index], next[j]] = [next[j], next[index]];
		formatParts = next;
	}

	function removePart(index: number) {
		formatParts = formatParts.filter((_, i) => i !== index);
	}

	function addFormatPart() {
		formatParts = [
			...formatParts,
			{ id: newPartId(), kind: 'field', path: 'hospital.code' }
		];
	}

	function setFieldPath(index: number, path: PrefixFieldPath) {
		formatParts = formatParts.map((p, j) =>
			j === index && p.kind === 'field' ? { ...p, path } : p
		);
	}

	function setSequencePad(index: number, raw: string) {
		const v = parseInt(raw, 10);
		const padStart = Number.isNaN(v)
			? 0
			: Math.max(0, Math.min(24, v));
		formatParts = formatParts.map((p, j) =>
			j === index && p.kind === 'sequence' ? { ...p, padStart } : p
		);
	}

	const saveLock = createActionLock();

	async function fetchData() {
		if (!hospitalId) return;
		isLoading = true;
		try {
			items = await apiFetch<PrefixFormatListRow[]>(
				prefixConfigurationApiUrl()
			);
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
		editingPurpose = null;
		descriptionInput = '';
		formatParts = defaultFormatPartsForStorageKey('PATIENT_CODE');
	}

	function startEdit(purpose: PrefixPurposeDefinition) {
		viewMode = 'edit';
		editingPurpose = purpose;
		const row = findActiveConfigForKey(purpose.storageKey);
		editingId = row?.id ?? null;
		descriptionInput = row?.description ?? '';
		const scopeDefaults = defaultCounterScopeForStorageKey(
			purpose.storageKey
		);
		if (row) {
			counterIncludeBranch =
				row.counterIncludeBranch === YesNoEnum.YES ||
				(row.counterIncludeBranch == null &&
					scopeDefaults.includeBranch);
			counterIncludeFinancialYear =
				row.counterIncludeFinancialYear === YesNoEnum.YES ||
				(row.counterIncludeFinancialYear == null &&
					scopeDefaults.includeFinancialYear);
			counterIncludeVisitType =
				row.counterIncludeVisitType === YesNoEnum.YES ||
				(row.counterIncludeVisitType == null &&
					scopeDefaults.includeVisitType);
			counterIncludeVisit =
				row.counterIncludeVisit === YesNoEnum.YES ||
				(row.counterIncludeVisit == null &&
					scopeDefaults.includeVisit);
		} else {
			counterIncludeBranch = scopeDefaults.includeBranch;
			counterIncludeFinancialYear =
				scopeDefaults.includeFinancialYear;
			counterIncludeVisitType = scopeDefaults.includeVisitType;
			counterIncludeVisit = scopeDefaults.includeVisit;
		}
		const parsed = row
			? formatSpecToUi(row.format ?? {})
			: { ok: false as const };
		if (parsed.ok) {
			formatParts = parsed.parts;
		} else {
			formatParts = defaultFormatPartsForStorageKey(
				purpose.storageKey
			);
			if (row) {
				toastService.addToast(
					m.prefix_configuration_format_load_failed(),
					StatusColorEnum.WARNING
				);
			}
		}
	}

	async function handleSave() {
		const purpose = editingPurpose;
		if (!purpose) return;
		const parsedFormat = uiToFormatSpec(formatParts);
		if (parsedFormat == null) {
			toastService.addToast(
				m.prefix_configuration_format_empty(),
				StatusColorEnum.WARNING
			);
			return;
		}

		await saveLock.run(async () => {
			if (!hospitalId) {
				toastService.addToast(
					m.prefix_configuration_key_required_context(),
					StatusColorEnum.WARNING
				);
				return;
			}
			const payload = {
				key: purpose.storageKey,
				description: descriptionInput.trim() || null,
				format: parsedFormat,
				counterIncludeBranch: counterIncludeBranch
					? YesNoEnum.YES
					: YesNoEnum.NO,
				counterIncludeFinancialYear: counterIncludeFinancialYear
					? YesNoEnum.YES
					: YesNoEnum.NO,
				counterIncludeVisitType: counterIncludeVisitType
					? YesNoEnum.YES
					: YesNoEnum.NO,
				counterIncludeVisit: counterIncludeVisit
					? YesNoEnum.YES
					: YesNoEnum.NO
			};
			if (editingId != null) {
				await apiFetch(prefixConfigurationApiUrl(), {
					method: 'PUT',
					body: JSON.stringify({ id: editingId, ...payload })
				});
				toastService.addToast(
					m.prefix_configuration_updated(),
					StatusColorEnum.SUCCESS
				);
			} else {
				await apiFetch(prefixConfigurationApiUrl(), {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				toastService.addToast(
					m.prefix_configuration_created(),
					StatusColorEnum.SUCCESS
				);
			}
			resetForm();
			fetchData();
		});
	}

	const columns: MariTableColumn<PurposeListRow>[] = [
		{
			id: 'purpose',
			header: m.prefix_configuration_column_purpose(),
			field: 'purpose',
			format: (_v, row) => purposeLabel(row.purpose)
		},
		{
			id: 'description',
			header: m.prefix_configuration_description_label(),
			field: 'description',
			format: (_v, row) => row.config?.description ?? ''
		},
		{
			id: 'status',
			header: m.prefix_configuration_column_status(),
			field: 'config',
			format: (_v, row) =>
				row.config
					? m.prefix_configuration_status_configured()
					: m.prefix_configuration_status_not_configured()
		}
	];
</script>

{#if viewMode === 'list'}
	<div class="mb-4 flex items-center justify-between">
		<div>
			<h1 class="text-lg font-semibold">
				{m.prefix_configuration_page_title()}
			</h1>
			<p class="text-sm text-base-content/70">
				{m.prefix_configuration_page_subtitle()}
			</p>
		</div>
	</div>

	<div class={TableEnum.HEIGHT}>
		<MariTable
			{columns}
			rows={purposeListRows}
			{isLoading}
			showRowActions={true}
			actionsVariant="none"
		>
			{#snippet rowActions(row)}
				<div class="flex items-center gap-2">
					<DaisyUiButton
						className="d-btn-ghost d-btn-sm"
						onClick={() => startEdit(row.purpose)}
					>
						<LucidePencil className="size-4" />
					</DaisyUiButton>
				</div>
			{/snippet}
		</MariTable>
	</div>
{:else if editingPurpose}
	<DaisyUiCard>
		<DaisyUiCardBody>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSave();
				}}
			>
				<fieldset class="m-0 min-w-0 border-0 p-0">
					<DaisyUiCardBodyTitle className="mb-3">
						{editTitle(editingPurpose)}
					</DaisyUiCardBodyTitle>
				</fieldset>
				<div
					class="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6"
				>
					<fieldset class="m-0 min-w-0 flex-1 border-0 p-0">
						<div
							class="grid min-w-0 grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2 xl:grid-cols-3"
						>
							<div class="col-span-full flex flex-col gap-3">
								<div
									class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
								>
									<DaisyUiLabel className="shrink-0 sm:w-36"
										>{m.prefix_configuration_internal_key_label()}</DaisyUiLabel
									>
									<code
										class="rounded bg-base-200 px-2 py-1.5 font-mono text-sm"
										>{editingPurpose.storageKey}</code
									>
								</div>
								<p class="text-xs leading-snug text-base-content/60">
									{purposeHelp(editingPurpose)}
								</p>
								<div
									class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
								>
									<DaisyUiLabel className="shrink-0 sm:w-36"
										>{m.prefix_configuration_description_label()}</DaisyUiLabel
									>
									<div class="max-w-80 flex-1">
										<DaisyUiInputField
											bind:value={descriptionInput}
											inputType="text"
											inputPlaceholderText={m.prefix_configuration_description_placeholder()}
										/>
									</div>
								</div>
								<div
									class="rounded-md border border-base-200 bg-base-200/20 px-3 py-2"
								>
									<DaisyUiLabel className="text-sm font-medium"
										>{m.prefix_configuration_counter_scope_title()}</DaisyUiLabel
									>
									<p
										class="mt-1 mb-2 text-xs leading-snug text-base-content/60"
									>
										{m.prefix_configuration_counter_scope_help()}
									</p>
									<div
										class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
									>
										<label
											class="d-label cursor-pointer justify-start gap-2 py-0"
										>
											<input
												type="checkbox"
												class="d-checkbox d-checkbox-sm"
												bind:checked={counterIncludeBranch}
											/>
											<span class="text-sm"
												>{m.prefix_configuration_counter_scope_branch()}</span
											>
										</label>
										<label
											class="d-label cursor-pointer justify-start gap-2 py-0"
										>
											<input
												type="checkbox"
												class="d-checkbox d-checkbox-sm"
												bind:checked={counterIncludeFinancialYear}
											/>
											<span class="text-sm"
												>{m.prefix_configuration_counter_scope_financial_year()}</span
											>
										</label>
										<label
											class="d-label cursor-pointer justify-start gap-2 py-0"
										>
											<input
												type="checkbox"
												class="d-checkbox d-checkbox-sm"
												bind:checked={counterIncludeVisitType}
											/>
											<span class="text-sm"
												>{m.prefix_configuration_counter_scope_visit_type()}</span
											>
										</label>
										<label
											class="d-label cursor-pointer justify-start gap-2 py-0"
										>
											<input
												type="checkbox"
												class="d-checkbox d-checkbox-sm"
												bind:checked={counterIncludeVisit}
											/>
											<span class="text-sm"
												>{m.prefix_configuration_counter_scope_visit()}</span
											>
										</label>
									</div>
								</div>
							</div>
							<div class="col-span-full flex min-w-0 flex-col gap-2">
								<div
									class="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2"
								>
									<DaisyUiLabel
										className="text-sm font-medium leading-tight"
										>{m.prefix_configuration_format_title()}</DaisyUiLabel
									>
									<p
										class="text-xs leading-snug text-base-content/60"
									>
										{m.prefix_configuration_format_help()}
									</p>
								</div>

								<p
									class="inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 gap-y-0.5 rounded border border-base-200 bg-base-200/30 px-2 py-1 text-xs"
								>
									<span class="shrink-0 text-base-content/60"
										>{m.prefix_configuration_format_preview()}:</span
									>
									<code
										class="font-mono text-[0.7rem] leading-tight break-all text-base-content"
										>{formatPreview || '—'}</code
									>
								</p>

								<ul
									class="divide-y divide-base-200 rounded-md border border-base-200 bg-base-100"
								>
									{#each formatParts as part, i (part.id)}
										<li
											class="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-2 py-1.5 sm:gap-x-2"
										>
											<span
												class="w-5 shrink-0 text-right text-[0.65rem] text-base-content/45 tabular-nums"
												>{i + 1}</span
											>
											<select
												class="d-select-bordered d-select h-7 min-h-7 max-w-[7.5rem] shrink-0 d-select-xs py-0 text-xs"
												value={part.kind}
												onchange={(e) => {
													const k = e.currentTarget
														.value as UiFormatPart['kind'];
													setPartKind(i, k);
												}}
											>
												<option value="literal"
													>{m.prefix_configuration_part_type_literal()}</option
												>
												<option value="field"
													>{m.prefix_configuration_part_type_field()}</option
												>
												<option value="sequence"
													>{m.prefix_configuration_part_type_sequence()}</option
												>
											</select>

											<div
												class="min-w-0 flex-1 basis-[12rem] sm:basis-0"
											>
												{#if part.kind === 'literal'}
													<DaisyUiInputField
														className="d-input-xs h-7 min-h-7 w-full py-0 text-xs"
														bind:value={part.value}
														inputType="text"
														minLength={0}
														maxlength={80}
														inputPlaceholderText={m.prefix_configuration_literal_placeholder()}
													/>
												{:else if part.kind === 'field'}
													<select
														class="d-select-bordered d-select h-7 min-h-7 w-full d-select-xs py-0 text-xs"
														value={part.path}
														onchange={(e) =>
															setFieldPath(
																i,
																e.currentTarget
																	.value as PrefixFieldPath
															)}
													>
														{#each fieldPathOptions as fp (fp)}
															<option value={fp}
																>{fieldPathLabel(fp)}</option
															>
														{/each}
													</select>
												{:else}
													<div
														class="flex flex-wrap items-center gap-x-2 gap-y-0.5"
													>
														<span
															class="text-[0.65rem] whitespace-nowrap text-base-content/60"
															>{m.prefix_configuration_sequence_width()}</span
														>
														<input
															type="number"
															min="0"
															max="24"
															title={m.prefix_configuration_sequence_width_help()}
															class="d-input-bordered d-input d-input-xs h-7 w-14 py-0 text-center text-xs tabular-nums"
															value={part.padStart}
															oninput={(e) =>
																setSequencePad(
																	i,
																	e.currentTarget.value
																)}
														/>
													</div>
												{/if}
											</div>

											<div
												class="ml-auto flex shrink-0 items-center gap-0.5"
											>
												<button
													type="button"
													class="d-btn h-7 min-h-7 px-1.5 d-btn-ghost d-btn-xs"
													title={m.prefix_configuration_move_up()}
													disabled={i === 0}
													onclick={() => movePart(i, -1)}
												>
													<LucideMoveUp className="size-3.5" />
												</button>
												<button
													type="button"
													class="d-btn h-7 min-h-7 px-1.5 d-btn-ghost d-btn-xs"
													title={m.prefix_configuration_move_down()}
													disabled={i === formatParts.length - 1}
													onclick={() => movePart(i, 1)}
												>
													<LucideMoveDown className="size-3.5" />
												</button>
												<button
													type="button"
													class="d-btn h-7 min-h-7 px-1.5 d-btn-ghost d-btn-xs d-btn-error"
													title={m.prefix_configuration_remove_part()}
													disabled={formatParts.length <= 1}
													onclick={() => removePart(i)}
												>
													<LucideTrash2 className="size-3.5" />
												</button>
											</div>
										</li>
									{/each}
								</ul>

								<DaisyUiButton
									type="button"
									className="d-btn-outline d-btn-xs h-8 min-h-8 w-fit gap-1 px-2"
									onClick={addFormatPart}
								>
									<LucidePlus className="size-3.5" />
									{m.prefix_configuration_add_part()}
								</DaisyUiButton>
							</div>
						</div>
					</fieldset>
				</div>

				<DaisyUiCardBodyAction className="mt-4 flex flex-wrap gap-2">
					<DaisyUiButton
						type="submit"
						className="d-btn-wide {editingId != null
							? 'd-btn-accent'
							: 'd-btn-primary'}"
					>
						{m.prefix_configuration_save()}
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
