<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { FontEnum } from '$lib/model/enum/font.enum';
	import {
		WashModeEnum,
		WashPigmentEnum
	} from '$lib/model/enum/wash-theme.enum';
	import { FontTool } from '$lib/tool/font.tool.svelte';
	import { WashThemeTool } from '$lib/tool/wash-theme.tool.svelte';
	import { FontState } from '$lib/state/font.state.svelte';
	import { WashThemeState } from '$lib/state/wash-theme.state.svelte';
	import { m } from '$lib/paraglide/messages';

	let { confirm, cancel }: DialogSlotProps = $props();

	const washThemeTool = new WashThemeTool();
	const fontTool = new FontTool();
	const pigments = washThemeTool.listPigments();
	const fontStyles = fontTool.listStyles();

	let currentPigment: WashPigmentEnum = $state(
		washThemeTool.getPigment()
	);
	let currentMode: WashModeEnum = $state(washThemeTool.getMode());
	let currentFont: FontEnum = $state(fontTool.getFont());
	let isConfirming = $state(false);

	const msg = m as Record<string, (inputs?: object) => string>;

	function preview() {
		washThemeTool.apply(currentPigment, currentMode);
		fontTool.apply(currentFont);
	}

	async function handleConfirm() {
		if (isConfirming) return;
		isConfirming = true;
		try {
			washThemeTool.apply(currentPigment, currentMode);
			fontTool.apply(currentFont);
			WashThemeState.pigment = currentPigment;
			WashThemeState.mode = currentMode;
			FontState.font = currentFont;
			await confirm({
				pigment: currentPigment,
				mode: currentMode,
				font: currentFont
			});
		} finally {
			isConfirming = false;
		}
	}

	function handleCancel() {
		washThemeTool.apply(WashThemeState.pigment, WashThemeState.mode);
		fontTool.apply(FontState.font);
		cancel();
	}
</script>

<div class="flex flex-col gap-4">
	<label class="label-ink text-sm font-medium" for="wash-pigment"
		>{msg.appearance_pigment()}</label
	>
	<WashSelect
		id="wash-pigment"
		optionHeader={msg.appearance_select_pigment()}
		className="w-full"
		bind:value={currentPigment}
		onChange={() => preview()}
	>
		{#each pigments as pigment (pigment.id)}
			<option value={pigment.id}>
				{pigment.label} — {pigment.note}
			</option>
		{/each}
	</WashSelect>

	<label class="label-ink text-sm font-medium" for="wash-mode"
		>{msg.appearance_mode()}</label
	>
	<WashSelect
		id="wash-mode"
		optionHeader={msg.appearance_select_mode()}
		className="w-full"
		bind:value={currentMode}
		onChange={() => preview()}
	>
		<option value={WashModeEnum.LIGHT}>{msg.appearance_mode_light()}</option>
		<option value={WashModeEnum.DARK}>{msg.appearance_mode_dark()}</option>
	</WashSelect>

	<label class="label-ink text-sm font-medium" for="wash-font"
		>{msg.appearance_font_style()}</label
	>
	<WashSelect
		id="wash-font"
		optionHeader={msg.appearance_select_font_style()}
		className="w-full"
		bind:value={currentFont}
		onChange={() => preview()}
	>
		{#each fontStyles as style (style.id)}
			<option value={style.id}>
				{style.label} — {style.note}
			</option>
		{/each}
	</WashSelect>

	<div class="flex flex-wrap gap-2 pt-1">
		{#each pigments.slice(0, 12) as pigment (pigment.id)}
			<button
				type="button"
				class="ripple size-7 cursor-pointer rounded-full border border-base-300"
				style="background:{pigment.swatch}"
				title={pigment.label}
				aria-label={pigment.label}
				onclick={() => {
					currentPigment = pigment.id as WashPigmentEnum;
					preview();
				}}
			></button>
		{/each}
	</div>

	<div class="modal-action mt-2">
		<WashButton
			className="btn"
			onClick={handleCancel}
			disabled={isConfirming}
		>
			{msg.cancel()}
		</WashButton>
		<WashButton
			onClick={() => handleConfirm()}
			className="btn btn-primary"
			disabled={isConfirming}
			loading={isConfirming}
		>
			{msg.ok()}
		</WashButton>
	</div>
</div>
