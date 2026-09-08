<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
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

<div class="flex flex-col">
	<div
		class="flex items-center justify-between border-b border-base-300 pb-4"
	>
		<h2 class="text-lg font-semibold">{m.change_language()}</h2>
		<WashButton
			className="btn-ghost btn-sm btn-circle"
			onClick={() => cancel()}
			disabled={isConfirming}
		>
			<LucideX className="size-5" />
		</WashButton>
	</div>
	<div class="mt-4 flex flex-col gap-4">
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

		<div class="modal-action mt-2">
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
		</div>
	</div>
</div>
