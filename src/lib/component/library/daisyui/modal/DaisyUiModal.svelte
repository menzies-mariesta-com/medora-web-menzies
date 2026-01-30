<script lang="ts">
	let {  groupName, className, children } = $props<{
        groupName: string;
		className?: string;
		children: () => void;
	}>();
</script>

<input type="checkbox" id="{groupName}" class="d-modal-toggle" />

<div id="{groupName}" role="dialog" class="d-modal {className}">
  {@render children()}
</div>