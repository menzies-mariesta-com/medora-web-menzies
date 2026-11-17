<script lang="ts">
	/** @deprecated Import `$lib/component/own/library/menzies/PrintDocumentTemplatePicker.svelte` */
	import PrintDocumentTemplatePicker from '$lib/component/own/library/menzies/PrintDocumentTemplatePicker.svelte';

	let {
		hospitalId,
		documentTypeId,
		selectedDocumentId = $bindable<number | null>(null)
	}: {
		hospitalId: string;
		documentTypeId: number;
		selectedDocumentId?: number | null;
	} = $props();
</script>

<PrintDocumentTemplatePicker
	{hospitalId}
	{documentTypeId}
	bind:selectedDocumentId
/>