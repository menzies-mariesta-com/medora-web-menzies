<script lang="ts">
	let { className, checked = $bindable() } = $props<{
		className?: string;
		checked?: boolean;
	}>();
</script>

<input type="checkbox" bind:checked class="d-checkbox {className}" />