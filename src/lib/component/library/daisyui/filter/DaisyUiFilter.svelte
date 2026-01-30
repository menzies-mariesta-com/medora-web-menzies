<!-- <form class="d-filter">
  <input class="d-btn d-btn-square" type="reset" value="×"/>
  <input class="d-btn" type="radio" name="frameworks" aria-label="Svelte"/>
  <input class="d-btn" type="radio" name="frameworks" aria-label="Vue"/>
  <input class="d-btn" type="radio" name="frameworks" aria-label="React"/>
</form> -->

<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children?: () => string;
	}>();
</script>

<form class="d-filter {className}">
	{@render children()}
</form>
