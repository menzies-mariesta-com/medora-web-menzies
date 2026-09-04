<script lang="ts">
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import MariTableIconAction from '$lib/component/own/library/mari/table/MariTableIconAction.svelte';
	import MariTableRowActionGroup from '$lib/component/own/library/mari/table/MariTableRowActionGroup.svelte';
	import { m } from '$lib/paraglide/messages';

	let {
		onEdit,
		onDelete,
		disabled = false,
		editDisabled = false,
		deleteDisabled = false,
		deleteLoading = false,
		editTooltip = m.mari_table_tooltip_edit(),
		deleteTooltip = m.mari_table_tooltip_delete()
	}: {
		onEdit: () => void;
		onDelete: () => void;
		disabled?: boolean;
		editDisabled?: boolean;
		deleteDisabled?: boolean;
		deleteLoading?: boolean;
		editTooltip?: string;
		deleteTooltip?: string;
	} = $props();
</script>

<MariTableRowActionGroup>
	<MariTableIconAction
		tooltipText={editTooltip}
		color="accent"
		disabled={disabled || editDisabled}
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
