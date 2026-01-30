<script lang="ts">
	let { className, checked } = $props<{
		className?: string;
		checked?: boolean;
	}>();
</script>

<input type="checkbox" {checked} class="d-checkbox {className}" />