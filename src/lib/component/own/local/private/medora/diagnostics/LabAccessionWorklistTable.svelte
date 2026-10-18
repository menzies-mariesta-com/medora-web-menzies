<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import type { LabAccessionListRow } from '$lib/model/type/medora/diagnostics.type';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;

	let {
		rows = [],
		busy = false,
		onCollect,
		onReceive,
		onStartProcessing,
		onOpenResults,
		mode = 'collection' as 'collection' | 'receive' | 'bench'
	}: {
		rows: LabAccessionListRow[];
		busy?: boolean;
		onCollect?: (id: number) => void | Promise<void>;
		onReceive?: (id: number) => void | Promise<void>;
		onStartProcessing?: (id: number) => void | Promise<void>;
		onOpenResults?: (id: number) => void;
		mode?: 'collection' | 'receive' | 'bench';
	} = $props();
</script>

<div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-box border border-base-300">
	<div class="overflow-auto">
		<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
			<thead class="sticky top-0 z-10 bg-base-200">
				<tr>
					<th>{msg.diagnostics_col_accession()}</th>
					<th>{msg.diagnostics_col_patient()}</th>
					<th>{msg.diagnostics_col_visit()}</th>
					<th>{msg.diagnostics_col_service()}</th>
					<th>{msg.diagnostics_col_status()}</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row, i (row.id)}
					<tr>
						<td>{row.accessionNo}</td>
						<td>{row.patientName}</td>
						<td>{row.visitNo ?? '–'}</td>
						<td>{row.serviceName ?? '–'}</td>
						<td><span class="badge badge-ghost badge-sm">{row.accessionStatus}</span></td>
						<td>
							<div class="flex flex-wrap gap-1">
								{#if mode === 'collection' && onCollect}
									<WashButton
										type="button"
										className="btn-primary btn-xs cursor-pointer"
										loading={busy}
										disabled={busy}
										onClick={() => onCollect(row.id)}
									>
										{msg.diagnostics_collect()}
									</WashButton>
								{/if}
								{#if mode === 'receive' && onReceive}
									<WashButton
										type="button"
										className="btn-primary btn-xs cursor-pointer"
										loading={busy}
										disabled={busy}
										onClick={() => onReceive(row.id)}
									>
										{msg.diagnostics_receive()}
									</WashButton>
								{/if}
								{#if mode === 'bench'}
									{#if onStartProcessing}
										<WashButton
											type="button"
											className="btn-secondary btn-xs cursor-pointer"
											loading={busy}
											disabled={busy}
											onClick={() => onStartProcessing(row.id)}
										>
											{msg.diagnostics_start_processing()}
										</WashButton>
									{/if}
									{#if onOpenResults}
										<WashButton
											type="button"
											className="btn-primary btn-xs cursor-pointer"
											onClick={() => onOpenResults(row.id)}
										>
											{msg.diagnostics_open_results()}
										</WashButton>
									{/if}
								{/if}
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="text-center text-sm opacity-70">–</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
