<script lang="ts">
	let { number, className } = $props<{
        number: string;
		className?: string;
	}>();
</script>

<span class="d-countdown {className}">
  <span style="--d-value:{number};" aria-live="polite" aria-label="{number}">{number}</span>
</span>