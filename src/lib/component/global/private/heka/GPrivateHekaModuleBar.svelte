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
import {
		WebRoutesEnum,
		hekaHospitalHome,
		hekaHospitalPageUrl,
		requestPathToDbPageUrl
	} from '$lib/model/enum/routes.enum';
	import { getStaffPhotoDisplayUrl } from '$lib/util/staff-photo.util';
	import AccountModal from '$lib/component/snippet/modal/AccountModal.svelte';
	import { RoleEnum } from '$lib/model/enum/db-link';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import LucideHouse from '$lib/component/library/lucide/LucideHouse.svelte';
	import LucideSearch from '$lib/component/library/lucide/LucideSearch.svelte';
	import DaisyUiModal from '$lib/component/library/daisyui/modal/DaisyUiModal.svelte';
	import { tick } from 'svelte';

	type StaffUserGroupForNav = { id: number; name: string | null };
	type StaffBranchForNav = { id: string; name: string | null };

	let {
		hospitalId = null,
		hospitalName = null,
		moduleList,
		pageList,
		staffId = null,
		staffPhotoUrl = null,
		userRoleId = null,
		staffUserGroupsForNav = [],
		selectedUserGroupId = null,
		staffBranchesForNav = [],
		selectedBranchId = null,
		/** When set (e.g. in Nursing Workbench), navbar visibility is controlled by parent; otherwise internal state. */
		navbarVisible = undefined,
		onToggleNavbar = undefined
	}: {
		hospitalId?: string | null;
		hospitalName?: string | null;
		moduleList: ModuleSchema[];
		pageList: PageSchema[];
		staffId?: string | null;
		staffPhotoUrl?: string | null;
		userRoleId?: number | null;
		staffUserGroupsForNav?: StaffUserGroupForNav[];
		selectedUserGroupId?: number | null;
		staffBranchesForNav?: StaffBranchForNav[];
		selectedBranchId?: string | null;
		navbarVisible?: boolean;
		onToggleNavbar?: () => void;
	} = $props();

	const orderedModuleList = $derived.by(() =>
		[...moduleList].sort(
			(a, b) => (a.sequenceNo ?? 0) - (b.sequenceNo ?? 0)
		)
	);

	const orderedPageList = $derived.by(() =>
		[...pageList].sort(
			(a, b) => (a.sequenceNo ?? 0) - (b.sequenceNo ?? 0)
		)
	);

	const profilePhotoDisplayUrl = $derived(
		getStaffPhotoDisplayUrl(staffPhotoUrl)
	);
	const hasProfilePhoto = $derived(!!profilePhotoDisplayUrl);

	const registrationEditUrl = $derived(
		hospitalId
			? hekaHospitalPageUrl(
					hospitalId,
					WebRoutesEnum.HEKA_HOME_ADMINISTRATION_STAFF_REGISTRATION
				)
			: WebRoutesEnum.HEKA_HOME_ADMINISTRATION_STAFF_REGISTRATION
	);

	let accountModalOpen = $state(false);

	function openAccountModal() {
		accountModalOpen = true;
	}

	function closeAccountModal() {
		accountModalOpen = false;
	}

	let searchDialogOpen = $state(false);
	let searchQuery = $state('');
	let searchInputEl = $state<HTMLInputElement | null>(null);

	function openSearchDialog() {
		searchQuery = '';
		searchDialogOpen = true;
		tick().then(() => searchInputEl?.focus());
	}

	function closeSearchDialog() {
		searchDialogOpen = false;
	}

	// Search results: top-level pages only, with module name; filter by searchQuery.
	type SearchEntry = { page: PageSchema; moduleName: string };
	const searchEntries = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		const entries: SearchEntry[] = [];
		for (const p of orderedPageList) {
			if (p.parentId != null) continue;
			const mod = moduleList.find((m) => m.id === p.moduleId);
			entries.push({ page: p, moduleName: mod?.name ?? '' });
		}
		if (!q) return entries.slice(0, 30);
		return entries
			.filter(
				(e) =>
					(e.page.name ?? '').toLowerCase().includes(q) ||
					(e.page.pageUrl ?? '').toLowerCase().includes(q) ||
					e.moduleName.toLowerCase().includes(q)
			)
			.slice(0, 30);
	});

	const currentSearch = $derived(page.url.search);

	function goToPage(p: PageSchema) {
		closeSearchDialog();
		const base =
			hospitalId && p.pageUrl != null
				? hekaHospitalPageUrl(hospitalId, p.pageUrl)
				: p.pageUrl;
		const url =
			base != null && currentSearch
				? `${base}${currentSearch}`
				: base;
		if (url != null) routerUtil.replaceRoute(url);
	}

	// Ctrl+K opens search dialog.
	$effect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.ctrlKey && e.key === 'k') {
				e.preventDefault();
				openSearchDialog();
			}
		}
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	});

	const routerUtil = new RouterUtil();

	// Map current pathname -> DB page URL (/heka/home/...) for highlighting.
	const activeDbPageUrl = $derived.by(() => {
		if (!hospitalId) return null;
		return requestPathToDbPageUrl(page.url.pathname, hospitalId);
	});

	// Determine which module is "active" based on the current DB page URL.
	const activeModuleId = $derived.by(() => {
		if (!activeDbPageUrl) return null;
		const activePage = orderedPageList.find(
			(p) => p.pageUrl === activeDbPageUrl
		);
		return activePage?.moduleId ?? null;
	});

	function isPageActive(p: PageSchema): boolean {
		if (!activeDbPageUrl || !p.pageUrl) return false;
		if (activeDbPageUrl === p.pageUrl) return true;
		const base = p.pageUrl.endsWith('/') ? p.pageUrl : `${p.pageUrl}/`;
		return activeDbPageUrl.startsWith(base);
	}

	let pageLocator = $derived.by(() => {
		const segments = StringUtil.parseUrlSegments(
			page.url.pathname
		).slice(-2);
		const pageTitle = segments
			.filter((segment) => !(hospitalId && segment === hospitalId))
			.map((segment) => StringUtil.segmentToLabel(segment))
			.join(' / ');

		if (hospitalName?.trim()) {
			return pageTitle
				? `${hospitalName} / ${pageTitle}`
				: hospitalName;
		}

		return pageTitle;
	});

	let isNavbarVisibleInternal = $state(true);
	const isControlled = $derived(
		navbarVisible !== undefined &&
			typeof onToggleNavbar === 'function'
	);
	const isNavbarVisible = $derived(
		isControlled ? (navbarVisible ?? false) : isNavbarVisibleInternal
	);
	function toggleNavbarVisibility() {
		if (isControlled) onToggleNavbar?.();
		else isNavbarVisibleInternal = !isNavbarVisibleInternal;
	}

	// User group select: only for STAFF with multiple user groups (after logged in)
	const showUserGroupSelect = $derived(
		userRoleId === RoleEnum.STAFF &&
			(staffUserGroupsForNav?.length ?? 0) > 1
	);
	const setSelectedUserGroupUrl = $derived(
		hospitalId
			? `/heka/hospital/${hospitalId}/home/set-selected-user-group`
			: ''
	);
	const selectedUserGroupIdStr = $derived(
		selectedUserGroupId != null ? String(selectedUserGroupId) : ''
	);
	const showBranchSelect = $derived(
		userRoleId === RoleEnum.STAFF &&
			(staffBranchesForNav?.length ?? 0) > 1
	);
	const setSelectedBranchUrl = $derived(
		hospitalId
			? `/heka/hospital/${hospitalId}/home/set-selected-branch`
			: ''
	);
	const selectedBranchIdStr = $derived(selectedBranchId ?? '');
	let userGroupForm: HTMLFormElement | undefined = $state();
	let branchForm: HTMLFormElement | undefined = $state();
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
				className="d-btn-primary w-96 text-center"
			/>
		</DaisyUiNavbarCenter>
		<DaisyUiNavbarEnd className="gap-3">
			{#if showBranchSelect && setSelectedBranchUrl}
				<form
					bind:this={branchForm}
					class="form-control"
					action={setSelectedBranchUrl}
					method="post"
					role="presentation"
				>
					<DaisyUiSelect
						value={selectedBranchIdStr}
						className="d-select-sm min-w-36"
						name="branchId"
						onChange={() => branchForm?.requestSubmit()}
					>
						{#each staffBranchesForNav as b (b.id)}
							<option value={b.id}>{b.name ?? ''}</option>
						{/each}
					</DaisyUiSelect>
				</form>
			{/if}
			{#if showUserGroupSelect && setSelectedUserGroupUrl}
				<form
					bind:this={userGroupForm}
					class="form-control"
					action={setSelectedUserGroupUrl}
					method="post"
					role="presentation"
				>
					<DaisyUiSelect
						value={selectedUserGroupIdStr}
						className="d-select-sm min-w-36"
						name="userGroupId"
						onChange={() => userGroupForm?.requestSubmit()}
					>
						{#each staffUserGroupsForNav as ug (ug.id)}
							<option value={String(ug.id)}>{ug.name ?? ''}</option>
						{/each}
					</DaisyUiSelect>
				</form>
			{/if}
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
				<DaisyUiButton
					className="d-btn-circle overflow-hidden p-0"
					onClick={openAccountModal}
				>
					{#if hasProfilePhoto}
						<img
							src={profilePhotoDisplayUrl}
							alt="Profile"
							class="size-full object-cover"
						/>
					{:else}
						<LucideUser />
					{/if}
				</DaisyUiButton>
			</DaisyUiTooltip>
		</DaisyUiNavbarEnd>
	</DaisyUiNavbar>
{/if}
<AccountModal
	open={accountModalOpen}
	onClose={closeAccountModal}
	{staffId}
	{registrationEditUrl}
/>

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
		{#each orderedModuleList as m (m.id)}
			<div>
				<DaisyUiDropdown>
					<DaisyUiDropdownButton
						className={activeModuleId === m.id ? 'd-btn-accent' : ''}
					>
						{m?.name}
					</DaisyUiDropdownButton>
					<DaisyUiDropdownContent
						className="max-h-96 flex w-fit min-w-48 flex-col gap-2 overflow-y-auto bg-accent/50 z-100 p-2"
					>
						{#each orderedPageList.filter((p) => p.moduleId === m.id && p.parentId == null) as p (p.id)}
							<DaisyUiButton
								className={`w-full justify-start whitespace-nowrap text-left d-btn-wide  ${isPageActive(p) ? 'd-btn-accent' : ''}`}
								onClick={() => {
									const base =
										hospitalId && p.pageUrl != null
											? hekaHospitalPageUrl(hospitalId, p.pageUrl)
											: p.pageUrl;
									const url =
										base != null && currentSearch
											? `${base}${currentSearch}`
											: base;
									if (url != null) routerUtil.replaceRoute(url);
								}}
							>
								{p.name}
							</DaisyUiButton>
						{/each}
					</DaisyUiDropdownContent>
				</DaisyUiDropdown>
			</div>
		{/each}
	</div>
	<div>
			<DaisyUiTooltip tooltipText="Home" className="d-tooltip-secondary d-tooltip-bottom">
				<DaisyUiButton
					className="d-btn-secondary d-btn-square"
					onClick={() =>
						routerUtil.goToRoute(
							hospitalId ? hekaHospitalHome(hospitalId) : WebRoutesEnum.HEKA_HOME
						)}
				>
					<LucideHouse />
				</DaisyUiButton>
			</DaisyUiTooltip>
	</div>
	<div>
		<DaisyUiTooltip tooltipText="Search (Ctrl+K)" className="d-tooltip-secondary d-tooltip-bottom">
			<DaisyUiButton
				className="d-btn-secondary d-btn-square"
				onClick={openSearchDialog}
			>
				<LucideSearch />
			</DaisyUiButton>
		</DaisyUiTooltip>
	</div>
</DaisyUiNavbar>

<DaisyUiModal
	groupName="heka-module-search"
	className="d-modal-middle"
	open={searchDialogOpen}
	onClose={closeSearchDialog}
>
	{#snippet children()}
		<div class="d-modal-box max-h-[80vh] flex flex-col gap-3">
			<h3 class="text-lg font-semibold">Search modules &amp; pages</h3>
			<input
				bind:this={searchInputEl}
				bind:value={searchQuery}
				type="text"
				placeholder="Type to search..."
				class="d-input d-input-bordered w-full"
				aria-label="Search"
			/>
			<ul class="max-h-80 overflow-y-auto flex flex-col gap-1">
				{#each searchEntries as entry (entry.page.id)}
					<li>
						<button
							type="button"
							class="d-btn d-btn-ghost w-full justify-start text-left"
							onclick={() => goToPage(entry.page)}
						>
							<span class="font-medium">{entry.page.name ?? entry.page.pageUrl ?? ''}</span>
							{#if entry.moduleName}
								<span class="text-base-content/60 text-sm"> — {entry.moduleName}</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
			{#if searchEntries.length === 0}
				<p class="text-base-content/60 text-sm">No matches.</p>
			{/if}
		</div>
	{/snippet}
</DaisyUiModal>
