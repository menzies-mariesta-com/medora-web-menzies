<script lang="ts">
	let {  children, className } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<div class="d-chat-image d-avatar">
	<div class="w-10 rounded-full">

		{@render children()}
	</div>
</div>