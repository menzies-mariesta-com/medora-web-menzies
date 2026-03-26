<script lang="ts">
	let {
		className,
		type = 'button',
		onClick,
		disabled,
		children
	} = $props<{
		className?: string;
		type?: 'button' | 'submit' | 'reset';
		onClick?: () => void;
		disabled?: boolean;
		children?: () => void;
	}>();
</script>

<button class="d-btn {className}" {type} onclick={onClick} {disabled}>
	{@render children?.()}
</button>
