<script lang="ts">
	let { children, className } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<div class="d-avatar d-chat-image">
	<div class="w-10 rounded-full">
		{@render children()}
	</div>
</div>
