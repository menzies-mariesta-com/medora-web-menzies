<script lang="ts">
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
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
		{ label: 'Maple Mono', value: "'Maple Mono', ui-monospace, monospace" },
		{ label: 'Fraunces', value: "'Fraunces', ui-serif, Georgia, serif" }
	];

	let {
		activeStates = {},
		fontSize = 14,
		// Default to Wash UI body face.
		fontFamily = "'Maple Mono', ui-monospace, monospace",
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

	function handleFontFamilyChange(next?: string) {
		if (!next) return;
		dispatch('command', {
			name: 'fontFamilySet',
			stringValue: next
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

	const BLOCK_STYLE_OPTIONS = [
		{ value: 'paragraph', label: 'Paragraph' },
		{ value: 'heading1', label: 'Heading 1' },
		{ value: 'heading2', label: 'Heading 2' },
		{ value: 'heading3', label: 'Heading 3' },
		{ value: 'heading4', label: 'Heading 4' },
		{ value: 'heading5', label: 'Heading 5' },
		{ value: 'heading6', label: 'Heading 6' },
		{ value: 'code', label: 'Code Block' },
		{ value: 'blockquote', label: 'Blockquote' }
	] as const;

	const blockStyleValue = $derived.by(() => {
		if (activeStates.heading1) return 'heading1';
		if (activeStates.heading2) return 'heading2';
		if (activeStates.heading3) return 'heading3';
		if (activeStates.heading4) return 'heading4';
		if (activeStates.heading5) return 'heading5';
		if (activeStates.heading6) return 'heading6';
		if (activeStates.code) return 'code';
		if (activeStates.blockquote) return 'blockquote';
		return 'paragraph';
	});
</script>

<div
	class="flex flex-wrap items-center gap-2 border-b border-base-300 bg-base-200 px-3 py-2"
>
	<!-- Font family selector -->
	<WashSelect
		className="select h-7 min-h-0 w-32 select-xs text-xs"
		value={fontFamily}
		options={FONT_FAMILIES}
		onChange={handleFontFamilyChange}
		aria-label="Font family"
	/>

	<!-- Block level / heading -->
	<WashSelect
		className="select h-7 min-h-0 w-36 select-xs text-xs"
		value={blockStyleValue}
		options={[...BLOCK_STYLE_OPTIONS]}
		onChange={(next) => {
			if (next) execute(next as CommandName);
		}}
		aria-label="Block style"
	/>

	<!-- Font size -->
	<div class="flex items-center rounded border border-base-300">
		<button
			type="button"
			class="min-h-8 min-w-8 px-2.5 py-1.5 transition-colors hover:bg-base-300"
			onmousedown={(e) => e.preventDefault()}
			onclick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				execute('fontSizeDecrease');
			}}
		>
			<span class="text-base leading-none font-bold">−</span>
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
			class="min-h-8 min-w-8 px-2.5 py-1.5 transition-colors hover:bg-base-300"
			onmousedown={(e) => e.preventDefault()}
			onclick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				execute('fontSizeIncrease');
			}}
		>
			<span class="text-base leading-none font-bold">+</span>
		</button>
	</div>

	<div class="h-5 w-px bg-base-300"></div>

	<!-- Text formatting -->
	<div class="join flex">
		<div class="btn join-item btn-xs h-7 {activeStates.bold
				? 'btn-active btn-primary'
				: ''}">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('bold')}
			>
				<WashTooltip tooltipText="Bold (Ctrl+B)"
					><LucideBold className="size-4" /></WashTooltip
				>
			</button>
		</div>
		<div class="btn join-item btn-xs h-7 {activeStates.italic
				? 'btn-active btn-primary'
				: ''}">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('italic')}
			>
				<WashTooltip tooltipText="Italic (Ctrl+I)"
					><LucideItalic className="size-4" /></WashTooltip
				>
			</button>
		</div>
		<div class="btn join-item btn-xs h-7 {activeStates.underline
				? 'btn-active btn-primary'
				: ''}">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('underline')}
			>
				<WashTooltip tooltipText="Underline (Ctrl+U)"
					><LucideUnderline className="size-4" /></WashTooltip
				>
			</button>
		</div>
		<div class="btn join-item btn-xs h-7 {activeStates.strikeThrough
				? 'btn-active btn-primary'
				: ''}">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('strikeThrough')}
			>
				<WashTooltip tooltipText="Strikethrough"
					><LucideStrikeThrough className="size-4" /></WashTooltip
				>
			</button>
		</div>
	</div>

	<!-- Sub/Superscript -->
	<div class="join flex">
		<div class="btn join-item btn-xs h-7 {activeStates.subscript
				? 'btn-active btn-primary'
				: ''} {activeStates.superscript ? 'opacity-50' : ''}">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('subscript')}
				disabled={activeStates.superscript}
			>
				<WashTooltip tooltipText="Subscript"
					><LucideSubscript className="size-4" /></WashTooltip
				>
			</button>
		</div>
		<div class="btn join-item btn-xs h-7 {activeStates.superscript
				? 'btn-active btn-primary'
				: ''} {activeStates.subscript ? 'opacity-50' : ''}">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('superscript')}
				disabled={activeStates.subscript}
			>
				<WashTooltip tooltipText="Superscript"
					><LucideSuperscript className="size-4" /></WashTooltip
				>
			</button>
		</div>
	</div>

	<div class="h-5 w-px bg-base-300"></div>

	<!-- Colors -->
	<div class="flex items-center gap-1">
		<WashTooltip tooltipText="Text Color">
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
		</WashTooltip>
		<WashTooltip tooltipText="Background Color">
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
		</WashTooltip>
	</div>

	<div class="h-5 w-px bg-base-300"></div>

	<!-- Alignment -->
	<div class="join flex">
		<div class="btn join-item btn-xs h-7 {activeStates.justifyLeft
				? 'btn-active btn-primary'
				: ''}">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('justifyLeft')}
			>
				<WashTooltip tooltipText="Align Left"
					><LucideTextAlignStart className="size-4" /></WashTooltip
				>
			</button>
		</div>
		<div class="btn join-item btn-xs h-7 {activeStates.justifyCenter
				? 'btn-active btn-primary'
				: ''}">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('justifyCenter')}
			>
				<WashTooltip tooltipText="Align Center"
					><LucideAlignCenter className="size-4" /></WashTooltip
				>
			</button>
		</div>
		<div class="btn join-item btn-xs h-7 {activeStates.justifyRight
				? 'btn-active btn-primary'
				: ''}">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('justifyRight')}
			>
				<WashTooltip tooltipText="Align Right"
					><LucideTextAlignEnd className="size-4" /></WashTooltip
				>
			</button>
		</div>
		<div class="btn join-item btn-xs h-7 {activeStates.justifyFull
				? 'btn-active btn-primary'
				: ''}">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('justifyFull')}
			>
				<WashTooltip tooltipText="Justify"
					><LucideTextAlignJustify
						className="size-4"
					/></WashTooltip
				>
			</button>
		</div>
	</div>

	<div class="h-5 w-px bg-base-300"></div>

	<!-- Lists & Indent -->
	<div class="join flex">
		<div class="btn join-item btn-xs h-7 {activeStates.insertOrderedList
				? 'btn-active btn-primary'
				: ''}">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('insertOrderedList')}
			>
				<WashTooltip tooltipText="Numbered List"
					><LucideListOrdered className="size-4" /></WashTooltip
				>
			</button>
		</div>
		<div class="btn join-item btn-xs h-7 {activeStates.insertUnorderedList
				? 'btn-active btn-primary'
				: ''}">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('insertUnorderedList')}
			>
				<WashTooltip tooltipText="Bulleted List"
					><LucideList className="size-4" /></WashTooltip
				>
			</button>
		</div>
		<div class="btn join-item btn-xs h-7">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('outdent')}
			>
				<WashTooltip tooltipText="Decrease Indent">
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
				</WashTooltip>
			</button>
		</div>
		<div class="btn join-item btn-xs h-7">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('indent')}
			>
				<WashTooltip tooltipText="Increase Indent">
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
				</WashTooltip>
			</button>
		</div>
	</div>

	<div class="h-5 w-px bg-base-300"></div>

	<!-- Insert tools -->
	<div class="join flex">
		<div class="btn join-item btn-xs h-7">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('link')}
			>
				<WashTooltip tooltipText="Insert Link"
					><LucideLink className="size-4" /></WashTooltip
				>
			</button>
		</div>
		<div class="btn join-item btn-xs h-7">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('unlink')}
			>
				<WashTooltip tooltipText="Remove Link">
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
				</WashTooltip>
			</button>
		</div>
		<div class="btn join-item btn-xs h-7">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('image')}
			>
				<WashTooltip tooltipText="Insert Image"
					><LucideImage className="size-4" /></WashTooltip
				>
			</button>
		</div>
		<div class="btn join-item btn-xs h-7">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('table')}
			>
				<WashTooltip tooltipText="Insert Table"
					><LucideTable2 className="size-4" /></WashTooltip
				>
			</button>
		</div>
		<div class="btn join-item btn-xs h-7">
			<button
				type="button"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => execute('horizontalRule')}
			>
				<WashTooltip tooltipText="Horizontal Line">
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
				</WashTooltip>
			</button>
		</div>
	</div>

	<!-- Clear formatting -->
	<button
		type="button"
		class="btn h-7 btn-ghost btn-xs"
		onmousedown={(e) => e.preventDefault()}
		onclick={() => execute('removeFormat')}
	>
		<WashTooltip tooltipText="Clear Formatting">
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
		</WashTooltip>
	</button>

	<!-- Table tools (when in table) -->
	{#if isInTable}
		<div class="h-5 w-px bg-base-300"></div>
		<div class="join flex">
			<div class="btn join-item btn-xs h-7">
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execute('tableAddRowBelow')}
				>
					<WashTooltip tooltipText="Add Row"
						><span class="text-[10px] font-semibold">+Row</span
						></WashTooltip
					>
				</button>
			</div>
			<div class="btn join-item btn-xs h-7">
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execute('tableRemoveRow')}
				>
					<WashTooltip tooltipText="Delete Row"
						><span class="text-[10px] font-semibold">−Row</span
						></WashTooltip
					>
				</button>
			</div>
			<div class="btn join-item btn-xs h-7">
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execute('tableAddColRight')}
				>
					<WashTooltip tooltipText="Add Column"
						><span class="text-[10px] font-semibold">+Col</span
						></WashTooltip
					>
				</button>
			</div>
			<div class="btn join-item btn-xs h-7">
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execute('tableRemoveCol')}
				>
					<WashTooltip tooltipText="Delete Column"
						><span class="text-[10px] font-semibold">−Col</span
						></WashTooltip
					>
				</button>
			</div>
		</div>
	{/if}
</div>
