<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import SurgicalCasePanel from '$lib/component/own/local/private/medora/perioperative/SurgicalCasePanel.svelte';
	import type { SurgicalCaseListRow } from '$lib/model/type/medora/surgical-case.type';
	import type { OtRoomRow } from '$lib/model/type/medora/surgical-case.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { toastSuccess } from '$lib/util/toast-copy.util';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const toastService = new ToastService();
	const lifeCycle = new LifeCycleUtil();

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitIdParam = $derived(page.url.searchParams.get('visitId') ?? '');
	const caseIdParam = $derived(Number(page.url.searchParams.get('caseId') ?? 0));

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

	let cases = $state<SurgicalCaseListRow[]>([]);
	let rooms = $state<OtRoomRow[]>([]);
	let selected = $state<SurgicalCaseListRow | null>(null);
	let newProcedure = $state('');
	let scheduleRoomId = $state('');
	let scheduleStart = $state('');
	let scheduleEnd = $state('');
	let bumpMode = $state<'none' | 'bump'>('none');
	let submitting = $state(false);

	async function loadCases() {
		if (!caseApi) return;
		const res = await fetch(caseApi);
		if (!res.ok) await throwUserFacingHttpError(res);
		cases = (await res.json()) as SurgicalCaseListRow[];
		if (caseIdParam > 0) {
			selected = cases.find((c) => c.id === caseIdParam) ?? selected;
		}
	}

	async function loadRooms() {
		if (!roomApi) return;
		const res = await fetch(roomApi);
		if (!res.ok) await throwUserFacingHttpError(res);
		rooms = (await res.json()) as OtRoomRow[];
	}

	async function createCase() {
		if (!visitIdParam || !newProcedure.trim()) return;
		submitting = true;
		try {
			await fetch(caseApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action: 'create',
					visitId: visitIdParam,
					procedureName: newProcedure.trim()
				})
			});
			newProcedure = '';
			await loadCases();
			toastSuccess(toastService, msg.periop_case_created_toast());
		} finally {
			submitting = false;
		}
	}

	async function scheduleSelected() {
		if (!selected || !scheduleRoomId || !scheduleStart || !scheduleEnd) return;
		submitting = true;
		try {
			await fetch(caseApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action: 'schedule',
					caseId: selected.id,
					otRoomId: Number(scheduleRoomId),
					scheduledStart: scheduleStart,
					scheduledEnd: scheduleEnd,
					bumpMode
				})
			});
			await loadCases();
			selected =
				cases.find((c) => c.id === selected?.id) ?? selected;
			toastSuccess(toastService, msg.periop_case_scheduled_toast());
		} finally {
			submitting = false;
		}
	}

	lifeCycle.onMount(() => {
		void loadRooms();
		void loadCases();
	});
</script>

<div class="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[1fr_1.2fr]">
	<section class="flex min-h-0 flex-col gap-3">
		<h1 class="text-primary text-lg font-bold">{msg.periop_cases_title()}</h1>
		{#if visitIdParam}
			<div class="flex flex-wrap gap-2">
				<WashInputField
					className="input-sm flex-1"
					placeholder={msg.periop_procedure_name()}
					bind:value={newProcedure}
				/>
				<WashButton
					className="btn-primary btn-sm cursor-pointer"
					loading={submitting}
					disabled={submitting}
					onClick={createCase}
				>
					{msg.periop_create_case()}
				</WashButton>
			</div>
		{/if}
		<div class="min-h-0 flex-1 overflow-auto">
			<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
				<thead class="sticky top-0 z-10 bg-base-100">
					<tr>
						<th>{msg.periop_col_procedure()}</th>
						<th>{msg.periop_col_patient()}</th>
						<th>{msg.periop_col_room()}</th>
					</tr>
				</thead>
				<tbody>
					{#each cases as row (row.id)}
						<tr
							class="cursor-pointer"
							onclick={() => (selected = row)}
						>
							<td>{row.procedureName}</td>
							<td>{row.patientName}</td>
							<td>{row.otRoomName ?? '–'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="min-h-0 overflow-y-auto">
		{#if selected}
			<div class="mb-4 flex flex-col gap-2 rounded-box border border-base-300 p-3">
				<h2 class="text-secondary font-bold">{msg.ot_schedule_case()}</h2>
				<select class="select select-sm max-w-xs" bind:value={scheduleRoomId}>
					<option value="">{msg.periop_form_select()}</option>
					{#each rooms as r (r.id)}
						<option value={String(r.id)}>{r.name}</option>
					{/each}
				</select>
				<WashInputField
					inputType="datetime-local"
					className="input-sm max-w-xs"
					bind:value={scheduleStart}
				/>
				<WashInputField
					inputType="datetime-local"
					className="input-sm max-w-xs"
					bind:value={scheduleEnd}
				/>
				<label class="label cursor-pointer justify-start gap-2">
					<input
						type="checkbox"
						class="checkbox checkbox-sm"
						checked={bumpMode === 'bump'}
						onchange={(e) =>
							(bumpMode = e.currentTarget.checked ? 'bump' : 'none')}
					/>
					<span class="label-text text-sm">{msg.ot_bump_elective()}</span>
				</label>
				<WashButton
					className="btn-secondary btn-sm cursor-pointer"
					loading={submitting}
					disabled={submitting}
					onClick={scheduleSelected}
				>
					{msg.ot_schedule_save()}
				</WashButton>
			</div>
			<SurgicalCasePanel
				caseRow={selected}
				onUpdated={loadCases}
			/>
		{:else}
			<p class="text-sm opacity-70">{msg.periop_select_case_hint()}</p>
		{/if}
	</section>
</div>
