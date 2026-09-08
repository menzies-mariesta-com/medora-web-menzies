<script lang="ts">
	import WashTabsContent from '$lib/component/wash/tabs/content/WashTabsContent.svelte';
	import WashTabs from '$lib/component/wash/tabs/WashTabs.svelte';
	import WashTabsTab from '$lib/component/wash/tabs/tab/WashTabsTab.svelte';
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
	<WashTabs className="tabs-box tabs-bottom">
		<WashTabsTab groupName="hello" tabName="hello" checked
			>Rich Editor</WashTabsTab
		>
		<WashTabsContent tabName="hello">
			<MariRichTextEditor />
		</WashTabsContent>

		<WashTabsTab groupName="hello" tabName="hello"
			>Markdown</WashTabsTab
		>
		<WashTabsContent tabName="hello">
			<MariMarkdownEditor />
		</WashTabsContent>

		<WashTabsTab groupName="hello" tabName="hello"
			>HTML</WashTabsTab
		>
		<WashTabsContent tabName="hello">
			<MariHtmlTextEditor />
		</WashTabsContent>
	</WashTabs>
</div>
