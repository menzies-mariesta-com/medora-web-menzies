<script lang="ts">
	import LucidePalette from '$lib/component/own/library/lucide/LucidePalette.svelte';
	import {
		WashModeEnum,
		WashPigmentEnum
	} from '$lib/model/enum/wash-theme.enum';
	import { WashThemeTool } from '$lib/tool/wash-theme.tool.svelte';
	import { WashThemeState } from '$lib/state/wash-theme.state.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const washThemeTool = new WashThemeTool();
	const pigments = washThemeTool.listPigments();

	// SSR: avoid readStoredTheme/localStorage — root layout syncs WashThemeState after boot.
	let pigment = $state<WashPigmentEnum>(WashThemeState.pigment);
	let mode = $state<WashModeEnum>(WashThemeState.mode);
	let paletteOpen = $state(false);
	let menuRoot = $state<HTMLDivElement | null>(null);

	$effect(() => {
		pigment = WashThemeState.pigment;
		mode = WashThemeState.mode;
	});

	function toggleMode() {
		const next: WashModeEnum =
			mode === WashModeEnum.LIGHT ? WashModeEnum.DARK : WashModeEnum.LIGHT;
		washThemeTool.setMode(next);
		WashThemeState.mode = next;
		mode = next;
	}

	function setPigment(id: WashPigmentEnum) {
		washThemeTool.setPigment(id);
		WashThemeState.pigment = id;
		pigment = id;
		paletteOpen = false;
	}

	function onDocClick(e: MouseEvent) {
		if (!paletteOpen || !menuRoot) return;
		if (!menuRoot.contains(e.target as Node)) paletteOpen = false;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && paletteOpen) paletteOpen = false;
	}
</script>

<svelte:document onclick={onDocClick} onkeydown={onKey} />

<div class="flex items-center gap-1">
	<div
		class="tooltip tooltip-secondary"
		data-tip={mode === WashModeEnum.LIGHT
			? msg.appearance_mode_dark()
			: msg.appearance_mode_light()}
	>
		<button
			type="button"
			class="btn btn-ghost btn-square btn-sm btn-secondary cursor-pointer"
			aria-label={mode === WashModeEnum.LIGHT
				? msg.appearance_mode_dark()
				: msg.appearance_mode_light()}
			onclick={toggleMode}
		>
			{#if mode === WashModeEnum.LIGHT}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="size-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
					><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg
				>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="size-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
					><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path
						d="M12 20v2"
					/><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path
						d="M2 12h2"
					/><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path
						d="m19.07 4.93-1.41 1.41"
					/></svg
				>
			{/if}
		</button>
	</div>

	<div class="relative" bind:this={menuRoot}>
		<div class="tooltip tooltip-secondary" data-tip="Pigment">
			<button
				type="button"
				class="btn btn-ghost btn-square btn-sm btn-secondary cursor-pointer"
				aria-label="Pigment"
				aria-expanded={paletteOpen}
				aria-haspopup="listbox"
				onclick={() => (paletteOpen = !paletteOpen)}
			>
				<LucidePalette className="size-4" />
			</button>
		</div>
		{#if paletteOpen}
			<ul
				class="menu menu-sm absolute end-0 z-50 mt-2 max-h-72 w-72 max-w-[min(100vw-1rem,18rem)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-box border border-ink-border bg-base-100 p-2 shadow-lg"
				role="listbox"
				aria-label="Pigments"
			>
				{#each pigments as theme (theme.id)}
					<li class="w-full">
						<button
							type="button"
							class="flex w-full min-w-0 cursor-pointer items-center gap-2 {theme.id === pigment
								? 'bg-primary/40'
								: ''}"
							role="option"
							aria-selected={theme.id === pigment}
							onclick={() => setPigment(theme.id as WashPigmentEnum)}
						>
							<span
								class="size-3 shrink-0 rounded-full border border-ink-border"
								style:background={theme.swatch}
								aria-hidden="true"
							></span>
							<span class="flex min-w-0 flex-1 flex-col items-start gap-0 overflow-hidden">
								<span class="w-full truncate leading-tight">{theme.label}</span>
								<span class="w-full truncate text-[10px] text-ink-muted">{theme.note}</span>
							</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
