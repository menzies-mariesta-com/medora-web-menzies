<script lang="ts">
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import { LanguageEnum } from '$lib/model/enum/language.enum';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { LanguageTool } from '$lib/tool/language.tool.svelte';

	let { confirm, cancel }: DialogSlotProps = $props();

	const languageTool = new LanguageTool();

	let currentLanguage: LanguageEnum = $state(
		languageTool.getLanguage()
	);

	function handleConfirm() {
		confirm({
			language: currentLanguage
		});
	}
</script>

<DaisyUiSelect
	optionHeader="Select Language"
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
</DaisyUiSelect>

<div class="d-modal-action">
	<DaisyUiButton className="d-btn" onClick={() => cancel()}>
		Cancel
	</DaisyUiButton>
	<DaisyUiButton
		onClick={() => handleConfirm()}
		className="d-btn d-btn-primary"
	>
		OK
	</DaisyUiButton>
</div>
