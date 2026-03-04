<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { PatientDuplicateModalState } from '$lib/state/patient-duplicate-modal.state.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTable from '$lib/component/library/daisyui/table/DaisyUiTable.svelte';
	import DaisyUiTableHeader from '$lib/component/library/daisyui/table/head/DaisyUiTableHeader.svelte';
	import DaisyUiTableBody from '$lib/component/library/daisyui/table/body/DaisyUiTableBody.svelte';
	import LucideX from '$lib/component/library/lucide/LucideX.svelte';
	import type { PatientWithRelations } from '$lib/remote/table/information-table/patient.remote';

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
	<div
		class="flex shrink-0 items-center justify-between border-b border-base-300 px-4 py-2"
	>
		<h2 class="text-lg font-semibold">Duplicate patients found</h2>
		<DaisyUiButton
			className="d-btn-ghost d-btn-sm d-btn-circle"
			onClick={() => cancel()}
		>
			<LucideX className="size-5" />
		</DaisyUiButton>
	</div>
	<div class="p-4">
		<p class="pb-4 text-sm text-base-content/70">
			The following patients match the entered details. Click a row to
			load that patient into the form.
		</p>
		<div class="min-h-0 flex-1 overflow-auto">
			<DaisyUiTable className="d-table d-table-zebra d-table-sm">
				<DaisyUiTableHeader>
					<tr class="sticky top-0 z-3 bg-base-200">
						<th class="w-32 min-w-[8rem]">Code</th>
						<th class="w-64 min-w-[16rem]">Full name</th>
						<th class="w-48 min-w-[12rem]">Father name</th>
						<th class="w-40 min-w-[10rem]">Primary phone</th>
						<th class="w-36 min-w-[9rem]">Identity type</th>
						<th class="w-40 min-w-[10rem]">Identity no.</th>
					</tr>
				</DaisyUiTableHeader>
				<DaisyUiTableBody>
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
				</DaisyUiTableBody>
			</DaisyUiTable>
		</div>
	</div>
</div>
