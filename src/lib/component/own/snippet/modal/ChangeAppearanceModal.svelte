<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import {
		WashModeEnum,
		WashPigmentEnum
	} from '$lib/model/enum/wash-theme.enum';
	import { WashThemeTool } from '$lib/tool/wash-theme.tool.svelte';
	import { WashThemeState } from '$lib/state/wash-theme.state.svelte';

	let { confirm, cancel }: DialogSlotProps = $props();

	const washThemeTool = new WashThemeTool();
	const pigments = washThemeTool.listPigments();

	let currentPigment: WashPigmentEnum = $state(
		washThemeTool.getPigment()
	);
	let currentMode: WashModeEnum = $state(washThemeTool.getMode());
	let isConfirming = $state(false);

	function preview() {
		washThemeTool.apply(currentPigment, currentMode);
	}

	async function handleConfirm() {
		if (isConfirming) return;
		isConfirming = true;
		try {
			washThemeTool.apply(currentPigment, currentMode);
			WashThemeState.pigment = currentPigment;
			WashThemeState.mode = currentMode;
			await confirm({
				pigment: currentPigment,
				mode: currentMode
			});
		} finally {
			isConfirming = false;
		}
	}

	function handleCancel() {
		washThemeTool.apply(WashThemeState.pigment, WashThemeState.mode);
		cancel();
	}
</script>

<div class="flex flex-col gap-4">
	<label class="label-ink text-sm font-medium" for="wash-pigment"
		>Pigment</label
	>
	<WashSelect
		id="wash-pigment"
		optionHeader="Select pigment"
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
		>Mode</label
	>
	<WashSelect
		id="wash-mode"
		optionHeader="Select mode"
		className="w-full"
		bind:value={currentMode}
		onChange={() => preview()}
	>
		<option value={WashModeEnum.LIGHT}>Light</option>
		<option value={WashModeEnum.DARK}>Dark</option>
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
			Cancel
		</WashButton>
		<WashButton
			onClick={() => handleConfirm()}
			className="btn btn-primary"
			disabled={isConfirming}
			loading={isConfirming}
		>
			OK
		</WashButton>
	</div>
</div>
