<script lang="ts">
	import { page } from '$app/state';
	import ClinicalFormRenderer from '$lib/component/own/local/private/medora/clinical-form/ClinicalFormRenderer.svelte';
	import LEdAssignErBedDialogContent from '$lib/component/own/local/private/medora/emergency/LEdAssignErBedDialogContent.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import type { ClinicalFormTemplateSchema } from '$lib/model/type/medora/clinical-form.type';
	import {
		medoraHospitalPageUrl,
		WebRoutesEnum
	} from '$lib/model/enum/routes.enum';
	import type {
		TraumaActivationDetailPayload,
		TraumaActivationLevelRow,
		TraumaActivationRichRow,
		TraumaVisitContextRow
	} from '$lib/model/type/medora/trauma-log.type';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { toastSuccess } from '$lib/util/toast-copy.util';
	import { parseUtcInstant } from '$lib/util/utc-instant.util';
	import {
		isErBedRequiredCode,
		readApiErrorCode
	} from '$lib/util/er-bed-gate.util';
	import { redirectIfTwoFactorRequired } from '$lib/util/two-factor-gate.util';
	import { connectPerioperativeSse } from '$lib/util/perioperative-sse.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { onMount } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { badgeInlineStyleFromColor } from '$lib/tool/color/hospital-color-resolve.util';
	import { daisyUiTokenToHex } from '$lib/tool/color/color-daisyui-default.util';

	const msg = m as Record<string, (inputs?: object) => string>;
	const toastService = new ToastService();

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(page.url.searchParams.get('visitId') ?? '');
	const traumaApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/nursing-workbench/trauma-log`
			: ''
	);
	const formApi = $derived(
		hospitalId ? `/api/medora/hospital/${hospitalId}/home/clinical-form` : ''
	);
	const edApi = $derived(
		hospitalId ? `/api/medora/hospital/${hospitalId}/home/emergency` : ''
	);

	let activeRows = $state<TraumaActivationRichRow[]>([]);
	let historyRows = $state<TraumaActivationRichRow[]>([]);
	let levels = $state<TraumaActivationLevelRow[]>([]);
	let selectedLevelCode = $state('');
	let selectedActivationId = $state<number | null>(null);
	let detail = $state<TraumaActivationDetailPayload | null>(null);
	let viewTab = $state<'command' | 'history'>('command');
	let loading = $state(false);
	let submitting = $state(false);
	let visitContext = $state<TraumaVisitContextRow | null>(null);
	let schema = $state<ClinicalFormTemplateSchema | null>(null);
	let formValues = $state<Record<string, unknown>>({});
	let standDownReason = $state('');
	let clockTick = $state(Date.now());

	const templateCode = 'trauma_activation_v1';

	function badgeStyle(color: string | null | undefined): string {
		return badgeInlineStyleFromColor(daisyUiTokenToHex(color));
	}

	function elapsedLabel(activatedAt: string): string {
		const ms = parseUtcInstant(activatedAt);
		if (Number.isNaN(ms)) return '—';
		const mins = Math.max(0, Math.floor((clockTick - ms) / 60000));
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return h > 0 ? `${h}h ${m}m` : `${m}m`;
	}

	function chartUrl(path: string): string {
		if (!hospitalId || !visitId) return '#';
		const base = medoraHospitalPageUrl(hospitalId, path);
		return `${base}?visitId=${encodeURIComponent(visitId)}`;
	}

	async function loadTemplate() {
		if (!formApi) return;
		const res = await fetch(
			`${formApi}?mode=template&code=${encodeURIComponent(templateCode)}`
		);
		if (!res.ok) await throwUserFacingHttpError(res);
		const tpl = (await res.json()) as { schemaJson: ClinicalFormTemplateSchema };
		schema = tpl.schemaJson;
	}

	async function loadLevels() {
		const res = await fetch(`${traumaApi}?mode=levels`);
		if (!res.ok) await throwUserFacingHttpError(res);
		levels = (await res.json()) as TraumaActivationLevelRow[];
		if (!selectedLevelCode && levels[0]) {
			selectedLevelCode = levels[0].code;
		}
	}

	async function loadActive() {
		const res = await fetch(`${traumaApi}?mode=active`);
		if (!res.ok) await throwUserFacingHttpError(res);
		activeRows = (await res.json()) as TraumaActivationRichRow[];
	}

	async function loadHistory() {
		const res = await fetch(`${traumaApi}?mode=history&page=1&pageSize=50`);
		if (!res.ok) await throwUserFacingHttpError(res);
		const data = (await res.json()) as { rows: TraumaActivationRichRow[] };
		historyRows = data.rows;
	}

	async function loadDetail(id: number) {
		selectedActivationId = id;
		const res = await fetch(`${traumaApi}?mode=detail&id=${id}`);
		if (!res.ok) await throwUserFacingHttpError(res);
		detail = (await res.json()) as TraumaActivationDetailPayload;
	}

	async function loadVisitContext(opts?: {
		signal?: AbortSignal;
		isCancelled?: () => boolean;
	}) {
		if (!visitId) {
			visitContext = null;
			return;
		}
		const res = await fetch(`${traumaApi}?mode=visit_context&visitId=${encodeURIComponent(visitId)}`, { signal: opts?.signal });
		if (!res.ok) await throwUserFacingHttpError(res);
		visitContext = (await res.json()) as TraumaVisitContextRow;
		if (visitContext.activeActivationId != null) {
			await loadDetail(visitContext.activeActivationId);
		} else {
			detail = null;
			selectedActivationId = null;
		}
	}

	async function refreshAll() {
		if (!traumaApi) return;
		loading = true;
		try {
			await Promise.all([loadLevels(), loadActive(), loadHistory(), loadVisitContext()]);
		} finally {
			loading = false;
		}
	}

	async function openAssignBedDialog(): Promise<boolean> {
		if (!visitId) return false;
		const result = await dialogService.open({
			title: msg.ed_assign_er_bed_title(),
			component: LEdAssignErBedDialogContent,
			props: { visitId }
		});
		return result.confirmed;
	}

	async function postActivate(erBedId?: number) {
		if (!visitId || !traumaApi) return;
		const res = await fetch(traumaApi, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				action: 'activate',
				visitId,
				levelCode: selectedLevelCode,
				valuesJson: formValues,
				...(erBedId != null ? { erBedId } : {})
			})
		});
		if (await redirectIfTwoFactorRequired(res)) return;
		if (!res.ok) {
			const code = await readApiErrorCode(res);
			if (isErBedRequiredCode(code)) {
				const assigned = await openAssignBedDialog();
				if (assigned) await postActivate();
				return;
			}
			await throwUserFacingHttpError(res);
		}
		toastSuccess(toastService, msg.trauma_activate_success?.() ?? 'Trauma team activated');
		await refreshAll();
	}

	async function submitActivate() {
		if (!visitId || !edApi) return;
		submitting = true;
		try {
			const encRes = await fetch(edApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ action: 'ensure_encounter', visitId })
			});
			if (await redirectIfTwoFactorRequired(encRes)) return;
			if (!encRes.ok) await throwUserFacingHttpError(encRes);
			await postActivate();
		} finally {
			submitting = false;
		}
	}

	async function standDown() {
		if (selectedActivationId == null) return;
		const reason = standDownReason.trim();
		if (!reason) return;
		submitting = true;
		try {
			const res = await fetch(traumaApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action: 'deactivate',
					id: selectedActivationId,
					reason
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			standDownReason = '';
			toastSuccess(toastService, msg.trauma_stand_down_success?.() ?? 'Trauma stood down');
			await refreshAll();
		} finally {
			submitting = false;
		}
	}

	async function toggleMilestone(templateId: number) {
		if (selectedActivationId == null) return;
		await fetch(traumaApi, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				action: 'milestone_complete',
				activationId: selectedActivationId,
				templateId
			})
		});
		await loadDetail(selectedActivationId);
	}

	async function toggleTeamAck(roleId: number) {
		if (selectedActivationId == null) return;
		await fetch(traumaApi, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				action: 'team_ack',
				activationId: selectedActivationId,
				roleId,
				notified: true
			})
		});
		await loadDetail(selectedActivationId);
	}

	onMount(() => {
		void loadTemplate();
		void refreshAll();
		const interval = setInterval(() => {
			clockTick = Date.now();
		}, 30_000);
		const closeSse = connectPerioperativeSse({
			hospitalId: hospitalId ?? '',
			onEvent: () => void refreshAll()
		});
		return () => {
			clearInterval(interval);
			closeSse();
		};
	});

	$effect(() => {
		void visitId;
			let cancelled = false;
			const ac = new AbortController();
		void loadVisitContext({ signal: ac.signal, isCancelled: () => cancelled });
			return () => {
				cancelled = true;
				ac.abort();
			};
	});
</script>

<section
	class="trauma-command flex min-h-[28rem] flex-col gap-4 rounded-box border border-base-300 bg-gradient-to-b from-base-300/40 to-base-100 p-4 shadow-sm"
	aria-busy={loading}
>
	<header
		class="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 pb-3"
	>
		<div>
			<p class="text-xs font-semibold tracking-wide text-error uppercase">
				{msg.trauma_command_kicker?.() ?? 'Emergency resuscitation'}
			</p>
			<h1 class="text-xl font-bold text-base-content">
				{msg.ed_trauma_log_title()}
			</h1>
		</div>
		<div class="flex flex-wrap items-center gap-2 text-sm">
			<span class="badge badge-error badge-lg">
				{msg.trauma_active_count?.({ count: activeRows.length }) ??
					`${activeRows.length} active`}
			</span>
			<time class="font-mono text-base-content/70" datetime={new Date(clockTick).toISOString()}>
				{new Date(clockTick).toLocaleTimeString(undefined, {
					hour: '2-digit',
					minute: '2-digit'
				})}
			</time>
			<WashButton className="btn-ghost btn-sm cursor-pointer" onClick={() => void refreshAll()}>
				{msg.trauma_admin_refresh?.() ?? 'Refresh'}
			</WashButton>
		</div>
	</header>

	<div role="tablist" class="tabs tabs-boxed w-fit">
		<button
			type="button"
			role="tab"
			class="tab"
			class:tab-active={viewTab === 'command'}
			onclick={() => (viewTab = 'command')}
		>
			{msg.trauma_tab_command?.() ?? 'Command'}
		</button>
		<button
			type="button"
			role="tab"
			class="tab"
			class:tab-active={viewTab === 'history'}
			onclick={() => (viewTab = 'history')}
		>
			{msg.trauma_tab_history?.() ?? 'History'}
		</button>
	</div>

	{#if viewTab === 'history'}
		<div class="overflow-x-auto rounded-box border border-base-300">
			<table class="table table-sm">
				<thead>
					<tr>
						<th>{msg.ed_trauma_col_visit()}</th>
						<th>{msg.ed_trauma_col_level()}</th>
						<th>{msg.trauma_col_patient?.() ?? 'Patient'}</th>
						<th>{msg.ed_trauma_col_time()}</th>
						<th>{msg.trauma_col_reason?.() ?? 'Stand-down'}</th>
					</tr>
				</thead>
				<tbody>
					{#each historyRows as row (row.id)}
						<tr class="hover:bg-base-200">
							<td class="font-mono text-xs">{row.visitNo ?? row.visitId.slice(0, 8)}</td>
							<td
								><span class="badge badge-sm badge-outline" style={badgeStyle(row.levelColor)}
									>{row.levelCode}</span
								></td
							>
							<td>{row.patientName ?? '—'}</td>
							<td class="text-xs">{row.activatedAt?.slice(0, 16) ?? '—'}</td>
							<td class="max-w-xs truncate text-xs">{row.deactivateReason ?? '—'}</td>
						</tr>
					{:else}
						<tr>
							<td colspan="5" class="text-center text-sm opacity-60">{msg.trauma_table_empty?.() ?? 'No rows'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="grid gap-4 lg:grid-cols-2">
			<div class="flex flex-col gap-3" aria-label={msg.trauma_active_panel?.() ?? 'Active activations'}>
				<h2 class="text-sm font-semibold">{msg.trauma_active_panel?.() ?? 'Active activations'}</h2>
				{#each activeRows as row (row.id)}
					<article
						class="card border-base-300 bg-base-100 shadow-sm transition-[box-shadow,transform] hover:shadow-md motion-reduce:transition-none"
						class:ring-2={selectedActivationId === row.id}
						class:ring-primary={selectedActivationId === row.id}
					>
						<div class="card-body gap-2 p-4">
							<div class="flex items-start justify-between gap-2">
								<div>
									<span
										class="badge badge-sm badge-outline"
										style={badgeStyle(row.levelColor)}
										>{row.levelName ?? row.levelCode}</span
									>
									<p class="mt-1 font-semibold">{row.patientName ?? '—'}</p>
									<p class="font-mono text-xs opacity-70">
										{row.visitNo ?? row.visitId.slice(0, 8)}
									</p>
								</div>
								<span class="badge badge-outline font-mono">{elapsedLabel(row.activatedAt)}</span>
							</div>
							{#if row.erBedLabel}
								<p class="text-xs">{msg.trauma_er_bed?.() ?? 'ER bed'}: {row.erBedLabel}</p>
							{/if}
							<WashButton
								className="btn-sm btn-outline cursor-pointer"
								onClick={() => void loadDetail(row.id)}
							>
								{msg.trauma_open_detail?.() ?? 'Open detail'}
							</WashButton>
						</div>
					</article>
				{:else}
					<p class="text-sm opacity-70">{msg.trauma_no_active?.() ?? 'No active trauma activations.'}</p>
				{/each}
			</div>

			<div class="flex flex-col gap-4 rounded-box border border-base-300 bg-base-100 p-4">
				{#if detail && selectedActivationId != null}
					<h2 class="text-sm font-semibold">{msg.trauma_detail_title?.() ?? 'Activation detail'}</h2>
					<p class="text-xs opacity-70">{detail.activation.patientName} · {detail.activation.visitNo}</p>

					<h3 class="text-xs font-semibold uppercase opacity-60">
						{msg.trauma_milestones?.() ?? 'Milestones'}
					</h3>
					<ul class="flex flex-col gap-1">
						{#each detail.milestones as ms (ms.templateId)}
							<li>
								<label class="label cursor-pointer justify-start gap-2">
									<input
										type="checkbox"
										class="checkbox checkbox-sm checkbox-primary"
										checked={ms.completedAt != null}
										onchange={() => void toggleMilestone(ms.templateId)}
									/>
									<span class="label-text text-sm">{ms.label}</span>
								</label>
							</li>
						{/each}
					</ul>

					<h3 class="text-xs font-semibold uppercase opacity-60">
						{msg.trauma_team_ack?.() ?? 'Team acknowledgement'}
					</h3>
					<ul class="flex flex-col gap-1">
						{#each detail.teamAcks as ack (ack.roleId)}
							<li>
								<label class="label cursor-pointer justify-start gap-2">
									<input
										type="checkbox"
										class="checkbox checkbox-sm"
										checked={ack.acknowledgedAt != null}
										onchange={() => void toggleTeamAck(ack.roleId)}
									/>
									<span class="label-text text-sm">{ack.label}</span>
								</label>
							</li>
						{/each}
					</ul>

					<div class="flex flex-col gap-2 border-t border-base-300 pt-3">
						<label class="form-control" for="stand-down-reason">
							<span class="label-text text-xs">{msg.trauma_stand_down_reason?.() ?? 'Stand-down reason'}</span>
							<WashInputField id="stand-down-reason" bind:value={standDownReason} className="input-sm" />
						</label>
						<WashButton
							className="btn-error btn-sm cursor-pointer"
							loading={submitting}
							disabled={submitting}
							onClick={() => void standDown()}
						>
							{msg.trauma_stand_down?.() ?? 'Stand down trauma'}
						</WashButton>
					</div>
				{:else if visitId}
					<h2 class="text-sm font-semibold">{msg.trauma_new_activation?.() ?? 'New activation'}</h2>
					{#if visitContext}
						<p class="text-sm">
							{visitContext.patientName} · <span class="font-mono text-xs">{visitContext.visitNo}</span>
						</p>
					{/if}

					<label class="form-control" for="trauma-level-select">
						<span class="label-text text-xs">{msg.ed_trauma_level()}</span>
						<select
							id="trauma-level-select"
							class="select select-sm"
							bind:value={selectedLevelCode}
							disabled={submitting}
						>
							{#each levels as lvl (lvl.id)}
								<option value={lvl.code}>{lvl.code} — {lvl.name}</option>
							{/each}
						</select>
					</label>

					{#if schema}
						<ClinicalFormRenderer {schema} bind:values={formValues} />
					{/if}

					<WashButton
						className="btn-error cursor-pointer"
						loading={submitting}
						disabled={submitting || !selectedLevelCode}
						onClick={() => void submitActivate()}
					>
						{msg.ed_trauma_activate()}
					</WashButton>

					<div class="flex flex-wrap gap-2 border-t border-base-300 pt-3">
						<a class="btn btn-xs btn-ghost" href={chartUrl(WebRoutesEnum.MEDORA_HOME_NURSING_WORKBENCH_VITAL)}>
							{msg.trauma_link_vitals?.() ?? 'Vitals'}
						</a>
						<a class="btn btn-xs btn-ghost" href={chartUrl(WebRoutesEnum.MEDORA_HOME_NURSING_WORKBENCH_ORDER)}>
							{msg.trauma_link_orders?.() ?? 'Orders'}
						</a>
						<a
							class="btn btn-xs btn-ghost"
							href={medoraHospitalPageUrl(hospitalId, '/medora/home/consultation/emr') +
								`?visitId=${encodeURIComponent(visitId)}`}
						>
							{msg.trauma_link_emr?.() ?? 'EMR'}
						</a>
						<a
							class="btn btn-xs btn-ghost"
							href={chartUrl(WebRoutesEnum.MEDORA_HOME_NURSING_WORKBENCH_MLC_DOCUMENTATION)}
						>
							{msg.trauma_link_mlc?.() ?? 'MLC'}
						</a>
					</div>
				{:else}
					<p class="text-sm opacity-70">{msg.ed_trauma_visit_hint()}</p>
				{/if}
			</div>
		</div>
	{/if}
</section>

<style>
	@media (prefers-reduced-motion: reduce) {
		.trauma-command :global(.card) {
			transition: none;
		}
	}
</style>