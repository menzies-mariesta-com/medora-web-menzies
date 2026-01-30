<script lang="ts">
	let { groupName, className, children } = $props<{
        groupName: string;
		className?: string;
		children: () => void;
	}>();
</script>

<div class="d-modal-box {className}">
    <div>
      <label for="{groupName}" class="d-btn d-btn-sm d-btn-circle d-btn-ghost absolute right-2 top-2">✕</label>
    </div>
    {@render children()}
  </div>