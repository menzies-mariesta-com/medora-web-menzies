<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import { FontEnum } from '$lib/model/enum/font.enum';
	import { ThemeEnum } from '$lib/model/enum/theme.enum';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { FontTool } from '$lib/tool/font.tool.svelte';
	import { ThemeTool } from '$lib/tool/theme.tool.svelte';
	import { LocalStorageUtil } from '$lib/util/local-storage.util.svelte';

	let { confirm, cancel }: DialogSlotProps = $props();

	const localStorageUtil = new LocalStorageUtil();
	const themeTool = new ThemeTool(localStorageUtil);
	const fontTool = new FontTool(localStorageUtil);

	let currentTheme: ThemeEnum = $state(
		themeTool.getTheme() ?? ThemeEnum.LIGHT
	);
	let currentFont: FontEnum = $state(
		fontTool.getFont() ?? FontEnum.ADWAITA_SANS
	);

	let isConfirming = $state(false);

	async function handleConfirm() {
		if (isConfirming) return;
		isConfirming = true;
		try {
			await confirm({
				theme: currentTheme,
				font: currentFont
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
		<h2 class="text-lg font-semibold">Change appearance</h2>
		<DaisyUiButton
			className="d-btn-ghost d-btn-sm d-btn-circle"
			onClick={() => cancel()}
			disabled={isConfirming}
		>
			<LucideX className="size-5" />
		</DaisyUiButton>
	</div>
	<div class="mt-4 flex flex-col gap-4">
		<DaisyUiSelect
			optionHeader="Select Theme"
			className="w-full"
			bind:value={currentTheme}
		>
			{#each Object.values(ThemeEnum) as theme}
				{#if theme === currentTheme}
					<option value={theme} selected>{theme}</option>
				{:else}
					<option value={theme}>{theme}</option>
				{/if}
			{/each}
		</DaisyUiSelect>

		<DaisyUiSelect
			optionHeader="Select Font"
			className="w-full"
			bind:value={currentFont}
		>
			{#each Object.values(FontEnum) as font}
				{#if font === currentFont}
					<option value={font} selected>{font}</option>
				{:else}
					<option value={font}>{font}</option>
				{/if}
			{/each}
		</DaisyUiSelect>

		<div class="d-modal-action mt-2">
			<DaisyUiButton
				className="d-btn"
				onClick={() => cancel()}
				disabled={isConfirming}
			>
				Cancel
			</DaisyUiButton>
			<DaisyUiButton
				onClick={() => handleConfirm()}
				className="d-btn d-btn-primary"
				disabled={isConfirming}
				loading={isConfirming}
			>
				OK
			</DaisyUiButton>
		</div>
	</div>
</div>
