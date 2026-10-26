<script lang="ts">
	import {
		otStatusByCode,
		otStatusById
	} from '$lib/tool/operation-theatre/ot-status.util';

	let {
		statusId = null,
		code = null,
		label = null
	}: {
		statusId?: number | null;
		code?: string | null;
		label?: string | null;
	} = $props();

	const view = $derived(
		statusId != null ? otStatusById(statusId) : otStatusByCode(code)
	);
</script>

<span class="badge badge-sm {view.badgeClass} whitespace-nowrap">
	{label ?? view.label}
</span>
