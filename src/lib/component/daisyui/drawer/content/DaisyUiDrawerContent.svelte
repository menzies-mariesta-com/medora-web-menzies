<script lang="ts">
	import LucidePanelLeft from '$lib/component/own/library/lucide/LucidePanelLeft.svelte';
	import DaisyUiLabel from '../../label/DaisyUiLabel.svelte';

	let { drawerName, className, labelClassName, pageName, children } =
		$props<{
			drawerName: string;
			className?: string;
			labelClassName?: string;
			pageName?: string;

			children: () => void;
		}>();

	let pagerName = 'Hello';
</script>

<div class="d-drawer-content {className} ">
	<!-- Page content here -->
	<div class="mx-4 mt-3 flex gap-5">
		<DaisyUiLabel
			forText={drawerName}
			className="d-btn d-btn-primary  {labelClassName} lg:hidden "
		>
			<LucidePanelLeft />
		</DaisyUiLabel>

		{#if pagerName}
			<h1 class="my-ft-h1 opacity-50">
				Page : {pagerName}
			</h1>
		{/if}
	</div>
	<div class="w-full">
		{@render children()}
	</div>
</div>
