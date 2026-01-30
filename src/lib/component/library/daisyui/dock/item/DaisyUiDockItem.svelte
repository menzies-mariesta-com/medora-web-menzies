<script lang="ts">
	import DaisyUiButton from "../../button/DaisyUiButton.svelte";

    let { dockActive,  className, children  } = $props<{
        dockActive: true | false;
        className?: string;
        children: () => void;
    }>();

    function handleDockActive() {
        dockActive = !dockActive
    }
</script>

<DaisyUiButton onClick={handleDockActive} className="{dockActive ? 'd-dock-active' : ''} {className}" >
    {@render children()}
</DaisyUiButton>