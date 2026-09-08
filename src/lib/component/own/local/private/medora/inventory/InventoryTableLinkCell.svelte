<script lang="ts">
	let { href, label }: { href: string; label: string } = $props();
</script>

<a class="link text-sm link-primary" {href}>{label}</a>
