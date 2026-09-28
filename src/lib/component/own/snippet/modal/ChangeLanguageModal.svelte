<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import { LanguageEnum } from '$lib/model/enum/language.enum';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { LanguageTool } from '$lib/tool/language.tool.svelte';
	import { m } from '$lib/paraglide/messages';

	let { confirm, cancel }: DialogSlotProps = $props();

	const languageTool = new LanguageTool();

	let currentLanguage: LanguageEnum = $state(
		languageTool.getLanguage()
	);

	let isConfirming = $state(false);

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
		<WashSelect
			optionHeader={m.select_language()}
			className="w-full"
			bind:value={currentLanguage}
		>
			{#each Object.values(LanguageEnum) as lang}
				{#if lang === currentLanguage}
					<option value={lang} selected>{lang}</option>
				{:else}
					<option value={lang}>{lang}</option>
				{/if}
			{/each}
		</WashSelect>
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
			disabled={isConfirming}
			loading={isConfirming}
		>
			{m.ok()}
		</WashButton>
	</WashDialogFooter>
</div>
