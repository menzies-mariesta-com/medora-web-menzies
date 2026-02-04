<script>
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiNavbar from '$lib/component/library/daisyui/navbar/DaisyUiNavbar.svelte';
	import DaisyUiNavbarStart from '$lib/component/library/daisyui/navbar/start/DaisyUiNavbarStart.svelte';
	import HekaLogo from '$lib/asset/image/heka_logo.webp';
	import DaisyUiNavbarEnd from '$lib/component/library/daisyui/navbar/end/DaisyUiNavbarEnd.svelte';
	import LucideUser from '$lib/component/library/lucide/LucideUser.svelte';
</script>

<DaisyUiNavbar className="bg-base-100 flex">
	<DaisyUiNavbarStart className="gap-3">
		<img src={HekaLogo} alt="Heka Logo" class="w-20" />
	</DaisyUiNavbarStart>
	<DaisyUiNavbarEnd>
		<DaisyUiButton className="d-btn-circle">
			<LucideUser />
		</DaisyUiButton>
	</DaisyUiNavbarEnd>
</DaisyUiNavbar>
