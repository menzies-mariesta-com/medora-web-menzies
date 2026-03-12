<script lang="ts">
	import MariRichEditor from '$lib/component/library/mari/text-editor/rich-editor/MariRichEditor.svelte';

	let content = '<p>Hello <strong>world</strong></p>';
</script>

<MariRichEditor bind:value={content} showPreview={false} editorClassName="d-textarea-secondary" />