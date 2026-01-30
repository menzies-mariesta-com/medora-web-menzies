<script lang="ts">
    let {className, children} = $props<{
        className?: string;
        children: () => void;
    }>();
</script>


<aside class="{className}">
    {@render children()}
  </aside>