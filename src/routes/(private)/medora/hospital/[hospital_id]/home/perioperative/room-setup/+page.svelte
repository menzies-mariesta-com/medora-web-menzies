<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
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
	const branchId = $derived(
		typeof page.data?.selectedBranchId === 'string' &&
			page.data.selectedBranchId !== '__all__'
			? page.data.selectedBranchId
			: ''
	);
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/perioperative/ot-room`
			: ''
	);

	let rows = $state<OtRoomRow[]>([]);
	let name = $state('');
	let submitting = $state(false);

	async function load() {
		const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
		const res = await fetch(`${api}${q}`);
		if (!res.ok) await throwUserFacingHttpError(res);
		rows = (await res.json()) as OtRoomRow[];
	}

	async function save() {
		if (!branchId || !name.trim()) return;
		submitting = true;
		try {
			await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ branchId, name: name.trim() })
			});
			name = '';
			await load();
			toastSuccess(toastService, msg.ot_room_saved_toast());
		} finally {
			submitting = false;
		}
	}

	lifeCycle.onMount(() => void load());
</script>

<div class="mx-auto flex max-w-lg flex-col gap-4 p-4">
	<h1 class="text-primary text-lg font-bold">{msg.ot_room_setup_title()}</h1>
	{#if !branchId}
		<p class="text-warning text-sm">{msg.ot_select_branch()}</p>
	{:else}
		<div class="flex gap-2">
			<WashInputField
				className="input-sm flex-1"
				placeholder={msg.ot_room_name()}
				bind:value={name}
			/>
			<WashButton
				className="btn-primary btn-sm cursor-pointer"
				loading={submitting}
				disabled={submitting}
				onClick={save}
			>
				{msg.ot_room_add()}
			</WashButton>
		</div>
	{/if}
	<ul class="menu rounded-box border border-base-300">
		{#each rows as row (row.id)}
			<li><span>{row.name}</span></li>
		{/each}
	</ul>
</div>
