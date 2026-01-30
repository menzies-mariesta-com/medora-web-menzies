<script lang="ts">
	let { wantCamera, className, children } = $props<{
		wantCamera: boolean;
		className?: string;
		children: () => void;
	}>();
</script>

<div class="d-mockup-phone">
	{#if wantCamera}
		<div class="d-mockup-phone-camera"></div>
	{/if}
	<div class="d-mockup-phone-display {className}">
		{@render children()}
	</div>
</div>
