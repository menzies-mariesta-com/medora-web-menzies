<script lang="ts">
    let { className, children} = $props<{
        className?: string;
        children: () => void;
    }>();
</script>

<div class="d-hero-content {className}">
    {@render children()}
</div>

