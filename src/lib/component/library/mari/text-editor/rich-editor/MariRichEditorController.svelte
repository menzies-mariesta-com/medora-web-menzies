<script lang="ts">
	import DaisyUiJoin from '$lib/component/library/daisyui/join/DaisyUiJoin.svelte';
	import DaisyUiJoinItem from '$lib/component/library/daisyui/join/item/DaisyUiJoinItem.svelte';
	import DaisyUiTooltip from '$lib/component/library/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideAlignCenter from '$lib/component/library/lucide/LucideAlignCenter.svelte';
	import LucideBold from '$lib/component/library/lucide/LucideBold.svelte';
	import LucideImage from '$lib/component/library/lucide/LucideImage.svelte';
	import LucideItalic from '$lib/component/library/lucide/LucideItalic.svelte';
	import LucideLink from '$lib/component/library/lucide/LucideLink.svelte';
	import LucideList from '$lib/component/library/lucide/LucideList.svelte';
	import LucideListOrdered from '$lib/component/library/lucide/LucideListOrdered.svelte';
	import LucideStrikeThrough from '$lib/component/library/lucide/LucideStrikeThrough.svelte';
	import LucideSubscript from '$lib/component/library/lucide/LucideSubscript.svelte';
	import LucideSuperscript from '$lib/component/library/lucide/LucideSuperscript.svelte';
	import LucideTable2 from '$lib/component/library/lucide/LucideTable2.svelte';
	import LucideTextAlignEnd from '$lib/component/library/lucide/LucideTextAlignEnd.svelte';
	import LucideTextAlignJustify from '$lib/component/library/lucide/LucideTextAlignJustify.svelte';
	import LucideTextAlignStart from '$lib/component/library/lucide/LucideTextAlignStart.svelte';
	import LucideType from '$lib/component/library/lucide/LucideType.svelte';
	import LucideUnderline from '$lib/component/library/lucide/LucideUnderline.svelte';
	import { createEventDispatcher } from 'svelte';

	type CommandName =
		| 'paragraph'
		| 'heading1'
		| 'heading2'
		| 'heading3'
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
		| 'tableAddRowBelow'
		| 'tableRemoveRow'
		| 'tableAddColRight'
		| 'tableRemoveCol'
		| 'link'
		| 'image'
		| 'table';

	type ActiveStates = Partial<Record<CommandName, boolean>>;

	let { activeStates = {}, fontSize = 14, isInTable = false } = $props<{
		activeStates?: ActiveStates;
		fontSize?: number;
		isInTable?: boolean;
	}>();

	const dispatch = createEventDispatcher<{ command: { name: CommandName; value?: number } }>();

	function execute(name: CommandName) {
		dispatch('command', { name });
	}
</script>

