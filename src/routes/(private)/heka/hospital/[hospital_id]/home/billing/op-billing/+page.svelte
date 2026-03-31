<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import { m } from '$lib/paraglide/messages';
	import { VisitState } from '$lib/state/visit.state.svelte';

	const visitId = $derived(VisitState.visitId);
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const msg = m as any;

	type BillingLine = {
		id: number;
		serviceId: number;
		serviceName: string | null;
		orderNo: string | null;
		subCategoryId: number | null;
		subCategoryName: string | null;
		serviceAmount: string | number | null;
		serviceTaxAmount: string | number | null;
		discount: string | number | null;
		serviceUnit: number | null;
	};

	type BillingGroup = {
		subCategoryId: number | null;
		subCategoryName: string;
		lines: BillingLine[];
		subtotal: number;
	};

	let isLoading = $state(false);
	let loadError = $state('');
	let groups = $state<BillingGroup[]>([]);
	let grandTotal = $state(0);

	function lineTotal(line: BillingLine): number {
		const amount = Number(line.serviceAmount ?? 0) || 0;
		const tax = Number(line.serviceTaxAmount ?? 0) || 0;
		const discount = Number(line.discount ?? 0) || 0;
		const unit = line.serviceUnit && line.serviceUnit > 0 ? line.serviceUnit : 1;
		return (amount + tax - discount) * unit;
	}

	function groupLines(lines: BillingLine[]): BillingGroup[] {
		const byKey = new Map<string, BillingGroup>();

		for (const line of lines) {
			const key = String(line.subCategoryId ?? 'none');
			const name = (line.subCategoryName ?? 'Other').trim() || 'Other';
			let group = byKey.get(key);
			if (!group) {
				group = {
					subCategoryId: line.subCategoryId,
					subCategoryName: name,
					lines: [],
					subtotal: 0
				};
				byKey.set(key, group);
			}
			group.lines.push(line);
			group.subtotal += lineTotal(line);
		}

		return Array.from(byKey.values()).sort((a, b) =>
			a.subCategoryName.localeCompare(b.subCategoryName)
		);
	}

	async function loadBillingLines(currentVisitId: string | null) {
		if (!currentVisitId) {
			groups = [];
			grandTotal = 0;
			loadError = '';
			return;
		}

		const visitNumeric = Number(currentVisitId);
		if (!visitNumeric || !Number.isFinite(visitNumeric) || visitNumeric <= 0) {
			groups = [];
			grandTotal = 0;
			loadError = '';
			return;
		}

		isLoading = true;
		loadError = '';
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/billing/op-billing/visit-lines?visitId=${visitNumeric}`
			);
			if (!res.ok) {
				groups = [];
				grandTotal = 0;
				loadError = 'Failed to load billing lines.';
				return;
			}
			const data = (await res.json()) as { items?: BillingLine[] };
			const lines = (data.items ?? []).map((row) => ({
				...row
			}));
			const grouped = groupLines(lines);
			groups = grouped;
			grandTotal = grouped.reduce((sum, g) => sum + g.subtotal, 0);
		} catch (err) {
			console.error(err);
			groups = [];
			grandTotal = 0;
			loadError = 'Failed to load billing lines.';
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		void loadBillingLines(visitId);
	});
</script>

<DaisyUiCard>
	<DaisyUiCardBody className="gap-4">
		<DaisyUiCardBodyTitle>{msg.op_billing_title()}</DaisyUiCardBodyTitle>
		{#if !visitId}
			<p class="text-sm text-base-content/70">
				{msg.op_billing_select_visit_hint()}
			</p>
		{:else}
			<div class="mt-2 space-y-3">
				{#if loadError}
					<p class="text-sm text-error">{loadError}</p>
				{:else if isLoading}
					<p class="text-sm text-base-content/60">Loading billing lines…</p>
				{:else if groups.length === 0}
					<p class="text-sm text-base-content/60">
						No billable services found for this visit.
					</p>
				{:else}
					<div class="flex items-center justify-between text-sm font-semibold">
						<span>Total bill</span>
						<span class="font-mono">
							{grandTotal.toFixed(2)}
						</span>
					</div>

					<div class="divide-y divide-base-300 rounded-box border border-base-300">
						{#each groups as group (group.subCategoryId ?? group.subCategoryName)}
							<div class="d-collapse d-collapse-arrow bg-base-100">
								<input type="checkbox" checked />
								<div class="d-collapse-title flex items-center justify-between gap-4 text-sm font-medium">
									<span class="truncate">{group.subCategoryName}</span>
									<span class="font-mono text-base-content/80">
										{group.subtotal.toFixed(2)}
									</span>
								</div>
								<div class="d-collapse-content">
									<ul class="space-y-1 text-sm">
										{#each group.lines as line (line.id)}
											<li class="flex items-center justify-between gap-3 rounded-box bg-base-200/40 px-3 py-1.5">
												<div class="min-w-0">
													<p class="truncate font-medium">
														{line.serviceName ?? 'Service'}
													</p>
													<p class="text-xs text-base-content/60">
														{#if line.orderNo}
															Order: {line.orderNo}
														{/if}
													</p>
												</div>
												<div class="text-right text-sm font-mono">
													{lineTotal(line).toFixed(2)}
												</div>
											</li>
										{/each}
									</ul>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</DaisyUiCardBody>
</DaisyUiCard>

