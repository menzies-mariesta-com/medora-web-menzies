<!-- <form class="filter">
  <input class="btn btn-square" type="reset" value="×"/>
  <input class="btn" type="radio" name="frameworks" aria-label="Svelte"/>
  <input class="btn" type="radio" name="frameworks" aria-label="Vue"/>
  <input class="btn" type="radio" name="frameworks" aria-label="React"/>
</form> -->

<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children?: () => string;
	}>();
</script>

<form class="filter {className}">
	{@render children()}
</form>
