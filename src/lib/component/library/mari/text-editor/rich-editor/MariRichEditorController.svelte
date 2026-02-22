<script>
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
</script>

<div class="flex justify-between px-5 py-3">
	<DaisyUiJoin>
		<DaisyUiJoinItem className="d-btn-sm">
			<DaisyUiTooltip className="" tooltipText="Bold">
				<LucideType />
			</DaisyUiTooltip>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-sm">
			<DaisyUiTooltip className="" tooltipText="Italic">
				<LucideItalic />
			</DaisyUiTooltip>
		</DaisyUiJoinItem>
	</DaisyUiJoin>

	<DaisyUiJoin>
		<DaisyUiJoinItem className="d-btn-sm">
			<DaisyUiTooltip className="" tooltipText="Bold">
				<LucideBold />
			</DaisyUiTooltip>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-sm">
			<DaisyUiTooltip className="" tooltipText="Italic">
				<LucideItalic />
			</DaisyUiTooltip>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-sm">
			<DaisyUiTooltip className="" tooltipText="Underline">
				<LucideUnderline />
			</DaisyUiTooltip>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-sm">
			<DaisyUiTooltip className="" tooltipText="Strike Through">
				<LucideStrikeThrough />
			</DaisyUiTooltip>
		</DaisyUiJoinItem>
	</DaisyUiJoin>

	<DaisyUiJoin>
		<DaisyUiJoinItem className="d-btn-sm">
			<DaisyUiTooltip className="" tooltipText="Align Start">
				<LucideTextAlignStart />
			</DaisyUiTooltip>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-sm">
			<DaisyUiTooltip className="" tooltipText="Align Center">
				<LucideAlignCenter />
			</DaisyUiTooltip>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-sm">
			<DaisyUiTooltip className="" tooltipText="Align End">
				<LucideTextAlignEnd />
			</DaisyUiTooltip>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-sm">
			<DaisyUiTooltip className="" tooltipText="Align Justify">
				<LucideTextAlignJustify />
			</DaisyUiTooltip>
		</DaisyUiJoinItem>
	</DaisyUiJoin>

	<DaisyUiJoin>
		<DaisyUiJoinItem className="d-btn-sm">
			<DaisyUiTooltip className="" tooltipText="Subscript">
				<LucideSubscript />
			</DaisyUiTooltip>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-sm">
			<DaisyUiTooltip className="" tooltipText="Superscript">
				<LucideSuperscript />
			</DaisyUiTooltip>
		</DaisyUiJoinItem>
	</DaisyUiJoin>

	<DaisyUiJoin>
		<DaisyUiJoinItem className="d-btn-sm">
			<DaisyUiTooltip className="" tooltipText="List Order">
				<LucideListOrdered />
			</DaisyUiTooltip>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-sm">
			<DaisyUiTooltip className="" tooltipText="List Unorder">
				<LucideList />
			</DaisyUiTooltip>
		</DaisyUiJoinItem>
	</DaisyUiJoin>

	<DaisyUiJoin>
		<DaisyUiJoinItem className="d-btn-sm">
			<DaisyUiTooltip className="" tooltipText="Link">
				<LucideLink />
			</DaisyUiTooltip>
		</DaisyUiJoinItem>
		<DaisyUiJoinItem className="d-btn-sm">
			<DaisyUiTooltip className="" tooltipText="Table">
				<LucideTable2 />
			</DaisyUiTooltip>
		</DaisyUiJoinItem>

		<DaisyUiJoinItem className="d-btn-sm">
			<DaisyUiTooltip className="" tooltipText="Image">
				<LucideImage />
			</DaisyUiTooltip>
		</DaisyUiJoinItem>
	</DaisyUiJoin>
</div>
