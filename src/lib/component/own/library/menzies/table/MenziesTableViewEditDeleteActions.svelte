<script lang="ts">
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import MenziesTableRowActionGroup from '$lib/component/own/library/menzies/table/MenziesTableRowActionGroup.svelte';
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
		viewTooltip = m.menzies_table_tooltip_view(),
		editTooltip = m.menzies_table_tooltip_edit(),
		deleteTooltip = m.menzies_table_tooltip_delete()
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

<MenziesTableRowActionGroup>
	<MenziesTableIconAction
		tooltipText={viewTooltip}
		color="primary"
		disabled={disabled || viewDisabled}
		loading={viewLoading}
		onClick={onView}
	>
		{#snippet icon()}
			<LucideEye className="size-3.5" />
		{/snippet}
	</MenziesTableIconAction>
	<MenziesTableIconAction
		tooltipText={editTooltip}
		color="secondary"
		disabled={disabled || editDisabled}
		loading={editLoading}
		onClick={onEdit}
	>
		{#snippet icon()}
			<LucidePencil className="size-3.5" />
		{/snippet}
	</MenziesTableIconAction>
	<MenziesTableIconAction
		tooltipText={deleteTooltip}
		color="error"
		disabled={disabled || deleteDisabled}
		loading={deleteLoading}
		onClick={onDelete}
	>
		{#snippet icon()}
			<LucideTrash2 className="size-3.5" />
		{/snippet}
	</MenziesTableIconAction>
</MenziesTableRowActionGroup>
