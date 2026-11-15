<script lang="ts">
	import medoraLogo from '$lib/asset/image/medora-logo.svg';

	let {
		size = 'md',
		class: className = ''
	}: {
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	} = $props();

	const sizeClass = $derived(
		size === 'lg' ? 'size-11' : size === 'sm' ? 'size-7' : 'size-9'
	);
</script>

<img
	src={medoraLogo}
	alt=""
	width="512"
	height="512"
	class="shrink-0 rounded-[22%] shadow-sm {sizeClass} {className}"
	decoding="async"
	aria-hidden="true"
/>
