<script lang="ts">
	import { parseUuid } from '$lib/util/id.util';
	import type { Snippet } from 'svelte';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { loadVisitBarVisitType } from '$lib/tool/medora/visit-bar-phase.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;

	type GatePhase =
		| { kind: 'no_visit' }
		| { kind: 'loading' }
		| { kind: 'ready'; visitTypeId: number | null }
		| { kind: 'error'; message: string };

	let {
		hospitalId = '',
		visitId = '',
		requiredVisitTypeId,
		message = '',
		children
	}: {
		hospitalId?: string;
		visitId?: string;
		requiredVisitTypeId: number;
		message?: string;
		children?: Snippet;
	} = $props();

	let phase = $state<GatePhase>({ kind: 'no_visit' });
	let retryNonce = $state(0);

	const mayRenderChildren = $derived(
		phase.kind === 'no_visit' ||
			(phase.kind === 'ready' &&
				phase.visitTypeId === requiredVisitTypeId)
	);

	function onRetry() {
		retryNonce += 1;
	}

	$effect(() => {
		const id = parseUuid(visitId) ?? '';
		const hid =
			typeof hospitalId === 'string' && hospitalId.trim() !== ''
				? hospitalId.trim()
				: '';
		void retryNonce;
		if (!id || !hid) {
			phase = { kind: 'no_visit' };
			return;
		}
		let cancelled = false;
		const ac = new AbortController();
		phase = { kind: 'loading' };
		(async () => {
			const result = await loadVisitBarVisitType(hid, id, {
				signal: ac.signal
			});
			if (cancelled) return;
			if (!result.ok) {
				phase = { kind: 'error', message: result.message };
				return;
			}
			phase = { kind: 'ready', visitTypeId: result.visitTypeId };
		})();
		return () => {
			cancelled = true;
			ac.abort();
		};
	});
</script>

{#if phase.kind === 'loading'}
	<div class="mb-3 flex items-center gap-2 text-sm opacity-70">
		<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
		<span>{msg.loading?.() ?? 'Loading…'}</span>
	</div>
{:else if phase.kind === 'error'}
	<div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start">
		<WashAlert
			type={StatusColorEnum.ERROR}
			message={msg.visit_gate_load_error?.() ??
				'Could not load visit information.'}
			detail={phase.message}
			className="z-0 min-w-0 flex-1"
		/>
		<WashButton type="button" tone="secondary" size="sm" onclick={onRetry}>
			{msg.visit_gate_retry?.() ?? 'Retry'}
		</WashButton>
	</div>
{:else if phase.kind === 'ready' && phase.visitTypeId !== requiredVisitTypeId}
	<WashAlert
		type={StatusColorEnum.WARNING}
		{message}
		className="mb-3 z-0"
	/>
{:else if mayRenderChildren}
	{#if children}
		{@render children()}
	{/if}
{/if}