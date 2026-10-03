<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import type { AppLocale } from '$lib/model/enum/language.enum';
	import {
		filterLocaleSelectOptions,
		localeSelectOptions
	} from '$lib/model/const/locale-catalog.const';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { LanguageTool } from '$lib/tool/language.tool.svelte';
	import { m } from '$lib/paraglide/messages';
	import { locales } from '$lib/paraglide/runtime';

	let { confirm, cancel }: DialogSlotProps = $props();

	const languageTool = new LanguageTool();
	const allLanguageOptions = localeSelectOptions(locales);
	const msg = m as Record<string, (inputs?: object) => string>;

	let currentLanguage: AppLocale = $state(languageTool.getLanguage());
	let searchQuery = $state('');
	let isConfirming = $state(false);

	const filteredLanguageOptions = $derived(
		filterLocaleSelectOptions(allLanguageOptions, searchQuery)
	);

	async function handleConfirm() {
		if (isConfirming) return;
		isConfirming = true;
		try {
			await confirm({
				language: currentLanguage
			});
		} finally {
			isConfirming = false;
		}
	}
</script>

<div class="flex min-h-0 flex-1 flex-col">
	<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
		<label class="form-control mb-3 w-full" for="language-search">
			<span class="label py-1">
				<span class="label-text cursor-default">{msg.search_language()}</span>
			</span>
			<input
				id="language-search"
				type="search"
				class="input input-bordered w-full cursor-text"
				placeholder={msg.search_language()}
				bind:value={searchQuery}
				autocomplete="off"
				spellcheck="false"
			/>
		</label>
		{#if filteredLanguageOptions.length === 0}
			<p class="text-base-content/70 py-2 text-sm cursor-default">
				{msg.no_languages_found()}
			</p>
		{:else}
			<WashSelect
				optionHeader={m.select_language()}
				className="w-full cursor-pointer"
				options={filteredLanguageOptions}
				bind:value={currentLanguage}
			/>
		{/if}
		<p class="text-base-content/50 mt-2 text-xs cursor-default">
			{msg.language_list_count({
				filtered: String(filteredLanguageOptions.length),
				total: String(allLanguageOptions.length)
			})}
		</p>
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
			disabled={isConfirming || filteredLanguageOptions.length === 0}
			loading={isConfirming}
		>
			{m.ok()}
		</WashButton>
	</WashDialogFooter>
</div>
