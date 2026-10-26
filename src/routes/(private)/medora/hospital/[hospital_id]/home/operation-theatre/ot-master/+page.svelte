<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialog from '$lib/component/wash/dialog/WashDialog.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import OtPageHeader from '$lib/component/own/local/private/medora/operation-theatre/OtPageHeader.svelte';
	import type {
		OtMasterRow,
		OtOptions
	} from '$lib/model/type/medora/operation-theatre.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';

	const toast = new ToastService();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/operation-theatre`
			: ''
	);

	let options = $state<OtOptions | null>(null);
	let rows = $state<OtMasterRow[]>([]);
	let loading = $state(false);
	let submitting = $state(false);
	let includeInactive = $state(true);
	let filterBranchId = $state('');
	let dialogOpen = $state(false);
	let editingId = $state<number | null>(null);

	const branchOptions = $derived([
		{ value: '', label: 'All facilities' },
		...(options?.branches ?? []).map((branch) => ({
			value: branch.id,
			label: branch.name
		}))
	]);
	const formBranchOptions = $derived([
		{ value: '', label: 'Select facility' },
		...(options?.branches ?? []).map((branch) => ({
			value: branch.id,
			label: branch.name
		}))
	]);

	let form = $state({
		branchId: '',
		name: '',
		sequenceNo: '0',
		freezeMinutes: '0',
		otAdvanceMandatory: false,
		active: true
	});

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
			if (filterBranchId) q.set('branchId', filterBranchId);
			q.set('includeInactive', includeInactive ? '1' : '0');
			const res = await fetch(`${apiBase}/ot-master?${q.toString()}`);
			if (!res.ok) await throwUserFacingHttpError(res);
			rows = (await res.json()) as OtMasterRow[];
		} catch (err) {
			toast.addErrorToast('Could not load theatres', err);
		} finally {
			loading = false;
		}
	}

	function openAdd() {
		editingId = null;
		form = {
			branchId: filterBranchId || options?.branches[0]?.id || '',
			name: '',
			sequenceNo: String((rows.at(-1)?.sequenceNo ?? 0) + 1),
			freezeMinutes: '0',
			otAdvanceMandatory: false,
			active: true
		};
		dialogOpen = true;
	}

	function openEdit(row: OtMasterRow) {
		editingId = row.id;
		form = {
			branchId: row.branchId,
			name: row.name,
			sequenceNo: String(row.sequenceNo),
			freezeMinutes: String(row.freezeMinutes),
			otAdvanceMandatory: row.otAdvanceMandatory,
			active: row.statusId === 1
		};
		dialogOpen = true;
	}

	async function save() {
		if (!apiBase) return;
		if (!form.name.trim() || !form.branchId) {
			toast.addWarningToast(
				'Theatre name and facility are required.'
			);
			return;
		}
		submitting = true;
		try {
			const res = await fetch(`${apiBase}/ot-master`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					id: editingId,
					branchId: form.branchId,
					name: form.name,
					sequenceNo: Number(form.sequenceNo) || 0,
					freezeMinutes: Number(form.freezeMinutes) || 0,
					otAdvanceMandatory: form.otAdvanceMandatory,
					active: form.active
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toast.addSuccessToast(
				editingId ? 'Theatre updated.' : 'Theatre added.'
			);
			dialogOpen = false;
			await load();
		} catch (err) {
			toast.addErrorToast('Could not save the theatre', err);
		} finally {
			submitting = false;
		}
	}

	async function toggleActive(row: OtMasterRow) {
		if (!apiBase) return;
		const res = await fetch(`${apiBase}/ot-master`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				id: row.id,
				branchId: row.branchId,
				name: row.name,
				sequenceNo: row.sequenceNo,
				freezeMinutes: row.freezeMinutes,
				otAdvanceMandatory: row.otAdvanceMandatory,
				active: row.statusId !== 1
			})
		});
		if (!res.ok) {
			toast.addErrorToast('Could not change theatre status');
			return;
		}
		toast.addSuccessToast(
			row.statusId === 1
				? 'Theatre deactivated.'
				: 'Theatre activated.'
		);
		await load();
	}

	onMount(() => {
		void (async () => {
			await loadOptions();
			await load();
		})();
	});
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-4">
	<OtPageHeader
		title="OT Master"
		description="Configure theatres, freeze time between cases and advance-deposit rules."
		{loading}
		onRefresh={load}
		addLabel="Add Theatre"
		onAdd={openAdd}
	/>

	<section
		class="rounded-box flex flex-wrap items-end gap-2 border border-base-300 p-3"
	>
		<label class="form-control min-w-[13rem]">
			<span class="label-text text-xs">Facility</span>
			<WashSelect
				className="select-sm"
				bind:value={filterBranchId}
				options={branchOptions}
				onChange={() => void load()}
			/>
		</label>
		<label class="label cursor-pointer justify-start gap-2">
			<input
				class="checkbox checkbox-sm"
				type="checkbox"
				bind:checked={includeInactive}
				onchange={() => void load()}
			/>
			<span class="label-text text-sm">Include inactive theatres</span
			>
		</label>
		<p class="text-xs opacity-60">
			{rows.length} theatre{rows.length === 1 ? '' : 's'}
		</p>
	</section>

	<section
		class="rounded-box min-h-0 flex-1 overflow-auto border border-base-300"
	>
		<table class="table-sm table-zebra table">
			<thead class="sticky top-0 z-10 bg-base-200">
				<tr>
					<th>Sequence</th>
					<th>Theatre</th>
					<th>Facility</th>
					<th>Freeze after case</th>
					<th>Advance deposit</th>
					<th>Status</th>
					<th>Action</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.id)}
					<tr class:opacity-60={row.statusId !== 1}>
						<td>{row.sequenceNo}</td>
						<td class="font-medium">{row.name}</td>
						<td>{row.branchName ?? '—'}</td>
						<td>{row.freezeMinutes} min</td>
						<td
							>{row.otAdvanceMandatory
								? 'Required'
								: 'Not required'}</td
						>
						<td>
							<span
								class="badge badge-sm {row.statusId === 1
									? 'badge-success'
									: 'badge-ghost'}"
							>
								{row.statusId === 1 ? 'Active' : 'Inactive'}
							</span>
						</td>
						<td class="flex gap-1">
							<WashButton
								variant="ghost"
								size="xs"
								className="cursor-pointer"
								onClick={() => openEdit(row)}>Edit</WashButton
							>
							<WashButton
								variant={row.statusId === 1 ? 'error' : 'success'}
								size="xs"
								className="cursor-pointer"
								onClick={() => toggleActive(row)}
							>
								{row.statusId === 1 ? 'Deactivate' : 'Activate'}
							</WashButton>
						</td>
					</tr>
				{:else}
					<tr
						><td colspan="7" class="text-center opacity-60"
							>No theatres configured.</td
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
	title={editingId ? 'Edit theatre' : 'Add theatre'}
	description="Theatre settings apply to all OT bookings at the selected facility."
>
	<div class="grid items-start gap-3 sm:grid-cols-2">
		<label class="form-control min-w-0 sm:col-span-2">
			<span class="label-text text-xs">Theatre name *</span>
			<input
				class="input input-sm w-full"
				bind:value={form.name}
				placeholder="e.g. OT 1 / Major Theatre"
			/>
		</label>
		<label class="form-control min-w-0 sm:col-span-2">
			<span class="label-text text-xs">Facility *</span>
			<WashSelect
				className="select-sm"
				bind:value={form.branchId}
				options={formBranchOptions}
			/>
		</label>
		<label class="form-control min-w-0">
			<span class="label-text text-xs">Sequence</span>
			<input
				class="input input-sm w-full"
				type="number"
				min="0"
				bind:value={form.sequenceNo}
			/>
		</label>
		<label class="form-control min-w-0">
			<span class="label-text text-xs"
				>Freeze after case (minutes)</span
			>
			<input
				class="input input-sm w-full"
				type="number"
				min="0"
				max="240"
				step="5"
				bind:value={form.freezeMinutes}
			/>
		</label>
		<div
			class="rounded-box flex min-w-0 flex-col gap-2 border border-base-300 bg-base-200/40 p-3 sm:col-span-2"
		>
			<label
				class="flex min-w-0 cursor-pointer items-start gap-2"
			>
				<input
					class="checkbox checkbox-sm mt-0.5 shrink-0"
					type="checkbox"
					bind:checked={form.otAdvanceMandatory}
				/>
				<span class="min-w-0 text-sm leading-snug break-words"
					>Booking requires an IP advance deposit</span
				>
			</label>
			<label
				class="flex min-w-0 cursor-pointer items-start gap-2"
			>
				<input
					class="checkbox checkbox-sm mt-0.5 shrink-0"
					type="checkbox"
					bind:checked={form.active}
				/>
				<span class="min-w-0 text-sm leading-snug break-words"
					>Theatre active</span
				>
			</label>
		</div>
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
			onClick={save}
		>
			{editingId ? 'Save changes' : 'Add theatre'}
		</WashButton>
	{/snippet}
</WashDialog>
