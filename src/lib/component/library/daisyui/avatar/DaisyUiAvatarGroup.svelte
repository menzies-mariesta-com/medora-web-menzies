<script lang="ts">
	import DaisyUiAvatar from './DaisyUiAvatar.svelte';

	let { avatars, className } = $props<{
		className?: string;
		avatars: {
			src?: string;
			alt?: string;
			shape?: string;
			size?: string;
			placeholder?: string | number;
		}[];
	}>();
</script>

<div class="d-avatar-group -space-x-6 {className}">
	{#each avatars as avatar}
		<DaisyUiAvatar {...avatar} />
	{/each}
</div>
