<script lang="ts">
	import { page } from '$app/state';

	let currentPage = page.url.pathname;
</script>

{currentPage}
