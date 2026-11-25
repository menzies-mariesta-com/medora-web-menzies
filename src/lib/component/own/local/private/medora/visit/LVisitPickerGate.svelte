<script lang="ts">
	import LVisitListDialogContent from '$lib/component/own/local/private/medora/emr/LVisitListDialogContent.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { EmrVisitListScope } from '$lib/model/type/medora/emr/visit-list.type';

	let { onVisitSelected, listScope = 'doctor' as EmrVisitListScope } =
		$props<{
			onVisitSelected: (data: {
				visitId: string;
				patientName: string;
			}) => void;
			listScope?: EmrVisitListScope;
		}>();
</script>

<div class={TableEnum.HEIGHT}>
	<LVisitListDialogContent
		{listScope}
		confirm={(data) =>
			onVisitSelected(
				data as { visitId: string; patientName: string }
			)}
		cancel={() => {}}
	/>
</div>
