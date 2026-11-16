<script lang="ts">
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import type { WashSelectOption } from '$lib/component/wash/select/WashSelect.svelte';
	import type { DocumentPrintOptionRow } from '$lib/model/type/medora/document-print.type';
	import {
		fetchPrintOptions,
		loadStoredPrintDocumentId,
		storePrintDocumentId
	} from '$lib/util/document-master-print.util.svelte';

	let {
		hospitalId,
		documentTypeId,
		selectedDocumentId = $bindable<number | null>(null),
		className = ''
	}: {
		hospitalId: string;
		documentTypeId: number;
		selectedDocumentId?: number | null;
		className?: string;
	} = $props();

	let options = $state<DocumentPrintOptionRow[]>([]);
	let loaded = $state(false);
	let washValue = $state('');

	const washOptions = $derived.by((): WashSelectOption[] =>
		options.map((opt) => ({
			value: String(opt.documentId),
			label:
				opt.documentNumber ?? opt.code ?? `Document ${opt.documentId}`
		}))
	);

	$effect(() => {
		if (!hospitalId || !documentTypeId) return;
		loaded = false;
		void fetchPrintOptions(hospitalId, documentTypeId)
			.then((res) => {
				options = res.options ?? [];
				const stored = loadStoredPrintDocumentId(
					hospitalId,
					documentTypeId
				);
				const pick =
					stored != null && options.some((o) => o.documentId === stored)
						? stored
						: res.defaultDocumentId;
				selectedDocumentId = pick ?? options[0]?.documentId ?? null;
			})
			.finally(() => {
				loaded = true;
			});
	});

	$effect(() => {
		const next =
			selectedDocumentId != null ? String(selectedDocumentId) : '';
		if (washValue !== next) washValue = next;
	});

	function onPick(value?: string) {
		if (value == null || value === '') return;
		const id = Number(value);
		if (!Number.isFinite(id)) return;
		selectedDocumentId = id;
		storePrintDocumentId(hospitalId, documentTypeId, id);
	}
</script>

{#if loaded && options.length > 0}
	<div class="w-full max-w-md {className}">
		<WashSelect
			label="Print template"
			className="select-sm"
			options={washOptions}
			bind:value={washValue}
			onChange={onPick}
			disabled={options.length === 1}
		/>
	</div>
{/if}