<script lang="ts">
	import type { Snippet } from 'svelte';
	import WashDialog from '$lib/component/wash/dialog/WashDialog.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;

	let {
		open,
		onClose,
		onSave,
		table,
		description = '',
		isSaving = false
	}: {
		open: boolean;
		onClose: () => void;
		onSave: () => void | Promise<void>;
		table: Snippet;
		description?: string;
		isSaving?: boolean;
	} = $props();
</script>

{#if open}
	<WashDialog
		id="nursing-emr-order-pending-dialog"
		open={true}
		{onClose}
		title={msg.cpoe_order_pending_dialog_title()}
		{description}
		showActions={false}
		boxClassName="h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none"
	>
		<div class="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-1">
			{@render table()}
			<WashDialogFooter>
				<WashButton
					variant="ghost"
					onClick={onClose}
					disabled={isSaving}
				>
					{m.cancel()}
				</WashButton>
				<WashButton
					className="btn-primary px-8"
					onClick={onSave}
					disabled={isSaving}
				>
					{m.save()}
				</WashButton>
			</WashDialogFooter>
		</div>
	</WashDialog>
{/if}
