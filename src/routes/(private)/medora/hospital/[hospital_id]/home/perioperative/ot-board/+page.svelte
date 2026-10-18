<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import type { OtRoomRow } from '$lib/model/type/medora/surgical-case.type';
	import type { SurgicalCaseListRow } from '$lib/model/type/medora/surgical-case.type';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { connectPerioperativeSse } from '$lib/util/perioperative-sse.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const boardDate = $derived(
		page.url.searchParams.get('date') ??
			new Date().toISOString().slice(0, 10)
	);
	const caseApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/perioperative/surgical-case`
			: ''
	);
	const roomApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/perioperative/ot-room`
			: ''
	);

	let rooms = $state<OtRoomRow[]>([]);
	let cases = $state<SurgicalCaseListRow[]>([]);
	let loading = $state(false);

	async function load() {
		if (!caseApi || !roomApi) return;
		loading = true;
		try {
			const [rRes, cRes] = await Promise.all([
				fetch(roomApi),
				fetch(`${caseApi}?date=${encodeURIComponent(boardDate)}`)
			]);
			if (!rRes.ok) await throwUserFacingHttpError(rRes);
			if (!cRes.ok) await throwUserFacingHttpError(cRes);
			rooms = (await rRes.json()) as OtRoomRow[];
			cases = (await cRes.json()) as SurgicalCaseListRow[];
		} finally {
			loading = false;
		}
	}

	function casesForRoom(roomId: number) {
		return cases.filter((c) => c.otRoomId === roomId);
	}

	function priorityClass(priority: string): string {
		if (priority === 'emergency') return 'border-error bg-error/10';
		if (priority === 'urgent') return 'border-warning bg-warning/10';
		return 'border-base-300';
	}

	lifeCycle.onMount(() => {
		void load();
		if (!hospitalId) return;
		return connectPerioperativeSse({
			hospitalId,
			onEvent: () => void load()
		});
	});
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-3">
	<div class="flex shrink-0 items-center justify-between gap-2">
		<h1 class="text-primary text-lg font-bold">{msg.ot_board_title()}</h1>
		<WashButton
			className="btn-sm btn-ghost cursor-pointer"
			loading={loading}
			disabled={loading}
			onClick={() => load()}
		>
			{msg.ot_refresh()}
		</WashButton>
	</div>
	<p class="text-sm opacity-70">{msg.ot_board_date({ date: boardDate })}</p>
	<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
		{#each rooms as room (room.id)}
			<section class="border-base-300 rounded-box border p-3">
				<h2 class="font-bold">{room.name}</h2>
				<div class="mt-2 flex flex-wrap gap-2">
					{#each casesForRoom(room.id) as c (c.id)}
						<a
							href={`/medora/hospital/${hospitalId}/home/perioperative/cases?caseId=${c.id}&visitId=${c.visitId}`}
							class="hover:bg-primary/30 min-w-[12rem] cursor-pointer rounded-box border p-2 {priorityClass(
								c.priority
							)}"
						>
							<p class="text-sm font-medium">{c.procedureName}</p>
							<p class="text-xs">{c.patientName}</p>
							<p class="text-xs opacity-70">
								{c.scheduledStart?.slice(11, 16) ?? '–'} –
								{c.scheduledEnd?.slice(11, 16) ?? '–'}
							</p>
						</a>
					{:else}
						<p class="text-sm opacity-60">{msg.ot_no_cases()}</p>
					{/each}
				</div>
			</section>
		{:else}
			<p class="text-sm">{msg.ot_no_rooms()}</p>
		{/each}
	</div>
</div>
