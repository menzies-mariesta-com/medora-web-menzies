<script lang="ts">
	let { tabName, className, active, children } = $props<{
		tabName: string;
		className?: string;
		active?: boolean;
		children?: () => void;
	}>();
</script>

<!-- Each tab content linked to its corresponding radio via id -->
<div
	class="d-tab-content border-base-300 bg-base-100 p-6 {className}"
	role="tabpanel"
	id={`${tabName}-content`}
	aria-labelledby={tabName}
	class:active
>
	{@render children?.()}
</div>
