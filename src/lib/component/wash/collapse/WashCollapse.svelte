<script lang="ts">
	let { checked, groupName, className, children } = $props<{
		checked: 'true' | 'false';
		groupName: string;
		className?: string;
		children: () => void;
	}>();
</script>

<div
	class="collapse-plus collapse border border-base-300 bg-base-100 {className}"
>
	<input type="radio" name={groupName} {checked} />
	{@render children()}
</div>
