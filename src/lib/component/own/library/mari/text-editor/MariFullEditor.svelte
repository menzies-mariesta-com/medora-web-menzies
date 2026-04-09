<script lang="ts">
	import DaisyUiTabsContent from '$lib/component/daisyui/tabs/content/DaisyUiTabsContent.svelte';
	import DaisyUiTabs from '$lib/component/daisyui/tabs/DaisyUiTabs.svelte';
	import DaisyUiTabsTab from '$lib/component/daisyui/tabs/tab/DaisyUiTabsTab.svelte';
	import MariHtmlTextEditor from './html-editor/MariHtmlEditor.svelte';
	import MariMarkdownEditor from './markdown-editor/MariMarkdownEditor.svelte';
	import MariRichTextEditor from './rich-editor/MariRichEditor.svelte';

	let {
		isRich = false,
		isRichPreview = false,
		isRichController = false,
		isHtml = false,
		isHtmlPreview = false,
		isHtmlController = false,
		isMarkdown = false,
		isMarkdownPreview = false,
		isMarkdownController = false
	} = $props<{
		isRich?: boolean;
		isRichPreview?: boolean;
		isHtml?: boolean;
		isMarkdown?: boolean;
	}>();
</script>

<div class="px-5 py-10">
	<DaisyUiTabs className="d-tabs-box d-tabs-bottom">
		<DaisyUiTabsTab groupName="hello" tabName="hello" checked
			>Rich Editor</DaisyUiTabsTab
		>
		<DaisyUiTabsContent tabName="hello">
			<MariRichTextEditor />
		</DaisyUiTabsContent>

		<DaisyUiTabsTab groupName="hello" tabName="hello"
			>Markdown</DaisyUiTabsTab
		>
		<DaisyUiTabsContent tabName="hello">
			<MariMarkdownEditor />
		</DaisyUiTabsContent>

		<DaisyUiTabsTab groupName="hello" tabName="hello"
			>HTML</DaisyUiTabsTab
		>
		<DaisyUiTabsContent tabName="hello">
			<MariHtmlTextEditor />
		</DaisyUiTabsContent>
	</DaisyUiTabs>
</div>
