<script lang="ts">
	import type {
		ModuleSchema,
		PageSchema
	} from '$lib/server/db/schema-type';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiDropdownButton from '$lib/component/library/daisyui/dropdown/button/DaisyUiDropdownButton.svelte';
	import DaisyUiDropdownContent from '$lib/component/library/daisyui/dropdown/content/DaisyUiDropdownContent.svelte';
	import DaisyUiDropdown from '$lib/component/library/daisyui/dropdown/DaisyUiDropdown.svelte';
	import DaisyUiNavbar from '$lib/component/library/daisyui/navbar/DaisyUiNavbar.svelte';
	import DaisyUiNavbarEnd from '$lib/component/library/daisyui/navbar/end/DaisyUiNavbarEnd.svelte';
	import DaisyUiNavbarStart from '$lib/component/library/daisyui/navbar/start/DaisyUiNavbarStart.svelte';
	import DaisyUiTooltip from '$lib/component/library/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideBell from '$lib/component/library/lucide/LucideBell.svelte';
	import LucidePanelTopClose from '$lib/component/library/lucide/LucidePanelTopClose.svelte';
	import LucideUser from '$lib/component/library/lucide/LucideUser.svelte';
	import HekaLogo from '$lib/asset/image/heka_logo.webp';
	import LucidePanelTopOpen from '$lib/component/library/lucide/LucidePanelTopOpen.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import DaisyUiNavbarCenter from '$lib/component/library/daisyui/navbar/center/DaisyUiNavbarCenter.svelte';
	import { page } from '$app/state';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';

	let {
		moduleList,
		pageList
	}: { moduleList: ModuleSchema[]; pageList: PageSchema[] } =
		$props();

	const routerUtil = new RouterUtil();

	let pageLocator = $derived(
		StringUtil.urlToTitleLast(page.url.pathname, 2)
	);

	let isNavbarVisible = $state(true);

	function toggleNavbarVisibility() {
		isNavbarVisible = !isNavbarVisible;
	}
</script>

{#if isNavbarVisible}
	<DaisyUiNavbar className="bg-base-100 flex">
		<DaisyUiNavbarStart className="gap-3">
			<img src={HekaLogo} alt="Heka Logo" class="w-20" />
		</DaisyUiNavbarStart>
		<DaisyUiNavbarCenter>
			<DaisyUiInputField
				inputType="text"
				value={pageLocator}
				disabled
				className="d-btn-primary w-full"
			/>
		</DaisyUiNavbarCenter>
		<DaisyUiNavbarEnd className="gap-3">
			<DaisyUiTooltip
				tooltipText="Notification"
				className="d-tooltip-left"
			>
				<DaisyUiButton className="d-btn-circle">
					<LucideBell />
				</DaisyUiButton>
			</DaisyUiTooltip>
			<DaisyUiTooltip
				tooltipText="Account"
				className="d-tooltip-left"
			>
				<DaisyUiButton className="d-btn-circle">
					<LucideUser />
				</DaisyUiButton>
			</DaisyUiTooltip>
		</DaisyUiNavbarEnd>
	</DaisyUiNavbar>
{/if}

<!-- navbar end -->



<!-- module bar start  -->

<DaisyUiNavbar className="flex border-t border-neutral/32 gap-3">
	{#if isNavbarVisible}
		<DaisyUiTooltip
			tooltipText="close top panel"
			className="d-tooltip-primary d-tooltip-right"
		>
			<DaisyUiButton
				className="d-btn-primary"
				onClick={toggleNavbarVisibility}
			>
				<LucidePanelTopClose />
			</DaisyUiButton>
		</DaisyUiTooltip>
	{:else}
		<DaisyUiTooltip
			tooltipText="open top panel"
			className="d-tooltip-primary d-tooltip-right"
		>
			<DaisyUiButton
				className="d-btn-primary"
				onClick={toggleNavbarVisibility}
			>
				<LucidePanelTopOpen />
			</DaisyUiButton>
		</DaisyUiTooltip>
	{/if}
	<div class="flex flex-1 flex-wrap gap-3">
		{#each moduleList as m (m.id)}
			<div>
				<DaisyUiDropdown>
					<DaisyUiDropdownButton>{m?.name}</DaisyUiDropdownButton>
					<DaisyUiDropdownContent
						className="max-h-96 min-h-0 min-w-0 flex flex-row gap-2 overflow-x-hidden overflow-y-auto bg-accent/50"
					>
						{#each pageList.filter((p) => p.moduleId === m.id && p.parentId == null) as p (p.id)}
							<DaisyUiButton
								className="w-full min-w-0 justify-start truncate text-left"
								onClick={() =>
									p.pageUrl != null &&
									routerUtil.replaceRoute(p.pageUrl)}
							>
								{p.name}
							</DaisyUiButton>
						{/each}
					</DaisyUiDropdownContent>
				</DaisyUiDropdown>
			</div>
		{/each}
	</div>
</DaisyUiNavbar>