<div class="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
	<!-- Block level / heading -->
	<DaisyUiJoin>
		<DaisyUiJoinItem
			className="d-btn-sm {activeStates.paragraph ? 'd-btn-active d-btn-primary' : ''}"
		>
			<button type="button" on:mousedown|preventDefault on:click={() => execute('paragraph')}>
				<DaisyUiTooltip className="" tooltipText="Paragraph">
					<span class="px-1 text-xs font-semibold">P</span>
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-sm {activeStates.heading1 ? 'd-btn-active d-btn-primary' : ''}"
		>
			<button type="button" on:mousedown|preventDefault on:click={() => execute('heading1')}>
				<DaisyUiTooltip className="" tooltipText="Heading 1">
					<span class="px-1 text-xs font-semibold">H1</span>
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-sm {activeStates.heading2 ? 'd-btn-active d-btn-primary' : ''}"
		>
			<button type="button" on:mousedown|preventDefault on:click={() => execute('heading2')}>
				<DaisyUiTooltip className="" tooltipText="Heading 2">
					<span class="px-1 text-xs font-semibold">H2</span>
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-sm {activeStates.heading3 ? 'd-btn-active d-btn-primary' : ''}"
		>
			<button type="button" on:mousedown|preventDefault on:click={() => execute('heading3')}>
				<DaisyUiTooltip className="" tooltipText="Heading 3">
					<span class="px-1 text-xs font-semibold">H3</span>
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
	</DaisyUiJoin>

	<!-- Font size: [-] [input] [+] -->
	<DaisyUiJoin>
		<DaisyUiJoinItem className="d-btn-sm">
			<button
				type="button"
				on:mousedown|preventDefault
				on:click={() => execute('fontSizeDecrease')}
			>
				<DaisyUiTooltip className="" tooltipText="Decrease font size">
					<span class="px-1 text-xs font-semibold">-</span>
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-sm">
			<input
				type="number"
				min="8"
				max="200"
				value={fontSize}
				class="d-input d-input-xs d-input-bordered w-16 text-center"
				on:change={(e) => {
					const target = e.currentTarget as HTMLInputElement;
					const val = Number(target.value);
					if (!Number.isNaN(val)) {
						dispatch('command', { name: 'fontSizeSet', value: val });
					}
				}}
			/>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-sm">
			<button
				type="button"
				on:mousedown|preventDefault
				on:click={() => execute('fontSizeIncrease')}
			>
				<DaisyUiTooltip className="" tooltipText="Increase font size">
					<span class="px-1 text-xs font-semibold">+</span>
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
	</DaisyUiJoin>

	<!-- Inline styles -->
	<DaisyUiJoin>
		<DaisyUiJoinItem
			className="d-btn-sm {activeStates.bold ? 'd-btn-active d-btn-primary' : ''}"
		>
			<button type="button" on:mousedown|preventDefault on:click={() => execute('bold')}>
				<DaisyUiTooltip className="" tooltipText="Bold">
					<LucideBold />
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-sm {activeStates.italic ? 'd-btn-active d-btn-primary' : ''}"
		>
			<button type="button" on:mousedown|preventDefault on:click={() => execute('italic')}>
				<DaisyUiTooltip className="" tooltipText="Italic">
					<LucideItalic />
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-sm {activeStates.underline ? 'd-btn-active d-btn-primary' : ''}"
		>
			<button type="button" on:mousedown|preventDefault on:click={() => execute('underline')}>
				<DaisyUiTooltip className="" tooltipText="Underline">
					<LucideUnderline />
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-sm {activeStates.strikeThrough ? 'd-btn-active d-btn-primary' : ''}"
		>
			<button type="button" on:mousedown|preventDefault on:click={() => execute('strikeThrough')}>
				<DaisyUiTooltip className="" tooltipText="Strikethrough">
					<LucideStrikeThrough />
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
	</DaisyUiJoin>

	<DaisyUiJoin>
		<DaisyUiJoinItem
			className="d-btn-sm {activeStates.justifyLeft ? 'd-btn-active d-btn-primary' : ''}"
		>
			<button type="button" on:mousedown|preventDefault on:click={() => execute('justifyLeft')}>
				<DaisyUiTooltip className="" tooltipText="Align left">
					<LucideTextAlignStart />
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-sm {activeStates.justifyCenter ? 'd-btn-active d-btn-primary' : ''}"
		>
			<button type="button" on:mousedown|preventDefault on:click={() => execute('justifyCenter')}>
				<DaisyUiTooltip className="" tooltipText="Align center">
					<LucideAlignCenter />
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-sm {activeStates.justifyRight ? 'd-btn-active d-btn-primary' : ''}"
		>
			<button type="button" on:mousedown|preventDefault on:click={() => execute('justifyRight')}>
				<DaisyUiTooltip className="" tooltipText="Align right">
					<LucideTextAlignEnd />
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-sm {activeStates.justifyFull ? 'd-btn-active d-btn-primary' : ''}"
		>
			<button type="button" on:mousedown|preventDefault on:click={() => execute('justifyFull')}>
				<DaisyUiTooltip className="" tooltipText="Justify">
					<LucideTextAlignJustify />
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
	</DaisyUiJoin>

	<DaisyUiJoin>
		<DaisyUiJoinItem
			className="d-btn-sm {activeStates.subscript ? 'd-btn-active d-btn-primary' : ''}"
		>
			<button type="button" on:mousedown|preventDefault on:click={() => execute('subscript')}>
				<DaisyUiTooltip className="" tooltipText="Subscript">
					<LucideSubscript />
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-sm {activeStates.superscript ? 'd-btn-active d-btn-primary' : ''}"
		>
			<button type="button" on:mousedown|preventDefault on:click={() => execute('superscript')}>
				<DaisyUiTooltip className="" tooltipText="Superscript">
					<LucideSuperscript />
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
	</DaisyUiJoin>

	<DaisyUiJoin>
		<DaisyUiJoinItem
			className="d-btn-sm {activeStates.insertOrderedList ? 'd-btn-active d-btn-primary' : ''}"
		>
			<button type="button" on:mousedown|preventDefault on:click={() => execute('insertOrderedList')}>
				<DaisyUiTooltip className="" tooltipText="Numbered list">
					<LucideListOrdered />
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem
			className="d-btn-sm {activeStates.insertUnorderedList ? 'd-btn-active d-btn-primary' : ''}"
		>
			<button
				type="button"
				on:mousedown|preventDefault
				on:click={() => execute('insertUnorderedList')}
			>
				<DaisyUiTooltip className="" tooltipText="Bulleted list">
					<LucideList />
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
	</DaisyUiJoin>

	<DaisyUiJoin>
		<DaisyUiJoinItem className="d-btn-sm">
			<button type="button" on:mousedown|preventDefault on:click={() => execute('link')}>
				<DaisyUiTooltip className="" tooltipText="Insert link">
					<LucideLink />
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-sm">
			<button type="button" on:mousedown|preventDefault on:click={() => execute('table')}>
				<DaisyUiTooltip className="" tooltipText="Insert table">
					<LucideTable2 />
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>

		<DaisyUiJoinItem className="d-btn-sm">
			<button type="button" on:mousedown|preventDefault on:click={() => execute('image')}>
				<DaisyUiTooltip className="" tooltipText="Insert image">
					<LucideImage />
				</DaisyUiTooltip>
			</button>
		</DaisyUiJoinItem>
	</DaisyUiJoin>

	<!-- Table tools (only when cursor is inside a table) -->
	{#if isInTable}
		<DaisyUiJoin>
			<DaisyUiJoinItem className="d-btn-sm">
				<button
					type="button"
					on:mousedown|preventDefault
					on:click={() => execute('tableAddRowBelow')}
				>
					<DaisyUiTooltip className="" tooltipText="Add row below">
						<span class="px-1 text-xs font-semibold">Row+</span>
					</DaisyUiTooltip>
				</button>
			</DaisyUiJoinItem>
			<DaisyUiJoinItem className="d-btn-sm">
				<button
					type="button"
					on:mousedown|preventDefault
					on:click={() => execute('tableRemoveRow')}
				>
					<DaisyUiTooltip className="" tooltipText="Delete row">
						<span class="px-1 text-xs font-semibold">Row-</span>
					</DaisyUiTooltip>
				</button>
			</DaisyUiJoinItem>
			<DaisyUiJoinItem className="d-btn-sm">
				<button
					type="button"
					on:mousedown|preventDefault
					on:click={() => execute('tableAddColRight')}
				>
					<DaisyUiTooltip className="" tooltipText="Add column right">
						<span class="px-1 text-xs font-semibold">Col+</span>
					</DaisyUiTooltip>
				</button>
			</DaisyUiJoinItem>
			<DaisyUiJoinItem className="d-btn-sm">
				<button
					type="button"
					on:mousedown|preventDefault
					on:click={() => execute('tableRemoveCol')}
				>
					<DaisyUiTooltip className="" tooltipText="Delete column">
						<span class="px-1 text-xs font-semibold">Col-</span>
					</DaisyUiTooltip>
				</button>
			</DaisyUiJoinItem>
		</DaisyUiJoin>
	{/if}
</div>
