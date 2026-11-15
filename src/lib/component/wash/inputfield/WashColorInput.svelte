<script lang="ts">
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import { isValidColorInput, normalizeColorInput } from '$lib/tool/color/validate-color.util';
	import { daisyUiTokenToHex } from '$lib/tool/color/color-daisyui-default.util';

	let {
		id = 'color-input',
		value = $bindable('#570df8'),
		className = '',
		disabled = false
	} = $props<{
		id?: string;
		value?: string;
		className?: string;
		disabled?: boolean;
	}>();

	const previewHex = $derived(daisyUiTokenToHex(value));

	function onPickerInput(e: Event) {
		const v = (e.currentTarget as HTMLInputElement).value;
		value = v;
	}

	function onTextInput(e: Event) {
		const raw = (e.currentTarget as HTMLInputElement).value;
		const norm = normalizeColorInput(raw);
		if (norm) value = norm;
		else value = raw;
	}
</script>

<div class="flex min-w-0 flex-wrap items-center gap-2 {className}">
	<input
		{id}
		type="color"
		class="h-10 w-14 shrink-0 cursor-pointer rounded-box border border-base-300 bg-base-100 p-0.5"
		value={previewHex.startsWith('#') ? previewHex : '#570df8'}
		{disabled}
		oninput={onPickerInput}
		aria-label="Color picker"
	/>
	<span
		class="h-8 w-8 shrink-0 rounded-md border border-base-300 shadow-sm"
		style="background-color: {previewHex}"
		aria-hidden="true"
	></span>
	<div class="min-w-[8rem] flex-1">
		<WashInputField
			inputType="text"
			inputPlaceholderText="#RRGGBB or rgba(...)"
			value={value}
			{disabled}
			oninput={onTextInput}
			className={!isValidColorInput(value) && value.trim() !== ''
				? 'input-error'
				: ''}
		/>
	</div>
</div>