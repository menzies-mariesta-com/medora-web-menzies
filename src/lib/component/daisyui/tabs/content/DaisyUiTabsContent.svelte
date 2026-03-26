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
	class="d-tab-content bg-base-100 {className}"
	role="tabpanel"
	id={`${tabName}-content`}
	aria-labelledby={tabName}
	class:active
>
	{@render children?.()}
</div>
