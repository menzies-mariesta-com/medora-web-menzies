<script lang="ts">
	let { checked, groupName, className, children } = $props<{
        checked: 'true' | 'false';
        groupName: string;
		className?: string;
		children: () => void;
	}>();
</script>

<div class="d-collapse d-collapse-plus bg-base-100 border border-base-300 {className}">
  <input type="radio" name={groupName} {checked} />
  {@render children()}
</div>