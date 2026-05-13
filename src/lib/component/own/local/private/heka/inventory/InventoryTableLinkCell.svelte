<script lang="ts">
	let { href, label }: { href: string; label: string } = $props();
</script>

<a class="d-link text-sm d-link-primary" {href}>{label}</a>
