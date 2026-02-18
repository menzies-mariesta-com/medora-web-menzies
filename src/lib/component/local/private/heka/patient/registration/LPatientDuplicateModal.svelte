<script lang="ts">
	import DaisyUiModal from '$lib/component/library/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTable from '$lib/component/library/daisyui/table/DaisyUiTable.svelte';
	import DaisyUiTableHeader from '$lib/component/library/daisyui/table/head/DaisyUiTableHeader.svelte';
	import DaisyUiTableBody from '$lib/component/library/daisyui/table/body/DaisyUiTableBody.svelte';
	import LucideX from '$lib/component/library/lucide/LucideX.svelte';
	import type { PatientWithRelations } from '$lib/remote/table/information-table/patient.remote';

	let {
		open,
		duplicates,
		onClose,
		onSelectPatient
	} = $props<{
		open: boolean;
		duplicates: PatientWithRelations[];
		onClose: () => void;
		onSelectPatient: (patient: PatientWithRelations) => void;
	}>();

	function fullName(p: PatientWithRelations): string {
		const title = (p as { title?: { name?: string } }).title?.name;
		const parts = [title, p.firstName, p.middleName, p.lastName].filter(Boolean);
		return parts.join(' ').trim() || '—';
	}

	function fatherNameWithTitle(p: PatientWithRelations): string {
		const fatherTitle = (p as { fatherTitle?: { name?: string } }).fatherTitle?.name;
		const name = (p as { fatherName?: string }).fatherName ?? '';
		const parts = [fatherTitle, name].filter(Boolean);
		return parts.join(' ').trim() || '—';
	}

	function identityTypeName(p: PatientWithRelations): string {
		return (p as { identityType?: { name?: string } }).identityType?.name ?? '—';
	}

	function handleSelect(p: PatientWithRelations) {
		onSelectPatient(p);
		onClose();
	}
</script>

{#if open}
	<DaisyUiModal
		groupName="patient-duplicate-modal"
		open={true}
		onClose={onClose}
		className="!max-w-4xl"
	>
		<div class="d-modal-box max-h-[85vh] flex flex-col gap-4" role="document">
			<div class="flex shrink-0 items-center justify-between border-b border-base-300 pb-3">
				<h2 class="text-lg font-semibold">Duplicate patients found</h2>
				<DaisyUiButton
					className="d-btn-ghost d-btn-sm d-btn-circle"
					onClick={onClose}
				>
					<LucideX className="size-5" />
				</DaisyUiButton>
			</div>
			<p class="text-sm text-base-content/70">
				The following patients match the entered details. Click a row to load that patient into the form.
			</p>
			<div class="min-h-0 flex-1 overflow-auto">
				<DaisyUiTable>
					<DaisyUiTableHeader>
						<tr>
							<th>Code</th>
							<th>Full name</th>
							<th>Father name</th>
							<th>Primary phone</th>
							<th>Identity type</th>
							<th>Identity no.</th>
						</tr>
					</DaisyUiTableHeader>
					<DaisyUiTableBody>
						{#each duplicates as p (p.id)}
							<tr
								role="button"
								tabindex="0"
								class="cursor-pointer hover:bg-base-200 focus:bg-base-200"
								onclick={() => handleSelect(p)}
								onkeydown={(e) => e.key === 'Enter' && handleSelect(p)}
							>
								<td>{p.code ?? '—'}</td>
								<td>{fullName(p)}</td>
								<td>{fatherNameWithTitle(p)}</td>
								<td>{p.phonePrimary ?? '—'}</td>
								<td>{identityTypeName(p)}</td>
								<td>{p.identityNo ?? '—'}</td>
							</tr>
						{/each}
					</DaisyUiTableBody>
				</DaisyUiTable>
			</div>
		</div>
	</DaisyUiModal>
{/if}
