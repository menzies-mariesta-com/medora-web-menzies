<script lang="ts">
    let {className, children} = $props<{
        className?: string;
        children: () => void;
    }>();
</script>

<div class="d-navbar bg-base-200 shadow-md {className}">
  {@render children()}
</div>