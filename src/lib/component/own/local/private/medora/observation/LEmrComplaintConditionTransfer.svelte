<script lang="ts">
	import LucideChevronLeft from '$lib/component/own/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';
	import LucideChevronsLeft from '$lib/component/own/library/lucide/LucideChevronsLeft.svelte';
	import LucideChevronsRight from '$lib/component/own/library/lucide/LucideChevronsRight.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideRefreshCcw from '$lib/component/own/library/lucide/LucideRefreshCcw.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import type { ObservationEmrFormEntryRow } from '$lib/model/type/medora/observation-emr.type';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { m } from '$lib/paraglide/messages';
	import { SvelteSet } from 'svelte/reactivity';

	const msg = m as Record<string, (inputs?: object) => string>;

	type FormEntry = ObservationEmrFormEntryRow;

	let {
		chiefComplaintEntries,
		patientConditionEntries,
		isLoading = false,
		transferring = false,
		readOnly = false,
		onMove,
		onAddComplaint,
		onAddCondition,
		onEdit,
		onDelete,
		onRefresh
	}: {
		chiefComplaintEntries: FormEntry[];
		patientConditionEntries: FormEntry[];
		isLoading?: boolean;
		transferring?: boolean;
		readOnly?: boolean;
		onMove: (
			rows: FormEntry[],
			toFormCode: 'chief_complaint' | 'patient_condition'
		) => void | Promise<void>;
		onAddComplaint: () => void;
		onAddCondition: () => void;
		onEdit: (row: FormEntry) => void;
		onDelete: (row: FormEntry) => void;
		onRefresh: () => void;
	} = $props();

	let selectedComplaintIds = new SvelteSet<number>();
	let selectedConditionIds = new SvelteSet<number>();

	const busy = $derived(isLoading || transferring || readOnly);

	function toggleComplaint(id: number) {
		if (busy) return;
		if (selectedComplaintIds.has(id)) selectedComplaintIds.delete(id);
		else selectedComplaintIds.add(id);
	}

	function toggleCondition(id: number) {
		if (busy) return;
		if (selectedConditionIds.has(id)) selectedConditionIds.delete(id);
		else selectedConditionIds.add(id);
	}

	function formatWhen(value: string | null | undefined): string {
		if (!value) return '';
		try {
			return new Date(value).toLocaleString(undefined, {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return '';
		}
	}

	function statusLabel(statusId: number | null | undefined): string {
		if (statusId === StatusEnum.ACTIVE) return msg.observation_emr_status_active();
		if (statusId === StatusEnum.INACTIVE) return msg.observation_emr_status_inactive();
		return '';
	}

	async function moveSelectedToCondition() {
		const rows = chiefComplaintEntries.filter((r) =>
			selectedComplaintIds.has(r.id)
		);
		if (rows.length === 0) return;
		await onMove(rows, 'patient_condition');
		selectedComplaintIds.clear();
	}

	async function moveSelectedToComplaint() {
		const rows = patientConditionEntries.filter((r) =>
			selectedConditionIds.has(r.id)
		);
		if (rows.length === 0) return;
		await onMove(rows, 'chief_complaint');
		selectedConditionIds.clear();
	}

	async function moveAllToCondition() {
		if (chiefComplaintEntries.length === 0) return;
		await onMove(chiefComplaintEntries, 'patient_condition');
		selectedComplaintIds.clear();
	}

	async function moveAllToComplaint() {
		if (patientConditionEntries.length === 0) return;
		await onMove(patientConditionEntries, 'chief_complaint');
		selectedConditionIds.clear();
	}

</script>

<div class="space-y-3">
	<div
		class="flex flex-wrap items-center justify-between gap-2 border-b border-ink-border/70 pb-2"
	>
		<span class="text-sm font-semibold text-base-content">
			{m.observation_emr_chief_complaint()}
			<span class="text-ink-muted font-normal">/</span>
			{m.observation_emr_patient_condition()}
		</span>
		<div class="flex items-center gap-1">
			<div
				class="tooltip tooltip-left tooltip-secondary"
				data-tip={msg.observation_emr_refresh()}
			>
				<button
					type="button"
					class="btn btn-ghost btn-square btn-xs btn-secondary cursor-pointer"
					aria-label={msg.observation_emr_refresh()}
					disabled={isLoading || transferring}
					class:cursor-not-allowed={isLoading || transferring}
					class:btn-disabled={isLoading || transferring}
					class:loading={isLoading || transferring}
					onclick={() => onRefresh()}
				>
					<LucideRefreshCcw className="size-3.5" />
				</button>
			</div>
		</div>
	</div>

	<div
		class="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center"
	>
		<!-- Left: Chief complaint -->
		<div
			class="flex min-h-64 flex-1 flex-col overflow-hidden rounded-box border border-ink-border bg-base-100/80"
			class:opacity-60={busy && !transferring}
		>
			<div
				class="flex items-center justify-between gap-2 border-b border-ink-border/70 px-3 py-2"
			>
				<span class="text-sm font-semibold"
					>{m.observation_emr_chief_complaint()}</span
				>
				<div class="flex items-center gap-1">
					<span class="badge badge-ghost badge-sm tabular-nums">
						{chiefComplaintEntries.length}
					</span>
					{#if !readOnly}
						<div
							class="tooltip tooltip-left tooltip-primary"
							data-tip={msg.observation_emr_add()}
						>
							<button
								type="button"
								class="btn btn-ghost btn-square btn-xs btn-primary cursor-pointer"
								aria-label={msg.observation_emr_add()}
								disabled={busy}
								class:cursor-not-allowed={busy}
								class:btn-disabled={busy}
								onclick={() => onAddComplaint()}
							>
								<LucidePlus className="size-3.5" />
							</button>
						</div>
					{/if}
				</div>
			</div>
			<ul
				class="menu menu-sm flex-1 overflow-y-auto p-2"
				role="listbox"
				aria-label={m.observation_emr_chief_complaint()}
				aria-multiselectable="true"
			>
				{#if isLoading}
					<li class="disabled">
						<span class="text-ink-muted justify-center">{m.loading()}</span>
					</li>
				{:else if chiefComplaintEntries.length === 0}
					<li class="disabled">
						<span class="text-ink-muted justify-center">
							{msg.observation_emr_chief_complaint_empty()}
						</span>
					</li>
				{:else}
					{#each chiefComplaintEntries as row (row.id)}
						{@const selected = selectedComplaintIds.has(row.id)}
						<li>
							<div
								class="flex w-full items-start gap-1 rounded-lg p-0 {selected
									? 'bg-primary/15'
									: ''}"
							>
								<button
									type="button"
									role="option"
									aria-selected={selected}
									disabled={busy}
									class="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-0.5 rounded-lg px-2 py-2 text-start"
									class:active={selected}
									class:cursor-not-allowed={busy}
									onclick={() => toggleComplaint(row.id)}
								>
									<span class="break-words font-medium">
										{row.description?.trim() || '–'}
									</span>
									<span
										class="text-ink-muted block text-xs font-normal"
									>
										{#if statusLabel(row.statusId)}
											{statusLabel(row.statusId)}
										{/if}
										{#if formatWhen(row.createdAt)}
											{#if statusLabel(row.statusId)} · {/if}
											{formatWhen(row.createdAt)}
										{/if}
									</span>
								</button>
								{#if !readOnly}
									<div
										class="flex shrink-0 flex-col gap-0.5 py-1 pr-1"
										role="group"
										aria-label={msg.observation_emr_row_actions()}
									>
										<div
											class="tooltip tooltip-left tooltip-accent"
											data-tip={m.menzies_table_tooltip_edit()}
										>
											<button
												type="button"
												class="btn btn-ghost btn-square btn-xs btn-accent cursor-pointer"
												aria-label={m.menzies_table_tooltip_edit()}
												disabled={busy}
												class:cursor-not-allowed={busy}
												onclick={() => onEdit(row)}
											>
												<LucidePencil className="size-3.5" />
											</button>
										</div>
										<div
											class="tooltip tooltip-left tooltip-error"
											data-tip={m.menzies_table_crud_inactivate_tooltip()}
										>
											<button
												type="button"
												class="btn btn-ghost btn-square btn-xs btn-error cursor-pointer"
												aria-label={m.menzies_table_crud_inactivate_tooltip()}
												disabled={busy}
												class:cursor-not-allowed={busy}
												onclick={() => onDelete(row)}
											>
												<LucideTrash2 className="size-3.5" />
											</button>
										</div>
									</div>
								{/if}
							</div>
						</li>
					{/each}
				{/if}
			</ul>
		</div>

		<!-- Center transfer controls -->
		<div
			class="flex flex-row flex-wrap items-center justify-center gap-2 lg:flex-col lg:px-2"
		>
			<div
				class="tooltip tooltip-right tooltip-primary"
				data-tip={msg.observation_emr_transfer_move_all_to_condition()}
			>
				<button
					type="button"
					class="btn btn-square btn-sm btn-primary"
					class:cursor-pointer={!busy &&
						chiefComplaintEntries.length > 0}
					class:cursor-not-allowed={busy ||
						chiefComplaintEntries.length === 0}
					class:btn-disabled={busy ||
						chiefComplaintEntries.length === 0}
					class:loading={transferring}
					disabled={busy || chiefComplaintEntries.length === 0}
					aria-label={msg.observation_emr_transfer_move_all_to_condition()}
					aria-busy={transferring}
					onclick={() => void moveAllToCondition()}
				>
					<LucideChevronsRight className="size-4" />
				</button>
			</div>
			<div
				class="tooltip tooltip-right tooltip-accent"
				data-tip={msg.observation_emr_transfer_add_to_condition()}
			>
				<button
					type="button"
					class="btn btn-square btn-sm btn-accent"
					class:cursor-pointer={!busy && selectedComplaintIds.size > 0}
					class:cursor-not-allowed={busy ||
						selectedComplaintIds.size === 0}
					class:btn-disabled={busy || selectedComplaintIds.size === 0}
					class:loading={transferring}
					disabled={busy || selectedComplaintIds.size === 0}
					aria-label={msg.observation_emr_transfer_add_to_condition()}
					aria-busy={transferring}
					onclick={() => void moveSelectedToCondition()}
				>
					<LucideChevronRight className="size-4" />
				</button>
			</div>
			<div
				class="tooltip tooltip-right tooltip-secondary"
				data-tip={msg.observation_emr_transfer_return_to_complaint()}
			>
				<button
					type="button"
					class="btn btn-square btn-sm btn-secondary"
					class:cursor-pointer={!busy && selectedConditionIds.size > 0}
					class:cursor-not-allowed={busy ||
						selectedConditionIds.size === 0}
					class:btn-disabled={busy || selectedConditionIds.size === 0}
					class:loading={transferring}
					disabled={busy || selectedConditionIds.size === 0}
					aria-label={msg.observation_emr_transfer_return_to_complaint()}
					aria-busy={transferring}
					onclick={() => void moveSelectedToComplaint()}
				>
					<LucideChevronLeft className="size-4" />
				</button>
			</div>
			<div
				class="tooltip tooltip-right tooltip-neutral"
				data-tip={msg.observation_emr_transfer_move_all_to_complaint()}
			>
				<button
					type="button"
					class="btn btn-square btn-sm btn-neutral"
					class:cursor-pointer={!busy &&
						patientConditionEntries.length > 0}
					class:cursor-not-allowed={busy ||
						patientConditionEntries.length === 0}
					class:btn-disabled={busy ||
						patientConditionEntries.length === 0}
					class:loading={transferring}
					disabled={busy || patientConditionEntries.length === 0}
					aria-label={msg.observation_emr_transfer_move_all_to_complaint()}
					aria-busy={transferring}
					onclick={() => void moveAllToComplaint()}
				>
					<LucideChevronsLeft className="size-4" />
				</button>
			</div>
		</div>

		<!-- Right: Patient condition -->
		<div
			class="flex min-h-64 flex-1 flex-col overflow-hidden rounded-box border border-ink-border bg-base-100/80"
			class:opacity-60={busy && !transferring}
		>
			<div
				class="flex items-center justify-between gap-2 border-b border-ink-border/70 px-3 py-2"
			>
				<span class="text-sm font-semibold"
					>{m.observation_emr_patient_condition()}</span
				>
				<div class="flex items-center gap-1">
					<span class="badge badge-ghost badge-sm tabular-nums">
						{patientConditionEntries.length}
					</span>
					{#if !readOnly}
						<div
							class="tooltip tooltip-left tooltip-primary"
							data-tip={msg.observation_emr_add()}
						>
							<button
								type="button"
								class="btn btn-ghost btn-square btn-xs btn-primary cursor-pointer"
								aria-label={msg.observation_emr_add()}
								disabled={busy}
								class:cursor-not-allowed={busy}
								class:btn-disabled={busy}
								onclick={() => onAddCondition()}
							>
								<LucidePlus className="size-3.5" />
							</button>
						</div>
					{/if}
				</div>
			</div>
			<ul
				class="menu menu-sm flex-1 overflow-y-auto p-2"
				role="listbox"
				aria-label={m.observation_emr_patient_condition()}
				aria-multiselectable="true"
			>
				{#if isLoading}
					<li class="disabled">
						<span class="text-ink-muted justify-center">{m.loading()}</span>
					</li>
				{:else if patientConditionEntries.length === 0}
					<li class="disabled">
						<span class="text-ink-muted justify-center">
							{msg.observation_emr_patient_condition_empty()}
						</span>
					</li>
				{:else}
					{#each patientConditionEntries as row (row.id)}
						{@const selected = selectedConditionIds.has(row.id)}
						<li>
							<div
								class="flex w-full items-start gap-1 rounded-lg p-0 {selected
									? 'bg-primary/15'
									: ''}"
							>
								<button
									type="button"
									role="option"
									aria-selected={selected}
									disabled={busy}
									class="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-0.5 rounded-lg px-2 py-2 text-start"
									class:active={selected}
									class:cursor-not-allowed={busy}
									onclick={() => toggleCondition(row.id)}
								>
									<span class="break-words font-medium">
										{row.description?.trim() || '–'}
									</span>
									<span
										class="text-ink-muted block text-xs font-normal"
									>
										{#if row.visit?.visitNo}
											{row.visit.visitNo}
										{/if}
										{#if statusLabel(row.statusId)}
											{#if row.visit?.visitNo} · {/if}
											{statusLabel(row.statusId)}
										{/if}
										{#if formatWhen(row.createdAt)}
											{#if row.visit?.visitNo ||
												statusLabel(row.statusId)} · {/if}
											{formatWhen(row.createdAt)}
										{/if}
									</span>
								</button>
								{#if !readOnly}
									<div
										class="flex shrink-0 flex-col gap-0.5 py-1 pr-1"
										role="group"
										aria-label={msg.observation_emr_row_actions()}
									>
										<div
											class="tooltip tooltip-left tooltip-accent"
											data-tip={m.menzies_table_tooltip_edit()}
										>
											<button
												type="button"
												class="btn btn-ghost btn-square btn-xs btn-accent cursor-pointer"
												aria-label={m.menzies_table_tooltip_edit()}
												disabled={busy}
												class:cursor-not-allowed={busy}
												onclick={() => onEdit(row)}
											>
												<LucidePencil className="size-3.5" />
											</button>
										</div>
										<div
											class="tooltip tooltip-left tooltip-error"
											data-tip={m.menzies_table_crud_inactivate_tooltip()}
										>
											<button
												type="button"
												class="btn btn-ghost btn-square btn-xs btn-error cursor-pointer"
												aria-label={m.menzies_table_crud_inactivate_tooltip()}
												disabled={busy}
												class:cursor-not-allowed={busy}
												onclick={() => onDelete(row)}
											>
												<LucideTrash2 className="size-3.5" />
											</button>
										</div>
									</div>
								{/if}
							</div>
						</li>
					{/each}
				{/if}
			</ul>
		</div>
	</div>
</div>
