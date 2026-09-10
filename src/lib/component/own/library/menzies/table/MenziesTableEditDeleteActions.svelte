<script lang="ts">
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import MenziesTableRowActionGroup from '$lib/component/own/library/menzies/table/MenziesTableRowActionGroup.svelte';
	import { m } from '$lib/paraglide/messages';

	let {
		onEdit,
		onDelete,
		disabled = false,
		editDisabled = false,
		deleteDisabled = false,
		editLoading = false,
		deleteLoading = false,
		editTooltip = m.menzies_table_tooltip_edit(),
		deleteTooltip = m.menzies_table_tooltip_delete()
	}: {
		onEdit: () => void;
		onDelete: () => void;
		disabled?: boolean;
		editDisabled?: boolean;
		deleteDisabled?: boolean;
		editLoading?: boolean;
		deleteLoading?: boolean;
		editTooltip?: string;
		deleteTooltip?: string;
	} = $props();
</script>

<MenziesTableRowActionGroup>
	<MenziesTableIconAction
		tooltipText={editTooltip}
		color="secondary"
		disabled={disabled || editDisabled}
		loading={editLoading}
		loadingText=""
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
		loadingText=""
		onClick={onDelete}
	>
		{#snippet icon()}
			<LucideTrash2 className="size-3.5" />
		{/snippet}
	</MenziesTableIconAction>
</MenziesTableRowActionGroup>
