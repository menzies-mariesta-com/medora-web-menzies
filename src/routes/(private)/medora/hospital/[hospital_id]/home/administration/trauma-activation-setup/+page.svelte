<script lang="ts">
	import { page } from '$app/state';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type {
		TraumaActivationLevelRow,
		TraumaMilestoneTemplateRow,
		TraumaTeamRoleRow
	} from '$lib/model/type/medora/trauma-log.type';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/trauma-activation-setup`
			: ''
	);

	type Tab = 'level' | 'milestone' | 'team';
	let tab = $state<Tab>('level');
	let isLoading = $state(false);
	let levelRows = $state<TraumaActivationLevelRow[]>([]);
	let milestoneRows = $state<TraumaMilestoneTemplateRow[]>([]);
	let teamRows = $state<TraumaTeamRoleRow[]>([]);

	const levelColumns: MenziesTableColumn<TraumaActivationLevelRow>[] = [
		{ id: 'code', header: msg.trauma_admin_col_code?.() ?? 'Code', filterable: false },
		{ id: 'name', header: m.name(), filterable: false },
		{
			id: 'color',
			header: msg.trauma_admin_col_color?.() ?? 'Color',
			filterable: false,
			format: (_v, row) => row.color
		},
		{
			id: 'sortOrder',
			header: msg.trauma_admin_col_sort?.() ?? 'Sort',
			filterable: false,
			format: (_v, row) => String(row.sortOrder)
		}
	];

	const milestoneColumns: MenziesTableColumn<TraumaMilestoneTemplateRow>[] = [
		{ id: 'code', header: msg.trauma_admin_col_code?.() ?? 'Code', filterable: false },
		{ id: 'label', header: msg.trauma_admin_col_label?.() ?? 'Label', filterable: false },
		{
			id: 'sortOrder',
			header: msg.trauma_admin_col_sort?.() ?? 'Sort',
			filterable: false,
			format: (_v, row) => String(row.sortOrder)
		}
	];

	const teamColumns: MenziesTableColumn<TraumaTeamRoleRow>[] = [
		{ id: 'code', header: msg.trauma_admin_col_code?.() ?? 'Code', filterable: false },
		{ id: 'label', header: msg.trauma_admin_col_label?.() ?? 'Label', filterable: false },
		{
			id: 'sortOrder',
			header: msg.trauma_admin_col_sort?.() ?? 'Sort',
			filterable: false,
			format: (_v, row) => String(row.sortOrder)
		}
	];

	async function load(opts?: {
		signal?: AbortSignal;
		isCancelled?: () => boolean;
	}) {
		if (!apiBase) return;
		isLoading = true;
		try {
			const entity = tab === 'level' ? 'level' : tab === 'milestone' ? 'milestone' : 'team';
			const res = await fetch(`${apiBase}?entity=${entity}&page=1&pageSize=100&statusId=${StatusEnum.ACTIVE}`, { signal: opts?.signal });
			if (!res.ok) await throwUserFacingHttpError(res);
			const data = (await res.json()) as { data: unknown[] };
			if (tab === 'level') levelRows = data.data as TraumaActivationLevelRow[];
			else if (tab === 'milestone')
				milestoneRows = data.data as TraumaMilestoneTemplateRow[];
			else teamRows = data.data as TraumaTeamRoleRow[];
		} finally {
			if (!opts?.isCancelled?.()) isLoading = false;
		}
	}

	async function quickAdd() {
		if (!apiBase) return;
		const code = prompt(msg.trauma_admin_prompt_code?.() ?? 'Code?');
		if (!code?.trim()) return;
		const label =
			tab === 'level'
				? prompt(msg.trauma_admin_prompt_name?.() ?? 'Name?')
				: prompt(msg.trauma_admin_prompt_label?.() ?? 'Label?');
		if (!label?.trim()) return;
		const entity = tab === 'level' ? 'level' : tab === 'milestone' ? 'milestone' : 'team';
		const body: Record<string, unknown> = {
			entity,
			code: code.trim(),
			sortOrder: 0,
			statusId: StatusEnum.ACTIVE
		};
		if (tab === 'level') {
			body.name = label.trim();
			body.color = 'error';
		} else {
			body.label = label.trim();
		}
		const res = await fetch(apiBase, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) await throwUserFacingHttpError(res);
		await load();
	}

	$effect(() => {
		void tab;
			let cancelled = false;
			const ac = new AbortController();
		void load({ signal: ac.signal, isCancelled: () => cancelled });
			return () => {
				cancelled = true;
				ac.abort();
			};
	});

	lifeCycle.onMount(() => void load());
</script>

<div class="flex flex-col gap-4 p-4">
	<h1 class="text-primary text-xl font-bold">
		{msg.trauma_admin_title?.() ?? 'Trauma activation setup'}
	</h1>
	<p class="text-sm text-base-content/70">
		{msg.trauma_admin_desc?.() ??
			'Configure activation levels, milestones, and team roles for the trauma command center.'}
	</p>

	<div role="tablist" class="tabs tabs-boxed w-fit">
		<button
			type="button"
			role="tab"
			class="tab"
			class:tab-active={tab === 'level'}
			onclick={() => (tab = 'level')}
		>
			{msg.trauma_admin_tab_levels?.() ?? 'Levels'}
		</button>
		<button
			type="button"
			role="tab"
			class="tab"
			class:tab-active={tab === 'milestone'}
			onclick={() => (tab = 'milestone')}
		>
			{msg.trauma_admin_tab_milestones?.() ?? 'Milestones'}
		</button>
		<button
			type="button"
			role="tab"
			class="tab"
			class:tab-active={tab === 'team'}
			onclick={() => (tab = 'team')}
		>
			{msg.trauma_admin_tab_team?.() ?? 'Team roles'}
		</button>
	</div>

	<div class="flex gap-2">
		<WashButton className="btn-primary btn-sm cursor-pointer" onClick={() => void quickAdd()}>
			{msg.trauma_admin_add?.() ?? 'Add'}
		</WashButton>
		<WashButton className="btn-ghost btn-sm cursor-pointer" onClick={() => void load()}>
			{msg.trauma_admin_refresh?.() ?? 'Refresh'}
		</WashButton>
	</div>

	{#if tab === 'level'}
		<div class={TableEnum.HEIGHT_SMALL}>
			<MenziesTable
				title={msg.trauma_admin_tab_levels?.() ?? 'Levels'}
				rows={levelRows}
				columns={levelColumns}
				{isLoading}
				showRefreshButton={false}
				pageSize={String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE)}
				currentPage={1}
				emptyMessage={msg.trauma_table_empty?.() ?? 'No rows'}
				showRowActions={false}
				enableColumnFilters={false}
			/>
		</div>
	{:else if tab === 'milestone'}
		<div class={TableEnum.HEIGHT_SMALL}>
			<MenziesTable
				title={msg.trauma_admin_tab_milestones?.() ?? 'Milestones'}
				rows={milestoneRows}
				columns={milestoneColumns}
				{isLoading}
				showRefreshButton={false}
				pageSize={String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE)}
				currentPage={1}
				emptyMessage={msg.trauma_table_empty?.() ?? 'No rows'}
				showRowActions={false}
				enableColumnFilters={false}
			/>
		</div>
	{:else}
		<div class={TableEnum.HEIGHT_SMALL}>
			<MenziesTable
				title={msg.trauma_admin_tab_team?.() ?? 'Team roles'}
				rows={teamRows}
				columns={teamColumns}
				{isLoading}
				showRefreshButton={false}
				pageSize={String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE)}
				currentPage={1}
				emptyMessage={msg.trauma_table_empty?.() ?? 'No rows'}
				showRowActions={false}
				enableColumnFilters={false}
			/>
		</div>
	{/if}
</div>