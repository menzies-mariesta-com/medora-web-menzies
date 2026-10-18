<script lang="ts">
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import type { AppLocale } from '$lib/model/enum/language.enum';
	import { localeSelectOptions } from '$lib/model/const/locale-catalog.const';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { LanguageTool } from '$lib/tool/language.tool.svelte';
	import { m } from '$lib/paraglide/messages';
	import { locales } from '$lib/paraglide/runtime';

	let { confirm, cancel }: DialogSlotProps = $props();

	const languageTool = new LanguageTool();
	const allLanguageOptions = localeSelectOptions(locales);
	const msg = m as Record<string, (inputs?: object) => string>;

	let currentLanguage = $state<string>(languageTool.getLanguage());
	let isConfirming = $state(false);

	async function handleConfirm() {
		if (isConfirming) return;
		isConfirming = true;
		try {
			await confirm({
				language: currentLanguage as AppLocale
			});
		} finally {
			isConfirming = false;
		}
	}
</script>

<div class="flex min-h-0 flex-1 flex-col">
	<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
		<div class="flex flex-col gap-2">
			<SearchSelect
				inputId="language-picker"
				label={m.select_language()}
				placeholder={m.select_language()}
				filterPlaceholder={msg.search_language()}
				emptyMessage={msg.no_languages_found()}
				className="w-full"
				options={allLanguageOptions}
				bind:value={currentLanguage}
			/>
		</div>
	</div>

	<WashDialogFooter className="gap-2">
		<WashButton
			className="btn"
			onClick={() => cancel()}
			disabled={isConfirming}
		>
			{m.cancel()}
		</WashButton>
		<WashButton
			onClick={() => handleConfirm()}
			className="btn btn-primary"
			disabled={isConfirming || !currentLanguage?.trim()}
			loading={isConfirming}
		>
			{m.ok()}
		</WashButton>
	</WashDialogFooter>
</div>
