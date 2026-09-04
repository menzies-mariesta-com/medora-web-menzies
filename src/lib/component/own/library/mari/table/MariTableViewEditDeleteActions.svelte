<script lang="ts">
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import MariTableIconAction from '$lib/component/own/library/mari/table/MariTableIconAction.svelte';
	import MariTableRowActionGroup from '$lib/component/own/library/mari/table/MariTableRowActionGroup.svelte';
	import { m } from '$lib/paraglide/messages';

	let {
		onView,
		onEdit,
		onDelete,
		disabled = false,
		viewDisabled = false,
		editDisabled = false,
		deleteDisabled = false,
		viewLoading = false,
		editLoading = false,
		deleteLoading = false,
		viewTooltip = m.mari_table_tooltip_view(),
		editTooltip = m.mari_table_tooltip_edit(),
		deleteTooltip = m.mari_table_tooltip_delete()
	}: {
		onView: () => void;
		onEdit: () => void;
		onDelete: () => void;
		disabled?: boolean;
		viewDisabled?: boolean;
		editDisabled?: boolean;
		deleteDisabled?: boolean;
		viewLoading?: boolean;
		editLoading?: boolean;
		deleteLoading?: boolean;
		viewTooltip?: string;
		editTooltip?: string;
		deleteTooltip?: string;
	} = $props();
</script>

<MariTableRowActionGroup>
	<MariTableIconAction
		tooltipText={viewTooltip}
		color="ghost"
		disabled={disabled || viewDisabled}
		loading={viewLoading}
		onClick={onView}
	>
		{#snippet icon()}
			<LucideEye className="size-4" />
		{/snippet}
	</MariTableIconAction>
	<MariTableIconAction
		tooltipText={editTooltip}
		color="accent"
		disabled={disabled || editDisabled}
		loading={editLoading}
		onClick={onEdit}
	>
		{#snippet icon()}
			<LucidePencil className="size-4" />
		{/snippet}
	</MariTableIconAction>
	<MariTableIconAction
		tooltipText={deleteTooltip}
		color="error"
		disabled={disabled || deleteDisabled}
		loading={deleteLoading}
		onClick={onDelete}
	>
		{#snippet icon()}
			<LucideTrash2 className="size-4" />
		{/snippet}
	</MariTableIconAction>
</MariTableRowActionGroup>
