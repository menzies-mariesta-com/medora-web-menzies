<script lang="ts">
    let { children, className } = $props<{
        className?: string;
        children: () => void;
    }>();
</script>

<div class="d-dock {className}">
    {@render children()}
</div>