<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;

	let { confirm, cancel }: DialogSlotProps = $props();

	function handleExtend() {
		void confirm({ action: 'extend' });
	}
</script>

<p class="px-4 py-3 text-sm text-base-content/85">
	{msg.session_expire_warn_message()}
</p>

<WashDialogFooter>
	<WashButton
		type="button"
		variant="ghost"
		className="cursor-pointer"
		onClick={cancel}
	>
		{msg.session_expire_warn_dismiss()}
	</WashButton>
	<WashButton
		type="button"
		variant="primary"
		className="cursor-pointer"
		onClick={handleExtend}
	>
		{msg.session_expire_warn_extend()}
	</WashButton>
</WashDialogFooter>
