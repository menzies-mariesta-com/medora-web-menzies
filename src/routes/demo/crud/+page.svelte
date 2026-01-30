<script lang="ts">
	import {
		getSimpleCrud,
		createSimpleCrud,
		updateSimpleCrud,
		deleteSimpleCrud
	} from '$lib/remote/table/simple-crud.remote';
	import type { SimpleCrud } from '$lib/server/db/schema';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiTable from '$lib/component/library/daisyui/table/DaisyUiTable.svelte';
	import DaisyUiTableHeader from '$lib/component/library/daisyui/table/head/DaisyUiTableHeader.svelte';
	import DaisyUiTableBody from '$lib/component/library/daisyui/table/body/DaisyUiTableBody.svelte';

	let createName = $state('');
	let createDescription = $state('');
	let createModalOpen = $state(false);
	let editingItem = $state<SimpleCrud | null>(null);
	let editName = $state('');
	let editDescription = $state('');
	let editModalOpen = $state(false);
	let deleteId = $state<string | null>(null);
	let deleteModalOpen = $state(false);
	let submitting = $state(false);

	async function handleCreate(e: Event) {
		e.preventDefault();
		if (submitting || !createName.trim()) return;
		submitting = true;
		try {
			await createSimpleCrud({ name: createName.trim(), description: createDescription.trim() || null });
			createName = '';
			createDescription = '';
			createModalOpen = false;
		} finally {
			submitting = false;
		}
	}

	function openEdit(item: SimpleCrud) {
		editingItem = item;
		editName = item.name ?? '';
		editDescription = item.description ?? '';
		editModalOpen = true;
	}

	async function handleUpdate(e: Event) {
		e.preventDefault();
		if (!editingItem || submitting) return;
		submitting = true;
		try {
			await updateSimpleCrud({
				id: editingItem.id,
				name: editName.trim() || undefined,
				description: editDescription.trim() || null
			});
			editingItem = null;
			editModalOpen = false;
		} finally {
			submitting = false;
		}
	}

	async function handleDelete(id: string) {
		if (submitting) return;
		submitting = true;
		try {
			await deleteSimpleCrud({ id });
			deleteId = null;
			deleteModalOpen = false;
		} finally {
			submitting = false;
		}
	}

	function openDelete(id: string) {
		deleteId = id;
		deleteModalOpen = true;
	}

	function closeDeleteModal() {
		deleteId = null;
		deleteModalOpen = false;
	}
</script>

<svelte:head>
	<title>Simple CRUD</title>
</svelte:head>

