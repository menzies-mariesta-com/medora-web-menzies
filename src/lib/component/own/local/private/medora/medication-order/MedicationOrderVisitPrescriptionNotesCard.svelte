<script lang="ts">
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import type { CpoePrescriptionNoteListRow } from '$lib/model/type/medora/cpoe-prescription-note.type';
	import { m } from '$lib/paraglide/messages';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';

	let {
		hospitalId,
		visitId,
		apiRoot
	}: {
		hospitalId: string;
		visitId: number;
		apiRoot: string;
	} = $props();

	const dateTimeUtil = new DateTimeUtil();

	let notes = $state<CpoePrescriptionNoteListRow[]>([]);
	let isLoading = $state(false);
	let loadSeq = 0;

	const activeNotes = $derived(
		notes.filter(
			(row) =>
				row.statusId == null || row.statusId === StatusEnum.ACTIVE
		)
	);

	function doctorLabel(row: CpoePrescriptionNoteListRow): string {
		if (!row.doctor) return '';
		return StringUtil.doctorOptionDisplayName(row.doctor);
	}

	async function loadNotes() {
		if (!hospitalId || !visitId) {
			notes = [];
			return;
		}
		const seq = ++loadSeq;
		isLoading = true;
		try {
			const url = new URL(apiRoot, window.location.origin);
			url.searchParams.set('mode', 'prescriptionNote.list');
			url.searchParams.set('visitId', String(visitId));
			const res = await fetch(url.toString(), { credentials: 'include' });
			if (!res.ok) throw new Error(await res.text());
			const rows = (await res.json()) as CpoePrescriptionNoteListRow[];
			if (seq !== loadSeq) return;
			notes = rows;
		} catch {
			if (seq !== loadSeq) return;
			notes = [];
		} finally {
			if (seq === loadSeq) isLoading = false;
		}
	}

	$effect(() => {
		const hid = hospitalId;
		const vid = visitId;
		if (!hid || !vid) {
			notes = [];
			return;
		}
		void loadNotes();
	});
</script>

<WashCard className="flex h-full w-full flex-col">
	<WashCardBody className="flex min-h-0 flex-1 flex-col gap-2 p-4">
		<WashCardBodyTitle className="shrink-0 text-base">
			{m.med_order_int_prescription_notes_title()}
		</WashCardBodyTitle>
		<div
			class="min-h-32 flex-1 overflow-y-auto overscroll-contain pr-1 lg:min-h-0"
			role="region"
			aria-label={m.med_order_int_prescription_notes_title()}
		>
			{#if isLoading}
				<p class="text-sm text-base-content/70">{m.loading()}</p>
			{:else if activeNotes.length === 0}
				<p class="text-sm text-base-content/70">
					{m.med_order_int_prescription_notes_empty()}
				</p>
			{:else}
				<ul class="flex flex-col gap-3">
					{#each activeNotes as row (row.id)}
						<li
							class="rounded-box border border-base-300 bg-base-200/40 p-3"
						>
							<div class="mb-1.5 text-xs text-base-content/60">
								{#if row.sequenceNo != null}
									<span class="font-medium"
										>#{row.sequenceNo}</span
									>
								{/if}
								{#if row.createdAt}
									{#if row.sequenceNo != null}
										<span class="mx-1">·</span>
									{/if}
									{dateTimeUtil.formatDateTime(row.createdAt)}
								{/if}
								{#if doctorLabel(row)}
									<span class="mx-1">·</span>
									{doctorLabel(row)}
								{/if}
							</div>
							<p class="whitespace-pre-wrap text-sm leading-relaxed">
								{row.note}
							</p>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</WashCardBody>
</WashCard>
