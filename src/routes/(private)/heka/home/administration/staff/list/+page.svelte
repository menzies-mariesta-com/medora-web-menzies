<script lang="ts">
	import { page } from '$app/state';

	let currentPage = page.url.pathname;
</script>

<h1>Staff List</h1>
{currentPage}