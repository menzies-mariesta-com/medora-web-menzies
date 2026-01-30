<script lang="ts">

    let { className, children  } = $props<{
        className?: string;
        children: () => void;
    }>();


</script>


<span class="d-dock-label {className}">{@render children()}</span>