<div class="p-4 max-w-4xl mx-auto">
	<DaisyUiCard>
		<DaisyUiCardBody>
			<div class="flex flex-wrap items-center justify-between gap-4 mb-4">
				<DaisyUiCardBodyTitle>
					{#snippet children()}
						Simple CRUD
					{/snippet}
				</DaisyUiCardBodyTitle>
				<button type="button" class="d-btn d-btn-primary d-btn-sm" onclick={() => (createModalOpen = true)}
					>Add item</button
				>
			</div>

			<div class="overflow-x-auto">
				<DaisyUiTable effect="zebra">
					{#snippet children()}
						<DaisyUiTableHeader>
							{#snippet children()}
								<tr>
									<th>Name</th>
									<th>Description</th>
									<th>Updated</th>
									<th class="text-right">Actions</th>
								</tr>
							{/snippet}
						</DaisyUiTableHeader>
						<DaisyUiTableBody>
							{#snippet children()}
								{#each await getSimpleCrud() as item (item.id)}
									<tr>
										<td class="font-medium">
											<a href="/demo/crud/{item.id}" class="row-link">{item.name}</a>
										</td>
										<td class="text-base-content/70 max-w-xs truncate">
											{item.description ?? '—'}
										</td>
										<td class="text-sm text-base-content/60">
											{item.updatedAt ?? item.createdAt}
										</td>
										<td class="text-right">
											<div class="flex justify-end gap-1">
												<button
													type="button"
													class="d-btn d-btn-ghost d-btn-sm"
													onclick={() => openEdit(item)}
												>
													Edit
												</button>
												<button
													type="button"
													class="d-btn d-btn-ghost d-btn-sm d-btn-error"
													onclick={() => openDelete(item.id)}
												>
													Delete
												</button>
											</div>
										</td>
									</tr>
								{/each}
							{/snippet}
						</DaisyUiTableBody>
					{/snippet}
				</DaisyUiTable>
			</div>
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>

<!-- Plain HTML/CSS modals -->
<div class="modal-overlay" class:open={createModalOpen} role="dialog" aria-modal="true" aria-labelledby="create-modal-title">
	<div class="modal-backdrop" onclick={() => (createModalOpen = false)}></div>
	<div class="modal-box">
		<button type="button" class="modal-close" onclick={() => (createModalOpen = false)} aria-label="Close">×</button>
		<h3 id="create-modal-title" class="modal-title">Add item</h3>
		<form onsubmit={handleCreate} class="modal-form">
			<div class="modal-field">
				<label for="create-name">Name</label>
				<input
					id="create-name"
					type="text"
					bind:value={createName}
					placeholder="Item name"
					required
				/>
			</div>
			<div class="modal-field">
				<label for="create-desc">Description</label>
				<textarea
					id="create-desc"
					bind:value={createDescription}
					placeholder="Optional description"
					rows="3"
				></textarea>
			</div>
			<div class="modal-actions">
				<button type="button" onclick={() => (createModalOpen = false)}>Cancel</button>
				<button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
			</div>
		</form>
	</div>
</div>

<div class="modal-overlay" class:open={editModalOpen} role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
	<div class="modal-backdrop" onclick={() => (editModalOpen = false)}></div>
	<div class="modal-box">
		<button type="button" class="modal-close" onclick={() => (editModalOpen = false)} aria-label="Close">×</button>
		{#if editingItem}
			<h3 id="edit-modal-title" class="modal-title">Edit item</h3>
			<form onsubmit={handleUpdate} class="modal-form">
				<div class="modal-field">
					<label for="edit-name">Name</label>
					<input
						id="edit-name"
						type="text"
						bind:value={editName}
						placeholder="Item name"
						required
					/>
				</div>
				<div class="modal-field">
					<label for="edit-desc">Description</label>
					<textarea
						id="edit-desc"
						bind:value={editDescription}
						placeholder="Optional description"
						rows="3"
					></textarea>
				</div>
				<div class="modal-actions">
					<button type="button" onclick={() => (editModalOpen = false)}>Cancel</button>
					<button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Update'}</button>
				</div>
			</form>
		{/if}
	</div>
</div>

<div class="modal-overlay" class:open={deleteModalOpen} role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
	<div class="modal-backdrop" onclick={closeDeleteModal}></div>
	<div class="modal-box">
		<button type="button" class="modal-close" onclick={closeDeleteModal} aria-label="Close">×</button>
		<h3 id="delete-modal-title" class="modal-title">Delete item?</h3>
		<p class="modal-text">This cannot be undone.</p>
		<div class="modal-actions">
			<button type="button" onclick={closeDeleteModal}>Cancel</button>
			<button
				type="button"
				class="modal-delete-btn"
				disabled={submitting || !deleteId}
				onclick={() => deleteId && handleDelete(deleteId)}
			>
				{submitting ? 'Deleting…' : 'Delete'}
			</button>
		</div>
	</div>
</div>

<style>
	.row-link {
		color: #3b82f6;
		text-decoration: none;
		font-weight: 500;
	}
	.row-link:hover {
		text-decoration: underline;
	}
	.modal-overlay {
		position: fixed;
		inset: 0;
		display: none;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}
	.modal-overlay.open {
		display: flex;
	}
	.modal-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		cursor: pointer;
	}
	.modal-box {
		position: relative;
		background: #fff;
		padding: 1.5rem;
		border-radius: 0.5rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		min-width: 320px;
		max-width: 90vw;
	}
	.modal-close {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		line-height: 1;
		padding: 0.25rem;
		opacity: 0.7;
	}
	.modal-close:hover {
		opacity: 1;
	}
	.modal-title {
		margin: 0 0 1rem;
		font-size: 1.125rem;
		font-weight: 700;
	}
	.modal-text {
		margin: 0 0 1rem;
		color: #6b7280;
	}
	.modal-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.modal-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.modal-field label {
		font-size: 0.875rem;
		font-weight: 500;
	}
	.modal-field input,
	.modal-field textarea {
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 1rem;
	}
	.modal-field input:focus,
	.modal-field textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
	}
	.modal-field textarea {
		resize: vertical;
		min-height: 4rem;
	}
	.modal-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 0.5rem;
	}
	.modal-actions button {
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid #d1d5db;
		background: #fff;
	}
	.modal-actions button:hover:not(:disabled) {
		background: #f3f4f6;
	}
	.modal-actions button[type="submit"]:not(.modal-delete-btn) {
		background: #3b82f6;
		color: #fff;
		border-color: #3b82f6;
	}
	.modal-actions button[type="submit"]:not(.modal-delete-btn):hover:not(:disabled) {
		background: #2563eb;
	}
	.modal-delete-btn {
		background: #dc2626 !important;
		color: #fff !important;
		border-color: #dc2626 !important;
	}
	.modal-delete-btn:hover:not(:disabled) {
		background: #b91c1c !important;
	}
	.modal-actions button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
