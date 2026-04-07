<script lang="ts">
	import DaisyUiJoin from '$lib/component/daisyui/join/DaisyUiJoin.svelte';
	import DaisyUiJoinItem from '$lib/component/daisyui/join/item/DaisyUiJoinItem.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideAlignCenter from '$lib/component/own/library/lucide/LucideAlignCenter.svelte';
	import LucideBold from '$lib/component/own/library/lucide/LucideBold.svelte';
	import LucideImage from '$lib/component/own/library/lucide/LucideImage.svelte';
	import LucideItalic from '$lib/component/own/library/lucide/LucideItalic.svelte';
	import LucideLink from '$lib/component/own/library/lucide/LucideLink.svelte';
	import LucideList from '$lib/component/own/library/lucide/LucideList.svelte';
	import LucideListOrdered from '$lib/component/own/library/lucide/LucideListOrdered.svelte';
	import LucideStrikeThrough from '$lib/component/own/library/lucide/LucideStrikeThrough.svelte';
	import LucideSubscript from '$lib/component/own/library/lucide/LucideSubscript.svelte';
	import LucideSuperscript from '$lib/component/own/library/lucide/LucideSuperscript.svelte';
	import LucideTable2 from '$lib/component/own/library/lucide/LucideTable2.svelte';
	import LucideTextAlignEnd from '$lib/component/own/library/lucide/LucideTextAlignEnd.svelte';
	import LucideTextAlignJustify from '$lib/component/own/library/lucide/LucideTextAlignJustify.svelte';
	import LucideTextAlignStart from '$lib/component/own/library/lucide/LucideTextAlignStart.svelte';
	import LucideUnderline from '$lib/component/own/library/lucide/LucideUnderline.svelte';
	import { createEventDispatcher } from 'svelte';

	export type CommandName =
		| 'paragraph'
		| 'heading1'
		| 'heading2'
		| 'heading3'
		| 'heading4'
		| 'heading5'
		| 'heading6'
		| 'bold'
		| 'italic'
		| 'underline'
		| 'strikeThrough'
		| 'subscript'
		| 'superscript'
		| 'justifyLeft'
		| 'justifyCenter'
		| 'justifyRight'
		| 'justifyFull'
		| 'insertOrderedList'
		| 'insertUnorderedList'
		| 'fontSizeIncrease'
		| 'fontSizeDecrease'
		| 'fontSizeSet'
		| 'fontFamilySet'
		| 'foreColor'
		| 'backColor'
		| 'code'
		| 'blockquote'
		| 'horizontalRule'
		| 'indent'
		| 'outdent'
		| 'removeFormat'
		| 'tableAddRowBelow'
		| 'tableRemoveRow'
		| 'tableAddColRight'
		| 'tableRemoveCol'
		| 'link'
		| 'unlink'
		| 'image'
		| 'table';

	type ActiveStates = Partial<Record<CommandName, boolean>>;

	const FONT_FAMILIES = [
		{ label: 'Roboto', value: 'Roboto, sans-serif' },
		{ label: 'Adwaita Sans', value: 'Adwaita-sans, sans-serif' },
		{ label: 'Adwaita Mono', value: 'Adwaita-mono, monospace' },
		{ label: 'Comic Relief', value: 'ComicRelief, sans-serif' },
		{ label: 'Pangolin', value: 'Pangolin, sans-serif' }
	];

	const TEXT_COLORS = [
		{ label: 'Black', value: '#000000' },
		{ label: 'Dark Gray', value: '#4a4a4a' },
		{ label: 'Gray', value: '#808080' },
		{ label: 'Red', value: '#e53935' },
		{ label: 'Orange', value: '#fb8c00' },
		{ label: 'Yellow', value: '#fdd835' },
		{ label: 'Green', value: '#43a047' },
		{ label: 'Blue', value: '#1e88e5' },
		{ label: 'Purple', value: '#8e24aa' },
		{ label: 'Pink', value: '#d81b60' }
	];

	const BG_COLORS = [
		{ label: 'None', value: '' },
		{ label: 'Yellow', value: '#fff59d' },
		{ label: 'Green', value: '#c8e6c9' },
		{ label: 'Blue', value: '#bbdefb' },
		{ label: 'Pink', value: '#f8bbd9' },
		{ label: 'Orange', value: '#ffe0b2' },
		{ label: 'Purple', value: '#e1bee7' },
		{ label: 'Gray', value: '#e0e0e0' }
	];

	let {
		activeStates = {},
		fontSize = 14,
		// Default to Adwaita Sans to match expected editor behavior.
		fontFamily = 'Adwaita-sans, sans-serif',
		isInTable = false,
		textColor = '#000000',
		bgColor = ''
	} = $props<{
		activeStates?: ActiveStates;
		fontSize?: number;
		fontFamily?: string;
		isInTable?: boolean;
		textColor?: string;
		bgColor?: string;
	}>();

	const dispatch = createEventDispatcher<{
		command: {
			name: CommandName;
			value?: number;
			stringValue?: string;
		};
	}>();

	function execute(name: CommandName) {
		dispatch('command', { name });
	}

	function executeWithValue(name: CommandName, stringValue: string) {
		dispatch('command', { name, stringValue });
	}

	function handleFontFamilyChange(e: Event) {
		const target = e.currentTarget as HTMLSelectElement;
		dispatch('command', {
			name: 'fontFamilySet',
			stringValue: target.value
		});
	}

	function handleTextColorChange(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		dispatch('command', {
			name: 'foreColor',
			stringValue: target.value
		});
	}

	function handleBgColorChange(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		dispatch('command', {
			name: 'backColor',
			stringValue: target.value
		});
	}

	let showHeadingDropdown = $state(false);
	let showColorDropdown = $state(false);

	function getCurrentHeadingLabel(): string {
		if (activeStates.heading1) return 'H1';
		if (activeStates.heading2) return 'H2';
		if (activeStates.heading3) return 'H3';
		if (activeStates.heading4) return 'H4';
		if (activeStates.heading5) return 'H5';
		if (activeStates.heading6) return 'H6';
		if (activeStates.paragraph) return 'P';
		return 'P';
	}
