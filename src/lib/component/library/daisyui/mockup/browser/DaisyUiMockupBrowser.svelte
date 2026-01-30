<script lang="ts">
	let { inputText, className, contentClassName, children } = $props<{
		inputText?: string;
		className?: string;
		contentClassName?: string;
		children: () => void;
	}>();
</script>

<div class="d-mockup-browser {className}">
	<div class="d-mockup-browser-toolbar">
		<div class="d-input">{inputText}</div>
	</div>
	<div class={contentClassName}>
		{@render children()}
	</div>
</div>
