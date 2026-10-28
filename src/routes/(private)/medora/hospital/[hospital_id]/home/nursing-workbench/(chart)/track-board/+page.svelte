<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import type { EdEncounterBoardRow } from '$lib/model/type/medora/ed-workbench.type';
	import { EdBoardColumnEnum } from '$lib/model/enum/perioperative.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { connectPerioperativeSse } from '$lib/util/perioperative-sse.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import {
		isErBedRequiredCode,
		readApiErrorCode
	} from '$lib/util/er-bed-gate.util';
	import { redirectIfTwoFactorRequired } from '$lib/util/two-factor-gate.util';
	import { edBoardColumnRequiresErBed } from '$lib/tool/ed/ed-board-bed.util';
	import LEdAssignErBedDialogContent from '$lib/component/own/local/private/medora/emergency/LEdAssignErBedDialogContent.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const apiBase = $derived(
		hospitalId ? `/api/medora/hospital/${hospitalId}/home/emergency` : ''
	);

	const columns = [
		EdBoardColumnEnum.WAITING_TRIAGE,
		EdBoardColumnEnum.TRIAGE,
		EdBoardColumnEnum.FAST_TRACK,
		EdBoardColumnEnum.MAJORS,
		EdBoardColumnEnum.RESUS,
		EdBoardColumnEnum.AWAITING_ADMIT
	] as const;

	let rows = $state<EdEncounterBoardRow[]>([]);
	let loading = $state(false);
	let movingVisitId = $state<string | null>(null);

	function columnLabel(code: string): string {
		switch (code) {
			case EdBoardColumnEnum.WAITING_TRIAGE:
				return msg.ed_col_waiting_triage();
			case EdBoardColumnEnum.TRIAGE:
				return msg.ed_col_triage();
			case EdBoardColumnEnum.FAST_TRACK:
				return msg.ed_col_fast_track();
			case EdBoardColumnEnum.MAJORS:
				return msg.ed_col_majors();
			case EdBoardColumnEnum.RESUS:
				return msg.ed_col_resus();
			case EdBoardColumnEnum.AWAITING_ADMIT:
				return msg.ed_col_awaiting_admit();
			default:
				return code;
		}
	}

	async function loadBoard() {
		if (!apiBase) return;
		loading = true;
		try {
			const res = await fetch(apiBase);
			if (!res.ok) await throwUserFacingHttpError(res);
			rows = (await res.json()) as EdEncounterBoardRow[];
		} finally {
			loading = false;
		}
	}

	function openEmr(visitId: string) {
		void goto(
			`/medora/hospital/${hospitalId}/home/consultation/emr?visitId=${visitId}`
		);
	}

	async function openAssignBed(visitId: string) {
		await dialogService.open({
			title: msg.ed_assign_er_bed_title(),
			component: LEdAssignErBedDialogContent,
			props: {
				visitId,
				onAssigned: () => loadBoard()
			}
		});
	}

	async function moveColumn(visitId: string, boardColumn: string) {
		if (!apiBase || boardColumn === '') return;
		movingVisitId = visitId;
		try {
			const res = await fetch(apiBase, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					action: 'board_column',
					visitId,
					boardColumn
				})
			});
			if (await redirectIfTwoFactorRequired(res)) return;
			if (!res.ok) {
				const code = await readApiErrorCode(res);
				if (isErBedRequiredCode(code)) {
					await openAssignBed(visitId);
					return;
				}
				await throwUserFacingHttpError(res);
			}
			await loadBoard();
		} finally {
			movingVisitId = null;
		}
	}

	lifeCycle.onMount(() => {
		void loadBoard();
		if (!hospitalId) return;
		return connectPerioperativeSse({
			hospitalId,
			onEvent: () => void loadBoard()
		});
	});
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-3">
	<div class="flex shrink-0 flex-wrap items-center justify-between gap-2">
		<h1 class="text-primary text-lg font-bold">{msg.ed_track_board_title()}</h1>
		<WashButton
			className="btn-sm btn-ghost cursor-pointer"
			loading={loading}
			disabled={loading}
			onClick={() => loadBoard()}
		>
			{msg.ed_refresh()}
		</WashButton>
	</div>
	<div class="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-x-auto md:grid-cols-3 xl:grid-cols-6">
		{#each columns as col (col)}
			<section class="bg-base-200 flex min-h-48 min-w-[14rem] flex-col rounded-box p-2">
				<h2 class="text-sm font-bold">{columnLabel(col)}</h2>
				<div class="mt-2 flex flex-1 flex-col gap-2 overflow-y-auto">
					{#each rows.filter((r) => r.boardColumn === col) as card (card.visitId)}
						<article
							class="bg-base-100 rounded-box border border-base-300 p-2 shadow-sm"
						>
							<button
								type="button"
								class="hover:text-primary w-full cursor-pointer text-left"
								onclick={() => openEmr(card.visitId)}
							>
								<p class="font-medium">{card.patientName ?? msg.ed_unknown_patient()}</p>
								<p class="text-xs opacity-70">{card.visitNo}</p>
								<p class="text-xs">{card.chiefComplaint ?? '–'}</p>
								{#if card.erBedLabel}
									<p class="text-primary text-xs">{card.erBedLabel}</p>
								{/if}
								<p class="text-warning text-xs">
									{msg.ed_wait_minutes({ minutes: String(card.waitMinutes) })}
								</p>
								{#if card.acuityLevel}
									<span class="badge badge-sm badge-error">{card.acuityLevel}</span>
								{/if}
							</button>
							<div class="mt-2 flex flex-col gap-1">
								<label class="sr-only" for="move-{card.visitId}">{msg.ed_track_board_move_column()}</label>
								<select
									id="move-{card.visitId}"
									class="select select-xs w-full cursor-pointer"
									disabled={movingVisitId === card.visitId}
									value={card.boardColumn}
									onchange={(e) => {
										const v = (e.currentTarget as HTMLSelectElement).value;
										if (v !== card.boardColumn) void moveColumn(card.visitId, v);
									}}
								>
									{#each columns as opt (opt)}
										<option value={opt}>{columnLabel(opt)}</option>
									{/each}
								</select>
								{#if edBoardColumnRequiresErBed(card.boardColumn) && !card.erBedId}
									<button
										type="button"
										class="btn btn-xs btn-primary cursor-pointer"
										disabled={movingVisitId === card.visitId}
										onclick={() => openAssignBed(card.visitId)}
									>
										{msg.ed_track_board_assign_bed()}
									</button>
								{/if}
							</div>
						</article>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</div>
