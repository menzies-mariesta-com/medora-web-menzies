<script lang="ts">
	let { className, children, backgroundImage } = $props<{
		className?: string;
		children: () => void;
		backgroundImage?: string;
	}>();
</script>

<div
	class="d-hero min-h-screen bg-base-200 {className}"
	style="background-image: url({backgroundImage});"
>
	{@render children()}
</div>
