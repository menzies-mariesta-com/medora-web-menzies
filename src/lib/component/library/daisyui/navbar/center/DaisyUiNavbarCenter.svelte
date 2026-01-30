<script lang="ts">
    let {className, children} = $props<{
        className?: string;
        children: () => void;
    }>();
</script>

<div class="d-navbar-center {className}">
   {@render children()}
  </div>