<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { parseUuid } from '$lib/util/id.util';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import LCarePlanDialogContent from '$lib/component/own/local/private/medora/nursing-workbench/care-plan/LCarePlanDialogContent.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { PageActionEnum } from '$lib/model/enum/page-action.enum';
	import { can } from '$lib/state/page-permission.state.svelte';
	import type {
		NursingCarePlanInstanceRow,
		NursingCarePlanTemplateRow
	} from '$lib/model/type/medora/clinical-platform.type';
	import { buildCarePlanPrintHtml } from '$lib/tool/nursing/care-plan-print.util';
	import { buildPrintDocumentHtml } from '$lib/util/print-document-html.util';
	import { printHtmlInIframe } from '$lib/util/document-master-print.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { toastSuccess } from '$lib/util/toast-copy.util';
	import { formatMenziesTableDateTime } from '$lib/util/menzies-table-datetime.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const toastService = new ToastService();

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(
		parseUuid(page.url.searchParams.get('visitId') ?? '') ?? ''
	);
	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/nursing-workbench/care-plan`
			: ''
	);

	let templates = $state<NursingCarePlanTemplateRow[]>([]);
	let instances = $state<NursingCarePlanInstanceRow[]>([]);
	let patient = $state<{
		name: string;
		code: string | null;
		visitNo: string | null;
	} | null>(null);
	let isLoading = $state(false);
	let loadError = $state<string | null>(null);
	let isPrinting = $state(false);

	const canCreate = $derived(can(PageActionEnum.CREATE));
	const canEdit = $derived(can(PageActionEnum.EDIT));
	const canVoid = $derived(can(PageActionEnum.DELETE));
	const canPrint = $derived(can(PageActionEnum.PRINT));

	const draftCount = $derived(
		instances.filter((row) => !row.isSigned).length
	);

	const columns: MenziesTableColumn<NursingCarePlanInstanceRow>[] = [
		{
			id: 'nandaLabel',
			header: msg.care_plan_col_problem(),
			widthClass: 'w-72 min-w-[18rem]',
			format: (_value, row) =>
				row.nandaLabel ?? row.templateTitle ?? '—'
		},
		{
			id: 'contentJson',
			header: msg.care_plan_col_goal(),
			widthClass: 'w-80 min-w-[20rem]',
			format: (_value, row) => {
				const goal = row.contentJson.goal?.trim() ?? '';
				const firstLine = goal.split('\n')[0] ?? '';
				return firstLine.length > 90
					? `${firstLine.slice(0, 90)}…`
					: firstLine || '—';
			}
		},
		{
			id: 'isSigned',
			header: msg.care_plan_col_status(),
			widthClass: 'w-32 min-w-[8rem]',
			cellClassGetter: (row) =>
				(row as NursingCarePlanInstanceRow).isSigned
					? 'text-success font-medium'
					: 'opacity-70',
			format: (_value, row) =>
				row.isSigned
					? msg.care_plan_status_signed()
					: msg.care_plan_status_draft()
		},
		{
			id: 'signedByName',
			header: msg.care_plan_col_signed(),
			widthClass: 'w-56 min-w-[14rem]',
			format: (_value, row) => {
				if (!row.signedAt) return '—';
				const who = row.signedByName ?? '—';
				return `${who} · ${formatMenziesTableDateTime(row.signedAt, '—')}`;
			}
		}
	];

	async function load(opts?: {
		signal?: AbortSignal;
		isCancelled?: () => boolean;
	}): Promise<void> {
		if (!apiBase || !visitId) return;
		isLoading = true;
		loadError = null;
		try {
			const qs = new URLSearchParams({ visitId });
			const [instancesRes, templatesRes, patientRes] =
				await Promise.all([
					fetch(`${apiBase}?${qs}`, { signal: opts?.signal }),
					fetch(`${apiBase}?mode=templates`, {
						signal: opts?.signal
					}),
					fetch(`${apiBase}?mode=patient&${qs}`, {
						signal: opts?.signal
					})
				]);
			if (opts?.isCancelled?.()) return;
			for (const res of [instancesRes, templatesRes, patientRes]) {
				if (!res.ok) {
					loadError = await res.text().catch(() => '');
					return;
				}
			}
			instances =
				(await instancesRes.json()) as NursingCarePlanInstanceRow[];
			templates =
				(await templatesRes.json()) as NursingCarePlanTemplateRow[];
			patient = (await patientRes.json()) as typeof patient;
		} catch (err) {
			if (opts?.isCancelled?.()) return;
			if (err instanceof DOMException && err.name === 'AbortError')
				return;
			loadError = err instanceof Error ? err.message : 'Load failed';
		} finally {
			if (!opts?.isCancelled?.()) isLoading = false;
		}
	}

	$effect(() => {
		const key = visitId;
		if (!apiBase || !key) return;
		let cancelled = false;
		const ac = new AbortController();
		void load({ signal: ac.signal, isCancelled: () => cancelled });
		return () => {
			cancelled = true;
			ac.abort();
		};
	});

	/** A visit switch must not leave the previous patient's plans on screen. */
	$effect(() => {
		void visitId;
		untrack(() => {
			instances = [];
			patient = null;
			loadError = null;
		});
	});

	function templateFor(
		row: NursingCarePlanInstanceRow
	): NursingCarePlanTemplateRow | null {
		return templates.find((tpl) => tpl.id === row.templateId) ?? null;
	}

	async function openDialog(
		row: NursingCarePlanInstanceRow | null,
		revising = false
	) {
		if (!apiBase || !visitId) return;
		const template = row ? templateFor(row) : null;
		if (row && !template) {
			toastService.addToast(
				msg.care_plan_no_templates(),
				StatusColorEnum.WARNING
			);
			return;
		}
		const result = await dialogService.open<{ saved?: boolean }>({
			title: revising
				? msg.care_plan_revise()
				: row
					? msg.care_plan_status_draft()
					: msg.care_plan_add(),
			component: LCarePlanDialogContent,
			fullScreen: false,
			// Height and scrolling belong to the shell; the footer must stay pinned.
			modalClassName: 'max-w-2xl w-[95vw]',
			props: {
				apiBase,
				visitId,
				templates,
				instance: row,
				revising
			}
		});
		if (result.confirmed && result.data?.saved) {
			await load();
		}
	}

	async function confirmRevise(row: NursingCarePlanInstanceRow) {
		const result = await dialogService.open({
			title: msg.care_plan_revise(),
			message: msg.care_plan_revise_confirm(),
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		await openDialog(row, true);
	}

	async function voidPlan(row: NursingCarePlanInstanceRow) {
		const result = await dialogService.open({
			title: msg.care_plan_void(),
			message: msg.care_plan_void_confirm(),
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			const res = await fetch(`${apiBase}?id=${row.id}`, {
				method: 'DELETE'
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toastSuccess(toastService, msg.care_plan_voided());
			await load();
		} catch (err) {
			toastService.addErrorToast(
				msg.care_plan_save_failed(),
				err instanceof Error ? err : undefined
			);
		}
	}

	async function printPlan(row: NursingCarePlanInstanceRow) {
		if (isPrinting || !patient) return;
		isPrinting = true;
		try {
			const html = buildPrintDocumentHtml({
				documentHtml: buildCarePlanPrintHtml({
					patient,
					title:
						row.nandaLabel ??
						row.templateTitle ??
						msg.care_plan_print_title(),
					content: row.contentJson,
					signedAt: row.signedAt,
					signedByName: row.signedByName
				}),
				documentTitle: msg.care_plan_print_title(),
				headerHtml: '',
				footerHtml: '',
				setting: null,
				variant: 'browser'
			});
			await printHtmlInIframe(html, {
				iframeId: 'care-plan-print-iframe'
			});
		} catch (err) {
			toastService.addErrorToast(
				msg.care_plan_save_failed(),
				err instanceof Error ? err : undefined
			);
		} finally {
			isPrinting = false;
		}
	}
</script>

<div class="flex flex-col gap-3 p-4">
	{#if !visitId}
		<p class="text-sm opacity-70">{msg.care_plan_choose_visit()}</p>
	{:else}
		{#if loadError}
			<p class="text-sm text-error" role="alert">{loadError}</p>
		{/if}
		<div class={TableEnum.HEIGHT}>
			<MenziesTable
				title={msg.clinical_care_plan_visit_title()}
				description={patient
					? `${patient.name}${patient.visitNo ? ` · ${patient.visitNo}` : ''}${draftCount ? ` · ${draftCount} draft` : ''}`
					: ''}
				rows={instances}
				{columns}
				{isLoading}
				showRefreshButton={true}
				showRowActions={true}
				actionsHeader={msg.actions()}
				actionsVariant="none"
				emptyMessage={msg.care_plan_empty()}
				on:refresh={() => void load()}
			>
				{#snippet headerActions()}
					<WashButton
						className="btn-primary btn-sm"
						disabled={!canCreate || templates.length === 0}
						onClick={() => void openDialog(null)}
					>
						{msg.care_plan_add()}
					</WashButton>
				{/snippet}
				{#snippet rowActions(row)}
					{@const plan = row as NursingCarePlanInstanceRow}
					<div class="flex items-center gap-1">
						<MenziesTableIconAction
							tooltipText={plan.isSigned
								? msg.menzies_table_tooltip_view()
								: msg.menzies_table_tooltip_edit()}
							color="ghost"
							onClick={() => void openDialog(plan)}
						>
							{#snippet icon()}
								{#if plan.isSigned}
									<LucideEye className="size-3.5" />
								{:else}
									<LucidePencil className="size-3.5" />
								{/if}
							{/snippet}
						</MenziesTableIconAction>
						{#if canPrint}
							<MenziesTableIconAction
								tooltipText={msg.care_plan_print_title()}
								color="ghost"
								disabled={isPrinting}
								onClick={() => void printPlan(plan)}
							>
								{#snippet icon()}
									<LucidePrinter className="size-3.5" />
								{/snippet}
							</MenziesTableIconAction>
						{/if}
						{#if canEdit && plan.isSigned}
							<MenziesTableIconAction
								tooltipText={msg.care_plan_revise()}
								color="secondary"
								onClick={() => void confirmRevise(plan)}
							>
								{#snippet icon()}
									<LucidePencil className="size-3.5" />
								{/snippet}
							</MenziesTableIconAction>
						{/if}
						{#if canVoid && !plan.isSigned}
							<MenziesTableIconAction
								tooltipText={msg.care_plan_void()}
								color="error"
								onClick={() => void voidPlan(plan)}
							>
								{#snippet icon()}
									<LucideTrash2 className="size-3.5" />
								{/snippet}
							</MenziesTableIconAction>
						{/if}
					</div>
				{/snippet}
			</MenziesTable>
		</div>
	{/if}
</div>
