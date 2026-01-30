<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { SimpleCrud } from '$lib/server/db/schema';
	import {
		getSimpleCrudById,
		updateSimpleCrud,
		deleteSimpleCrud
	} from '$lib/remote/table/simple-crud.remote';

	let id = $derived(page.params?.id ?? '');
	let item = $state<SimpleCrud | null | undefined>(undefined);
	let editName = $state('');
	let editDescription = $state('');
	let submitting = $state(false);
	let deleteModalOpen = $state(false);

	$effect(() => {
		const currentId = page.params?.id ?? '';
		if (!currentId) {
			item = null;
			return;
		}
		getSimpleCrudById({ id: currentId }).then((result) => {
			item = result;
		});
	});

	$effect(() => {
		if (item && item !== null) {
			editName = item.name ?? '';
			editDescription = item.description ?? '';
		}
	});

	async function handleUpdate(e: Event) {
		e.preventDefault();
		if (!id || submitting) return;
		submitting = true;
		try {
			await updateSimpleCrud({
				id,
				name: editName.trim() || undefined,
				description: editDescription.trim() || null
			});
		} finally {
			submitting = false;
		}
	}

	async function handleDelete() {
		if (!id || submitting) return;
		submitting = true;
		try {
			await deleteSimpleCrud({ id });
			await goto('/demo/crud');
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>{item && item !== null ? item.name : 'Item'} — Simple CRUD</title>
</svelte:head>

{#if item === undefined}
	<div class="detail-page">
		<p>Loading…</p>
		<a href="/demo/crud" class="back-link">← Back to list</a>
	</div>
{:else if item === null}
	<div class="detail-page">
		<p>Item not found.</p>
		<a href="/demo/crud" class="back-link">← Back to list</a>
	</div>
{:else if item}
	<div class="detail-page">
		<a href="/demo/crud" class="back-link">← Back to list</a>

		<div class="detail-card">
			<h1 class="detail-title">{item.name}</h1>
			<dl class="detail-meta">
				<dt>ID</dt>
				<dd class="detail-id">{item.id}</dd>
				<dt>Created</dt>
				<dd>{item.createdAt}</dd>
				<dt>Updated</dt>
				<dd>{item.updatedAt}</dd>
			</dl>
			{#if item.description}
				<div class="detail-description">
					<h2>Description</h2>
					<p>{item.description}</p>
				</div>
			{/if}
		</div>

		<div class="detail-card">
			<h2 class="detail-subtitle">Edit</h2>
			<form onsubmit={handleUpdate} class="detail-form">
				<div class="detail-field">
					<label for="edit-name">Name</label>
					<input
						id="edit-name"
						type="text"
						bind:value={editName}
						placeholder="Item name"
						required
					/>
				</div>
				<div class="detail-field">
					<label for="edit-desc">Description</label>
					<textarea
						id="edit-desc"
						bind:value={editDescription}
						placeholder="Optional description"
						rows="3"
					></textarea>
				</div>
				<button type="submit" class="btn-primary" disabled={submitting}>
					{submitting ? 'Saving…' : 'Save'}
				</button>
			</form>
		</div>

		<div class="detail-actions">
			<button
				type="button"
				class="btn-danger"
				disabled={submitting}
				onclick={() => (deleteModalOpen = true)}
			>
				Delete item
			</button>
		</div>
	</div>

	<!-- Delete confirm modal -->
	<div class="modal-overlay" class:open={deleteModalOpen} role="dialog" aria-modal="true">
		<div class="modal-backdrop" onclick={() => (deleteModalOpen = false)}></div>
		<div class="modal-box">
			<button type="button" class="modal-close" onclick={() => (deleteModalOpen = false)} aria-label="Close">×</button>
			<h3 class="modal-title">Delete item?</h3>
			<p class="modal-text">This cannot be undone.</p>
			<div class="modal-actions">
				<button type="button" onclick={() => (deleteModalOpen = false)}>Cancel</button>
				<button type="button" class="modal-delete-btn" disabled={submitting} onclick={handleDelete}>
					{submitting ? 'Deleting…' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.detail-page {
		max-width: 42rem;
		margin: 0 auto;
		padding: 1.5rem;
	}
	.back-link {
		display: inline-block;
		margin-bottom: 1rem;
		color: #3b82f6;
		text-decoration: none;
		font-size: 0.875rem;
	}
	.back-link:hover {
		text-decoration: underline;
	}
	.detail-card {
		background: #fff;
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		padding: 1.5rem;
		margin-bottom: 1rem;
	}
	.detail-title {
		margin: 0 0 1rem;
		font-size: 1.5rem;
		font-weight: 700;
	}
	.detail-subtitle {
		margin: 0 0 1rem;
		font-size: 1.125rem;
		font-weight: 600;
	}
	.detail-meta {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.25rem 1.5rem;
		margin: 0 0 1rem;
		font-size: 0.875rem;
	}
	.detail-meta dt {
		color: #6b7280;
	}
	.detail-id {
		word-break: break-all;
		font-family: monospace;
		font-size: 0.75rem;
	}
	.detail-description {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
	}
	.detail-description h2 {
		margin: 0 0 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: #6b7280;
	}
	.detail-description p {
		margin: 0;
		white-space: pre-wrap;
	}
	.detail-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.detail-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.detail-field label {
		font-size: 0.875rem;
		font-weight: 500;
	}
	.detail-field input,
	.detail-field textarea {
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 1rem;
	}
	.detail-field input:focus,
	.detail-field textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
	}
	.detail-field textarea {
		resize: vertical;
		min-height: 4rem;
	}
	.btn-primary {
		padding: 0.5rem 1rem;
		background: #3b82f6;
		color: #fff;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		align-self: flex-start;
	}
	.btn-primary:hover:not(:disabled) {
		background: #2563eb;
	}
	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.detail-actions {
		margin-top: 1rem;
	}
	.btn-danger {
		padding: 0.5rem 1rem;
		background: #dc2626;
		color: #fff;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}
	.btn-danger:hover:not(:disabled) {
		background: #b91c1c;
	}
	.btn-danger:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	/* Modal (same as list page) */
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
	.modal-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
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
	.modal-actions button.modal-delete-btn {
		background: #dc2626;
		color: #fff;
		border-color: #dc2626;
	}
	.modal-actions button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
