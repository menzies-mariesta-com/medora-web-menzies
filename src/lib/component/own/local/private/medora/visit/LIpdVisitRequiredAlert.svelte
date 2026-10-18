<script lang="ts">
	import { parseUuid } from '$lib/util/id.util';
	/**
	 * When the selected visit is not IPD, shows only a warning alert (no children).
	 * Keep the visit bar outside this component so the user can pick another visit.
	 */
	import type { Snippet } from 'svelte';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { VisitTypeEnum } from '$lib/model/enum/db-link';

	let {
		hospitalId = '',
		visitId = '',
		message = 'This screen is for IPD visits only. Select an IPD visit, or open an OPD workflow for this patient.',
		children
	}: {
		hospitalId?: string;
		visitId?: string;
		message?: string;
		children?: Snippet;
	} = $props();

	let visitTypeId = $state<number | null>(null);
	let isLoading = $state(false);

	const isNonIpdVisit = $derived(
		!!visitId &&
			!isLoading &&
			visitTypeId != null &&
			visitTypeId !== VisitTypeEnum.IPD
	);

	$effect(() => {
		const id = parseUuid(visitId) ?? '';
		const hid =
			typeof hospitalId === 'string' && hospitalId.trim() !== ''
				? hospitalId.trim()
				: '';
		if (!id || !Number.isFinite(id) || id <= 0 || !hid) {
			visitTypeId = null;
			isLoading = false;
			return;
		}
		let cancelled = false;
		(async () => {
			isLoading = true;
			try {
				const qs = new URLSearchParams({
					mode: 'visit.bar',
					visitId: String(id)
				});
				const res = await fetch(
					`/api/medora/hospital/${encodeURIComponent(hid)}/home/emr/visit-list?${qs}`
				);
				if (!res.ok) throw new Error('visit bar failed');
				const pack = (await res.json()) as {
					visit?: {
						visitTypeId?: number | null;
						visitType?: { id?: number } | null;
					};
				};
				if (cancelled) return;
				const fromRel = pack.visit?.visitType?.id;
				const fromCol = pack.visit?.visitTypeId;
				visitTypeId =
					typeof fromRel === 'number'
						? fromRel
						: typeof fromCol === 'number'
							? fromCol
							: null;
			} catch {
				if (!cancelled) visitTypeId = null;
			} finally {
				if (!cancelled) isLoading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});
</script>

{#if isNonIpdVisit}
	<WashAlert
		type={StatusColorEnum.WARNING}
		{message}
		className="mb-3 z-0"
	/>
{:else}
	{@render children?.()}
{/if}
