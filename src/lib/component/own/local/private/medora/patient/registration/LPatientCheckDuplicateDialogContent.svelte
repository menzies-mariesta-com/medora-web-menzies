<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { PatientDuplicateModalState } from '$lib/state/patient-duplicate-modal.state.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTable from '$lib/component/wash/table/WashTable.svelte';
	import WashTableHeader from '$lib/component/wash/table/head/WashTableHeader.svelte';
	import WashTableBody from '$lib/component/wash/table/body/WashTableBody.svelte';
	import type { PatientWithRelations } from '$lib/model/type/medora/patient.type';

	let { confirm, cancel }: DialogSlotProps = $props();

	const duplicates = $derived(PatientDuplicateModalState.duplicates);

	function fullName(p: PatientWithRelations): string {
		const title = (p as { title?: { name?: string } }).title?.name;
		const parts = [
			title,
			p.firstName,
			p.middleName,
			p.lastName
		].filter(Boolean);
		return parts.join(' ').trim() || '—';
	}

	function fatherNameWithTitle(p: PatientWithRelations): string {
		const fatherTitle = (p as { fatherTitle?: { name?: string } })
			.fatherTitle?.name;
		const name = (p as { fatherName?: string }).fatherName ?? '';
		const parts = [fatherTitle, name].filter(Boolean);
		return parts.join(' ').trim() || '—';
	}

	function identityTypeName(p: PatientWithRelations): string {
		return (
			(p as { identityType?: { name?: string } }).identityType
				?.name ?? '—'
		);
	}

	function handleSelect(p: PatientWithRelations) {
		confirm(p);
	}
</script>

<div class="flex h-full min-h-0 flex-col overflow-hidden">
	<div class="min-h-0 flex-1 overflow-auto p-4">
		<p class="pb-4 text-sm text-ink-muted">
			The following patients match the entered details. Click a row to
			load that patient into the form.
		</p>
		<WashTable className="table table-zebra table-sm">
			<WashTableHeader>
				<tr class="sticky top-0 z-3 bg-base-200">
					<th class="w-32 min-w-[8rem]">Code</th>
					<th class="w-64 min-w-[16rem]">Full name</th>
					<th class="w-48 min-w-[12rem]">Father name</th>
					<th class="w-40 min-w-[10rem]">Primary phone</th>
					<th class="w-36 min-w-[9rem]">Identity type</th>
					<th class="w-40 min-w-[10rem]">Identity no.</th>
				</tr>
			</WashTableHeader>
			<WashTableBody>
				{#each duplicates as p (p.id)}
					<tr
						role="button"
						tabindex="0"
						class="z-0 cursor-pointer hover:bg-info/30"
						onclick={() => handleSelect(p)}
						onkeydown={(e) => e.key === 'Enter' && handleSelect(p)}
					>
						<td class="w-32 min-w-[8rem]">{p.code ?? '—'}</td>
						<td class="w-64 min-w-[16rem]">{fullName(p)}</td>
						<td class="w-48 min-w-[12rem]"
							>{fatherNameWithTitle(p)}</td
						>
						<td class="w-40 min-w-[10rem]"
							>{p.phonePrimary ?? '—'}</td
						>
						<td class="w-36 min-w-[9rem]">{identityTypeName(p)}</td>
						<td class="w-40 min-w-[10rem]">{p.identityNo ?? '—'}</td
						>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="text-center opacity-70">
							No duplicate patients.
						</td>
					</tr>
				{/each}
			</WashTableBody>
		</WashTable>
	</div>
	<div class="modal-action shrink-0 border-t border-base-300 px-4 py-3">
		<WashButton variant="ghost" onClick={() => cancel()}>Close</WashButton>
	</div>
</div>
