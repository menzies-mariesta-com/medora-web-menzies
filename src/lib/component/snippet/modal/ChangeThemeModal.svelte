<script lang="ts">
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import { ThemeEnum } from '$lib/model/enum/theme.enum';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ThemeTool } from '$lib/tool/theme.tool.svelte';
	import { LocalStorageUtil } from '$lib/util/local-storage.util.svelte';

	let { confirm, cancel }: DialogSlotProps = $props();

	const localStorageUtil = new LocalStorageUtil();
	const themeTool = new ThemeTool(localStorageUtil);

	let currentTheme: ThemeEnum = $state(
		themeTool.getTheme() ?? ThemeEnum.LIGHT
	);

	function handleConfirm() {
		confirm({
			theme: currentTheme
		});
	}
</script>

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
