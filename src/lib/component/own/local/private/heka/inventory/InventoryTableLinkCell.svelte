<script lang="ts">
	let { href, label }: { href: string; label: string } = $props();
</script>

<a class="d-link d-link-primary text-sm" {href}>{label}</a>
