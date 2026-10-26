<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialog from '$lib/component/wash/dialog/WashDialog.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import OtPageHeader from '$lib/component/own/local/private/medora/operation-theatre/OtPageHeader.svelte';
	import type {
		OtHandoffRow,
		OtHandoffStage,
		OtOptions
	} from '$lib/model/type/medora/operation-theatre.type';
	import {
		formatOtDate,
		formatOtTime
	} from '$lib/tool/operation-theatre/ot-status.util';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { connectPerioperativeSse } from '$lib/util/perioperative-sse.util.svelte';

	type StageTab = {
		id: OtHandoffStage;
		label: string;
		description: string;
		action: string;
	};

	const tabs: StageTab[] = [
		{
			id: 'from_ward',
			label: 'From Ward',
			description:
				'Booked patients still waiting in the ward for handoff.',
			action: 'Acknowledge from ward'
		},
		{
			id: 'pre_op',
			label: 'Pre-Op',
			description:
				'Patients received by OT and awaiting pre-op checks.',
			action: 'Acknowledge pre-op'
		},
		{
			id: 'in_ot',
			label: 'In OT',
			description: 'Patients currently in theatre.',
			action: 'Mark post-op'
		},
		{
			id: 'post_op',
			label: 'Post-Op',
			description: 'Post-op patients awaiting return to ward.',
			action: 'Return to ward'
		}
	];

	const toast = new ToastService();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/operation-theatre`
			: ''
	);

	let activeStage = $state<OtHandoffStage>('from_ward');
	let data = $state<Record<OtHandoffStage, OtHandoffRow[]>>({
		from_ward: [],
		pre_op: [],
		in_ot: [],
		post_op: []
	});
	let options = $state<OtOptions | null>(null);
	let loading = $state(false);
	let submitting = $state(false);
	let branchId = $state('');
	let search = $state('');
	let selected = $state<OtHandoffRow | null>(null);
	let actionStage = $state<OtHandoffStage | 'return_to_ward'>(
		'from_ward'
	);

	const branchOptions = $derived([
		{ value: '', label: 'All facilities' },
		...(options?.branches ?? []).map((branch) => ({
			value: branch.id,
			label: branch.name
		}))
	]);
	let wardRemarks = $state('');
	let dialogOpen = $state(false);

	const currentTab = $derived(
		tabs.find((t) => t.id === activeStage) ?? tabs[0]!
	);
	const currentRows = $derived(
		data[activeStage].filter((row) => {
			const q = search.trim().toLowerCase();
			if (!q) return true;
			return [
				row.patientName,
				row.hrn,
				row.bookingNo,
				row.wardName,
				row.bedNo
			]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q));
		})
	);

	async function loadOptions() {
		if (!apiBase) return;
		const res = await fetch(`${apiBase}/options`);
		if (!res.ok) return;
		options = (await res.json()) as OtOptions;
	}

	async function load() {
		if (!apiBase) return;
		loading = true;
		try {
			const q = new SvelteURLSearchParams();
			if (branchId) q.set('branchId', branchId);
			const res = await fetch(`${apiBase}/handoff?${q.toString()}`);
			if (!res.ok) await throwUserFacingHttpError(res);
			const result = (await res.json()) as Record<
				OtHandoffStage,
				OtHandoffRow[]
			>;
			data = {
				from_ward: result.from_ward ?? [],
				pre_op: result.pre_op ?? [],
				in_ot: result.in_ot ?? [],
				post_op: result.post_op ?? []
			};
		} catch (err) {
			toast.addErrorToast('Could not load handoff worklists', err);
		} finally {
			loading = false;
		}
	}

	function openAction(row: OtHandoffRow, stage: OtHandoffStage) {
		selected = row;
		actionStage = stage === 'post_op' ? 'return_to_ward' : stage;
		wardRemarks = row.wardRemarks ?? '';
		dialogOpen = true;
	}

	async function submitAction() {
		if (!apiBase || !selected) return;
		submitting = true;
		try {
			const res = await fetch(`${apiBase}/handoff`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					caseId: selected.surgicalCaseId,
					stage: actionStage,
					wardRemarks
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toast.addSuccessToast('Handoff acknowledged.');
			dialogOpen = false;
			selected = null;
			await load();
		} catch (err) {
			toast.addErrorToast('Could not acknowledge handoff', err);
		} finally {
			submitting = false;
		}
	}

	function actionLabel(stage: OtHandoffStage): string {
		return tabs.find((t) => t.id === stage)?.action ?? 'Acknowledge';
	}

	onMount(() => {
		void loadOptions();
		void load();
		if (!hospitalId) return;
		return connectPerioperativeSse({
			hospitalId,
			onEvent: () => void load()
		});
	});
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-4">
	<OtPageHeader
		title="Ward to OT Acknowledgement"
		description="Track the patient handoff from ward to OT, pre-op, theatre and back to the ward."
		{loading}
		onRefresh={load}
	/>

	<section
		class="rounded-box flex flex-wrap items-end gap-2 border border-base-300 p-3"
	>
		<label class="form-control min-w-[12rem]">
			<span class="label-text text-xs">Facility</span>
			<WashSelect
				className="select-sm"
				bind:value={branchId}
				options={branchOptions}
				onChange={() => void load()}
			/>
		</label>
		<label class="form-control min-w-[16rem] flex-1">
			<span class="label-text text-xs">Filter worklist</span>
			<input
				class="input input-sm w-full"
				bind:value={search}
				placeholder="Patient, HRN, booking no, ward, bed"
			/>
		</label>
		<p class="text-xs opacity-60">
			{currentRows.length} of {data[activeStage].length} patients
		</p>
	</section>

	<div
		role="tablist"
		class="flex flex-wrap gap-1 border-b border-base-300"
	>
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				role="tab"
				aria-selected={activeStage === tab.id}
				class="tab tab-bordered cursor-pointer"
				class:tab-active={activeStage === tab.id}
				onclick={() => (activeStage = tab.id)}
			>
				{tab.label}
				<span class="badge badge-sm ml-1">{data[tab.id].length}</span>
			</button>
		{/each}
	</div>

	<p class="text-sm opacity-70">{currentTab.description}</p>

	<section
		class="rounded-box min-h-0 flex-1 overflow-auto border border-base-300"
	>
		<table class="table-sm table-zebra table">
			<thead class="sticky top-0 z-10 bg-base-200">
				<tr>
					<th>Patient</th>
					<th>Ward / bed</th>
					<th>Booking</th>
					<th>OT schedule</th>
					<th>Ward remarks</th>
					<th>Handoff times</th>
					<th>Action</th>
				</tr>
			</thead>
			<tbody>
				{#each currentRows as row (row.surgicalCaseId)}
					<tr>
						<td>
							<p class="font-medium">{row.patientName}</p>
							<p class="text-xs opacity-60">
								{row.hrn ?? '—'} · {row.ageGender} · {row.encounterNo ??
									'—'}
							</p>
						</td>
						<td
							>{row.wardName ?? '—'}{row.bedNo
								? ` / ${row.bedNo}`
								: ''}</td
						>
						<td>{row.bookingNo ?? '—'}</td>
						<td>
							<p>{row.theatreName ?? '—'}</p>
							<p class="text-xs opacity-60">
								{formatOtDate(row.otDate)}
								{formatOtTime(row.otDate)}
							</p>
						</td>
						<td class="max-w-[14rem] text-xs whitespace-pre-wrap"
							>{row.wardRemarks ?? '—'}</td
						>
						<td class="text-xs">
							{#if row.wardToOtAt}<p>
									Ward: {formatOtTime(row.wardToOtAt)}
								</p>{/if}
							{#if row.preOpAcknowledgedAt}<p>
									Pre-op: {formatOtTime(row.preOpAcknowledgedAt)}
								</p>{/if}
							{#if row.inOtAt}<p>
									In OT: {formatOtTime(row.inOtAt)}
								</p>{/if}
							{#if row.postOpAt}<p>
									Post-op: {formatOtTime(row.postOpAt)}
								</p>{/if}
							{#if row.returnedToWardAt}<p>
									Ward return: {formatOtTime(row.returnedToWardAt)}
								</p>{/if}
							{#if !row.wardToOtAt && !row.inOtAt && !row.postOpAt}<span
									class="opacity-60">Awaiting</span
								>{/if}
						</td>
						<td>
							<WashButton
								variant="primary"
								size="xs"
								className="cursor-pointer"
								onClick={() => openAction(row, activeStage)}
							>
								{actionLabel(activeStage)}
							</WashButton>
						</td>
					</tr>
				{:else}
					<tr
						><td colspan="7" class="text-center opacity-60"
							>No patients in this stage.</td
						></tr
					>
				{/each}
			</tbody>
		</table>
	</section>
</div>

<WashDialog
	open={dialogOpen}
	onClose={() => (dialogOpen = false)}
	title={actionStage === 'return_to_ward'
		? 'Return patient to ward'
		: actionLabel(activeStage)}
	description={selected?.patientName}
>
	<div class="space-y-2 text-sm">
		<p>
			<span class="opacity-60">Booking:</span>
			{selected?.bookingNo ?? '—'}
		</p>
		<p>
			<span class="opacity-60">Ward / bed:</span>
			{selected?.wardName ?? '—'}{selected?.bedNo
				? ` / ${selected.bedNo}`
				: ''}
		</p>
		{#if actionStage === 'from_ward'}
			<label class="form-control">
				<span class="label-text text-xs">Ward remarks</span>
				<textarea
					class="textarea textarea-sm w-full"
					rows="3"
					bind:value={wardRemarks}
					placeholder="Patient ready, consent signed, site marked…"
				></textarea>
			</label>
		{/if}
	</div>
	{#snippet actions()}
		<WashButton
			variant="ghost"
			size="sm"
			className="cursor-pointer"
			onClick={() => (dialogOpen = false)}>Cancel</WashButton
		>
		<WashButton
			variant="primary"
			size="sm"
			className="cursor-pointer"
			loading={submitting}
			disabled={submitting}
			onClick={submitAction}>Acknowledge</WashButton
		>
	{/snippet}
</WashDialog>
