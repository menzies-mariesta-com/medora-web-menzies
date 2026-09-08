<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import LVisitListDialogContent from '$lib/component/own/local/private/medora/emr/LVisitListDialogContent.svelte';

	let {
		hospitalId,
		onVisitSelected,
		label = m.select_visit(),
		className = ''
	} = $props<{
		hospitalId: string | undefined;
		onVisitSelected: (data: {
			visitId: number;
			patientName: string;
		}) => void;
		label?: string;
		className?: string;
	}>();

	async function handleClick() {
		if (!hospitalId) return;
		const result = await dialogService.open<{
			visitId: number;
			patientName: string;
		}>({
			title: m.choose_visit(),
			component: LVisitListDialogContent,
			fullScreen: true
		});
		if (result?.confirmed && result.data) {
			onVisitSelected(result.data);
		}
	}
</script>

<WashButton
	className="btn-primary btn-sm {className}"
	onClick={handleClick}
	disabled={!hospitalId}
>
	{label}
</WashButton>
