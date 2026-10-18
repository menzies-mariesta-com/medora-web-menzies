<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
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

	const msg = m as Record<string, (inputs?: object) => string>;
	const washThemeTool = new WashThemeTool();
	const fontTool = new FontTool();
	const pigments = washThemeTool.listPigments();
	const fontStyles = fontTool.listStyles();

	const pigmentOptions = $derived(
		pigments.map((pigment) => ({
			value: pigment.id,
			label: `${pigment.label}: ${pigment.note}`,
			swatch: pigment.swatch
		}))
	);
	const modeOptions = $derived([
		{
			value: WashModeEnum.LIGHT,
			label: msg.appearance_mode_light()
		},
		{
			value: WashModeEnum.DARK,
			label: msg.appearance_mode_dark()
		}
	]);
	const fontOptions = $derived(
		fontStyles.map((style) => ({
			value: style.id,
			label: `${style.label}: ${style.note}`,
			fontFamily: style.stack
		}))
	);

	let currentPigment: WashPigmentEnum = $state(
		washThemeTool.getPigment()
	);
	let currentMode: WashModeEnum = $state(washThemeTool.getMode());
	let currentFont: FontEnum = $state(fontTool.getFont());
	let isConfirming = $state(false);

	function preview() {
		// Theme first, then font: font re-asserts typeface tokens for every pigment.
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

<div class="flex min-h-0 flex-1 flex-col">
	<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
		<div class="flex flex-col gap-4">
			<label class="label-ink text-sm font-medium" for="wash-pigment"
				>{msg.appearance_pigment()}</label
			>
			<WashSelect
				id="wash-pigment"
				placeholder={msg.appearance_select_pigment()}
				className="w-full cursor-pointer"
				options={pigmentOptions}
				bind:value={currentPigment}
				onChange={() => preview()}
			/>

			<label class="label-ink text-sm font-medium" for="wash-mode"
				>{msg.appearance_mode()}</label
			>
			<WashSelect
				id="wash-mode"
				placeholder={msg.appearance_select_mode()}
				className="w-full cursor-pointer"
				options={modeOptions}
				bind:value={currentMode}
				onChange={() => preview()}
			/>

			<label class="label-ink text-sm font-medium" for="wash-font"
				>{msg.appearance_font_style()}</label
			>
			<WashSelect
				id="wash-font"
				placeholder={msg.appearance_select_font_style()}
				className="w-full cursor-pointer"
				options={fontOptions}
				bind:value={currentFont}
				onChange={() => preview()}
			/>
		</div>
	</div>

	<WashDialogFooter className="gap-2">
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
	</WashDialogFooter>
</div>