</script>

<div
	class="flex flex-wrap items-center gap-2 border-b border-base-300 bg-base-200 px-3 py-2"
>
	<!-- Font family selector -->
	<select
		class="d-select-bordered d-select h-7 min-h-0 w-32 d-select-xs text-xs"
		value={fontFamily}
		onchange={handleFontFamilyChange}
	>
		{#each FONT_FAMILIES as font (font.value)}
			<option value={font.value}>{font.label}</option>
		{/each}
	</select>

	<!-- Block level / heading dropdown -->
	<div class="relative">
		<button
			type="button"
			class="d-btn flex items-center gap-1 border border-base-300 px-2 d-btn-ghost d-btn-xs"
			onclick={() => {
				showHeadingDropdown = !showHeadingDropdown;
				showColorDropdown = false;
			}}
		>
			<span class="w-6 text-xs font-semibold"
				>{getCurrentHeadingLabel()}</span
			>
			<svg
				class="h-3 w-3"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 9l-7 7-7-7"
				/>
			</svg>
		</button>
		{#if showHeadingDropdown}
			<div
				class="absolute top-full left-0 z-50 mt-1 rounded border border-base-300 bg-base-100 shadow-lg"
			>
				<button
					type="button"
					class="block w-full px-3 py-1 text-left text-sm hover:bg-base-200 {activeStates.paragraph
						? 'bg-primary/20'
						: ''}"
					onclick={() => {
						execute('paragraph');
						showHeadingDropdown = false;
					}}>Paragraph</button
				>
				<button
					type="button"
					class="block w-full px-3 py-1 text-left text-lg font-bold hover:bg-base-200 {activeStates.heading1
						? 'bg-primary/20'
						: ''}"
					onclick={() => {
						execute('heading1');
						showHeadingDropdown = false;
					}}>Heading 1</button
				>
				<button
					type="button"
					class="block w-full px-3 py-1 text-left text-base font-bold hover:bg-base-200 {activeStates.heading2
						? 'bg-primary/20'
						: ''}"
					onclick={() => {
						execute('heading2');
						showHeadingDropdown = false;
					}}>Heading 2</button
				>
				<button
					type="button"
					class="block w-full px-3 py-1 text-left text-sm font-bold hover:bg-base-200 {activeStates.heading3
						? 'bg-primary/20'
						: ''}"
					onclick={() => {
						execute('heading3');
						showHeadingDropdown = false;
					}}>Heading 3</button
				>
				<button
					type="button"
					class="block w-full px-3 py-1 text-left text-sm font-semibold hover:bg-base-200 {activeStates.heading4
						? 'bg-primary/20'
						: ''}"
					onclick={() => {
						execute('heading4');
						showHeadingDropdown = false;
					}}>Heading 4</button
				>
				<button
					type="button"
					class="block w-full px-3 py-1 text-left text-xs font-semibold hover:bg-base-200 {activeStates.heading5
						? 'bg-primary/20'
						: ''}"
					onclick={() => {
						execute('heading5');
						showHeadingDropdown = false;
					}}>Heading 5</button
				>
				<button
					type="button"
					class="block w-full px-3 py-1 text-left text-xs hover:bg-base-200 {activeStates.heading6
						? 'bg-primary/20'
						: ''}"
					onclick={() => {
						execute('heading6');
						showHeadingDropdown = false;
					}}>Heading 6</button
				>
				<div class="border-t border-base-300"></div>
				<button
					type="button"
					class="block w-full px-3 py-1 text-left font-mono text-xs hover:bg-base-200 {activeStates.code
						? 'bg-primary/20'
						: ''}"
					onclick={() => {
						execute('code');
						showHeadingDropdown = false;
					}}>Code Block</button
				>
				<button
					type="button"
					class="block w-full px-3 py-1 text-left text-xs italic hover:bg-base-200 {activeStates.blockquote
						? 'bg-primary/20'
						: ''}"
					onclick={() => {
						execute('blockquote');
						showHeadingDropdown = false;
					}}>Blockquote</button
				>
			</div>
		{/if}
	</div>

	<!-- Font size -->
	<div class="flex items-center rounded border border-base-300">
		<button
			type="button"
			class="min-h-8 min-w-8 px-2.5 py-1.5 hover:bg-base-300 transition-colors"
			onmousedown={(e) => e.preventDefault()}
			onclick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				execute('fontSizeDecrease');
			}}
		>
			<span class="text-base font-bold leading-none">−</span>
		</button>
		<input
			type="text"
			inputmode="numeric"
			pattern="[0-9]*"
			value={fontSize}
			class="h-8 w-14 border-x border-base-300 bg-transparent text-center text-base font-medium"
			style="outline: none; box-shadow: none;"
			oninput={(e) => {
				const target = e.currentTarget as HTMLInputElement;
				const val = Number(target.value);
				if (!Number.isNaN(val) && val >= 8 && val <= 200)
					dispatch('command', { name: 'fontSizeSet', value: val });
			}}
		/>
		<button
			type="button"
			class="min-h-8 min-w-8 px-2.5 py-1.5 hover:bg-base-300 transition-colors"
			onmousedown={(e) => e.preventDefault()}
			onclick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				execute('fontSizeIncrease');
			}}
		>
			<span class="text-base font-bold leading-none">+</span>
		</button>
	</div>

	<div class="h-5 w-px bg-base-300"></div>

	<!-- Text formatting -->
	<DaisyUiJoin>
		<DaisyUiJoinItem
			className="d-btn-xs h-7 {activeStates.bold
				? 'd-btn-active d-btn-primary'
				: ''}"
		>
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('bold')}
			>
				<DaisyUiTooltip tooltipText="Bold (Ctrl+B)"
					><LucideBold className="size-4" /></DaisyUiTooltip
				>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-xs h-7 {activeStates.italic
				? 'd-btn-active d-btn-primary'
				: ''}"
		>
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('italic')}
			>
				<DaisyUiTooltip tooltipText="Italic (Ctrl+I)"
					><LucideItalic className="size-4" /></DaisyUiTooltip
				>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-xs h-7 {activeStates.underline
				? 'd-btn-active d-btn-primary'
				: ''}"
		>
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('underline')}
			>
				<DaisyUiTooltip tooltipText="Underline (Ctrl+U)"
					><LucideUnderline className="size-4" /></DaisyUiTooltip
				>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-xs h-7 {activeStates.strikeThrough
				? 'd-btn-active d-btn-primary'
				: ''}"
		>
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('strikeThrough')}
			>
				<DaisyUiTooltip tooltipText="Strikethrough"
					><LucideStrikeThrough className="size-4" /></DaisyUiTooltip
				>
			</button>
		</DaisyUiJoinItem>
	</DaisyUiJoin>

	<!-- Sub/Superscript -->
	<DaisyUiJoin>
		<DaisyUiJoinItem
			className="d-btn-xs h-7 {activeStates.subscript
				? 'd-btn-active d-btn-primary'
				: ''} {activeStates.superscript ? 'opacity-50' : ''}"
		>
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('subscript')}
				disabled={activeStates.superscript}
			>
				<DaisyUiTooltip tooltipText="Subscript"
					><LucideSubscript className="size-4" /></DaisyUiTooltip
				>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-xs h-7 {activeStates.superscript
				? 'd-btn-active d-btn-primary'
				: ''} {activeStates.subscript ? 'opacity-50' : ''}"
		>
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('superscript')}
				disabled={activeStates.subscript}
			>
				<DaisyUiTooltip tooltipText="Superscript"
					><LucideSuperscript className="size-4" /></DaisyUiTooltip
				>
			</button>
		</DaisyUiJoinItem>
	</DaisyUiJoin>

	<div class="h-5 w-px bg-base-300"></div>

	<!-- Colors -->
	<div class="flex items-center gap-1">
		<DaisyUiTooltip tooltipText="Text Color">
			<label class="relative cursor-pointer">
				<span
					class="flex h-7 w-7 items-center justify-center rounded border border-base-300 bg-base-100 text-xs font-bold"
					style="color: {textColor}">A</span
				>
				<input
					type="color"
					class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
					value={textColor}
					oninput={handleTextColorChange}
				/>
			</label>
		</DaisyUiTooltip>
		<DaisyUiTooltip tooltipText="Background Color">
			<label class="relative cursor-pointer">
				<span
					class="flex h-7 w-7 items-center justify-center rounded border border-base-300 text-xs"
					style="background-color: {bgColor || '#ffffff'}"
				>
					<svg
						class="size-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
						/></svg
					>
				</span>
				<input
					type="color"
					class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
					value={bgColor || '#ffffff'}
					oninput={handleBgColorChange}
				/>
			</label>
		</DaisyUiTooltip>
	</div>

	<div class="h-5 w-px bg-base-300"></div>

	<!-- Alignment -->
	<DaisyUiJoin>
		<DaisyUiJoinItem
			className="d-btn-xs h-7 {activeStates.justifyLeft
				? 'd-btn-active d-btn-primary'
				: ''}"
		>
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('justifyLeft')}
			>
				<DaisyUiTooltip tooltipText="Align Left"
					><LucideTextAlignStart className="size-4" /></DaisyUiTooltip
				>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-xs h-7 {activeStates.justifyCenter
				? 'd-btn-active d-btn-primary'
				: ''}"
		>
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('justifyCenter')}
			>
				<DaisyUiTooltip tooltipText="Align Center"
					><LucideAlignCenter className="size-4" /></DaisyUiTooltip
				>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-xs h-7 {activeStates.justifyRight
				? 'd-btn-active d-btn-primary'
				: ''}"
		>
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('justifyRight')}
			>
				<DaisyUiTooltip tooltipText="Align Right"
					><LucideTextAlignEnd className="size-4" /></DaisyUiTooltip
				>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-xs h-7 {activeStates.justifyFull
				? 'd-btn-active d-btn-primary'
				: ''}"
		>
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('justifyFull')}
			>
				<DaisyUiTooltip tooltipText="Justify"
					><LucideTextAlignJustify
						className="size-4"
					/></DaisyUiTooltip
				>
			</button>
		</DaisyUiJoinItem>
	</DaisyUiJoin>

	<div class="h-5 w-px bg-base-300"></div>

	<!-- Lists & Indent -->
	<DaisyUiJoin>
		<DaisyUiJoinItem
			className="d-btn-xs h-7 {activeStates.insertOrderedList
				? 'd-btn-active d-btn-primary'
				: ''}"
		>
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('insertOrderedList')}
			>
				<DaisyUiTooltip tooltipText="Numbered List"
					><LucideListOrdered className="size-4" /></DaisyUiTooltip
				>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-xs h-7 {activeStates.insertUnorderedList
				? 'd-btn-active d-btn-primary'
				: ''}"
		>
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('insertUnorderedList')}
			>
				<DaisyUiTooltip tooltipText="Bulleted List"
					><LucideList className="size-4" /></DaisyUiTooltip
				>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-xs h-7">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('outdent')}
			>
				<DaisyUiTooltip tooltipText="Decrease Indent">
					<svg
						class="size-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M11 19l-7-7 7-7m8 14V5"
						/></svg
					>
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-xs h-7">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('indent')}
			>
				<DaisyUiTooltip tooltipText="Increase Indent">
					<svg
						class="size-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 5l7 7-7 7M5 5v14"
						/></svg
					>
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
	</DaisyUiJoin>

	<div class="h-5 w-px bg-base-300"></div>

	<!-- Insert tools -->
	<DaisyUiJoin>
		<DaisyUiJoinItem className="d-btn-xs h-7">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('link')}
			>
				<DaisyUiTooltip tooltipText="Insert Link"
					><LucideLink className="size-4" /></DaisyUiTooltip
				>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-xs h-7">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('unlink')}
			>
				<DaisyUiTooltip tooltipText="Remove Link">
					<svg
						class="size-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
						/><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6"
						/></svg
					>
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-xs h-7">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('image')}
			>
				<DaisyUiTooltip tooltipText="Insert Image"
					><LucideImage className="size-4" /></DaisyUiTooltip
				>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-xs h-7">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('table')}
			>
				<DaisyUiTooltip tooltipText="Insert Table"
					><LucideTable2 className="size-4" /></DaisyUiTooltip
				>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-xs h-7">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('horizontalRule')}
			>
				<DaisyUiTooltip tooltipText="Horizontal Line">
					<svg
						class="size-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 12h14"
						/></svg
					>
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
	</DaisyUiJoin>

	<!-- Clear formatting -->
	<button
		type="button"
		class="d-btn h-7 d-btn-ghost d-btn-xs"
		onmousedown={(e) => e.preventDefault()}
		onclick={() => execute('removeFormat')}
	>
		<DaisyUiTooltip tooltipText="Clear Formatting">
			<svg
				class="size-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 14l2 2m0 0l2 2m-2-2l-2 2m2-2l2-2M3 12l6.414-6.414a2 2 0 012.828 0L21 14.343"
				/></svg
			>
		</DaisyUiTooltip>
	</button>

	<!-- Table tools (when in table) -->
	{#if isInTable}
		<div class="h-5 w-px bg-base-300"></div>
		<DaisyUiJoin>
			<DaisyUiJoinItem className="d-btn-xs h-7">
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execute('tableAddRowBelow')}
				>
					<DaisyUiTooltip tooltipText="Add Row"
						><span class="text-[10px] font-semibold">+Row</span
						></DaisyUiTooltip
					>
				</button>
			</DaisyUiJoinItem>
			<DaisyUiJoinItem className="d-btn-xs h-7">
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execute('tableRemoveRow')}
				>
					<DaisyUiTooltip tooltipText="Delete Row"
						><span class="text-[10px] font-semibold">−Row</span
						></DaisyUiTooltip
					>
				</button>
			</DaisyUiJoinItem>
			<DaisyUiJoinItem className="d-btn-xs h-7">
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execute('tableAddColRight')}
				>
					<DaisyUiTooltip tooltipText="Add Column"
						><span class="text-[10px] font-semibold">+Col</span
						></DaisyUiTooltip
					>
				</button>
			</DaisyUiJoinItem>
			<DaisyUiJoinItem className="d-btn-xs h-7">
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execute('tableRemoveCol')}
				>
					<DaisyUiTooltip tooltipText="Delete Column"
						><span class="text-[10px] font-semibold">−Col</span
						></DaisyUiTooltip
					>
				</button>
			</DaisyUiJoinItem>
		</DaisyUiJoin>
	{/if}
</div>

<!-- Click outside to close dropdowns -->
<svelte:window
	onclick={(e) => {
		const target = e.target as HTMLElement;
		if (!target.closest('.relative')) {
			showHeadingDropdown = false;
			showColorDropdown = false;
		}
	}}
/>
