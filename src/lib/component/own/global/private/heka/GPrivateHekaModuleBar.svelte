<script lang="ts">
	import type {
		HekaPageModuleRow,
		HekaPageRow
	} from '$lib/model/type/heka/page.type';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiDropdownButton from '$lib/component/daisyui/dropdown/button/DaisyUiDropdownButton.svelte';
	import DaisyUiDropdownContent from '$lib/component/daisyui/dropdown/content/DaisyUiDropdownContent.svelte';
	import DaisyUiDropdown from '$lib/component/daisyui/dropdown/DaisyUiDropdown.svelte';
	import DaisyUiNavbar from '$lib/component/daisyui/navbar/DaisyUiNavbar.svelte';
	import DaisyUiNavbarEnd from '$lib/component/daisyui/navbar/end/DaisyUiNavbarEnd.svelte';
	import DaisyUiNavbarStart from '$lib/component/daisyui/navbar/start/DaisyUiNavbarStart.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePanelTopClose from '$lib/component/own/library/lucide/LucidePanelTopClose.svelte';
	import LucideUser from '$lib/component/own/library/lucide/LucideUser.svelte';
	import HekaLogo from '$lib/asset/image/heka_logo.webp';
	import LucidePanelTopOpen from '$lib/component/own/library/lucide/LucidePanelTopOpen.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import DaisyUiNavbarCenter from '$lib/component/daisyui/navbar/center/DaisyUiNavbarCenter.svelte';
	import { page } from '$app/state';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import {
		WebRoutesEnum,
		hekaHospitalHome,
		hekaHospitalPageUrl,
		requestPathToDbPageUrl
	} from '$lib/model/enum/routes.enum';
	import { getStaffPhotoDisplayUrl } from '$lib/util/staff-photo.util';
	import AccountModal from '$lib/component/own/snippet/modal/AccountModal.svelte';
	import { RoleEnum } from '$lib/model/enum/db-link';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import LucideHouse from '$lib/component/own/library/lucide/LucideHouse.svelte';
	import LucideSearch from '$lib/component/own/library/lucide/LucideSearch.svelte';
	import DaisyUiModal from '$lib/component/daisyui/modal/DaisyUiModal.svelte';
	import { tick } from 'svelte';
	import HekaNotifications from './HekaNotifications.svelte';

	type StaffUserGroupForNav = { id: number; name: string | null };
	type StaffBranchForNav = { id: string; name: string | null };
	type InventoryFromStoreForNav = { id: number; storeName: string | null };

	let {
		hospitalId = null,
		hospitalName = null,
		userEmail = null,
		moduleList,
		pageList,
		staffId = null,
		staffPhotoUrl = null,
		/** Shown next to the profile control (staff full name or user name/email). */
		staffDisplayName = null,
		userRoleId = null,
		staffUserGroupsForNav = [],
		selectedUserGroupId = null,
		staffBranchesForNav = [],
		selectedBranchId = null,
		inventoryFromStoresForNav = [],
		selectedInventoryFromStoreId = null,
		/** When set (e.g. in Nursing Workbench), navbar visibility is controlled by parent; otherwise internal state. */
		navbarVisible = undefined,
		onToggleNavbar = undefined
	}: {
		hospitalId?: string | null;
		hospitalName?: string | null;
		userEmail?: string | null;
		moduleList: HekaPageModuleRow[];
		pageList: HekaPageRow[];
		staffId?: string | null;
		staffPhotoUrl?: string | null;
		staffDisplayName?: string | null;
		userRoleId?: number | null;
		staffUserGroupsForNav?: StaffUserGroupForNav[];
		selectedUserGroupId?: number | null;
		staffBranchesForNav?: StaffBranchForNav[];
		selectedBranchId?: string | null;
		inventoryFromStoresForNav?: InventoryFromStoreForNav[];
		selectedInventoryFromStoreId?: number | null;
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

	// Search results: include all allowed pages (parent + sub-pages), with module name.
	type SearchEntry = { page: HekaPageRow; moduleName: string };

	function parentChainLabel(p: HekaPageRow): string {
		const chain: string[] = [];
		let cursor = p.parentId ?? null;
		const guard: Record<number, true> = {};
		while (cursor != null && !guard[cursor]) {
			guard[cursor] = true;
			const parent = orderedPageList.find((x) => x.id === cursor);
			if (!parent) break;
			chain.unshift(parent.name ?? String(parent.id));
			cursor = parent.parentId ?? null;
		}
		return chain.join(' / ');
	}

	const searchEntries = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		const entries: SearchEntry[] = [];
		for (const p of orderedPageList) {
			const mod = moduleList.find((m) => m.id === p.moduleId);
			entries.push({ page: p, moduleName: mod?.name ?? '' });
		}
		if (!q) return entries.slice(0, 30);
		return entries
			.filter(
				(e) =>
					(e.page.name ?? '').toLowerCase().includes(q) ||
					(e.page.pageUrl ?? '').toLowerCase().includes(q) ||
					e.moduleName.toLowerCase().includes(q) ||
					parentChainLabel(e.page).toLowerCase().includes(q)
			)
			.slice(0, 30);
	});

	const currentSearch = $derived(page.url.search);

	function goToPage(p: HekaPageRow) {
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

	function isPageActive(p: HekaPageRow): boolean {
		if (!activeDbPageUrl || !p.pageUrl) return false;
		if (activeDbPageUrl === p.pageUrl) return true;
		const base = p.pageUrl.endsWith('/')
			? p.pageUrl
			: `${p.pageUrl}/`;
		return activeDbPageUrl.startsWith(base);
	}

	function isIdLikeSegment(segment: string): boolean {
		// UUID v4/v7 (case-insensitive).
		const uuidV4 =
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		const uuidV7 =
			/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		if (uuidV4.test(segment) || uuidV7.test(segment)) return true;

		// Purely numeric IDs.
		if (/^\d+$/.test(segment)) return true;

		// Opaque IDs (common in generated identifiers): long, URL-safe-ish, and contains digits.
		// Keeps meaningful long slugs like "department-consumption" (no digits).
		if (
			segment.length >= 16 &&
			/^[A-Za-z0-9_-]+$/.test(segment) &&
			/\d/.test(segment) &&
			!/^[A-Za-z]+$/.test(segment)
		) {
			return true;
		}

		return false;
	}

	let pageLocator = $derived.by(() => {
		const segments = StringUtil.parseUrlSegments(page.url.pathname);
		const pageTitle = segments
			.filter((segment) => !(hospitalId && segment === hospitalId))
			.filter((segment) => !isIdLikeSegment(segment))
			.slice(-2)
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
	const staffUserGroupCount = $derived(staffUserGroupsForNav?.length ?? 0);
	const showUserGroupSelect = $derived(
		userRoleId === RoleEnum.STAFF && staffUserGroupCount >= 1
	);
	const userGroupSelectDisabled = $derived(staffUserGroupCount <= 1);
	const setSelectedUserGroupUrl = $derived(
		hospitalId
			? `/heka/hospital/${hospitalId}/home/set-selected-user-group`
			: ''
	);
	const selectedUserGroupIdStr = $derived(
		selectedUserGroupId != null ? String(selectedUserGroupId) : ''
	);
	const staffBranchCount = $derived(staffBranchesForNav?.length ?? 0);
	const showBranchSelect = $derived(
		userRoleId === RoleEnum.STAFF && staffBranchCount >= 1
	);
	const branchSelectDisabled = $derived(staffBranchCount <= 1);
	const setSelectedBranchUrl = $derived(
		hospitalId
			? `/heka/hospital/${hospitalId}/home/set-selected-branch`
			: ''
	);
	const selectedBranchIdStr = $derived(selectedBranchId ?? '');
	const isInventoryOpsPathname = $derived.by(() => {
		const hid = hospitalId ?? '';
		if (!hid) return false;
		const p = page.url.pathname;
		const base = `/heka/hospital/${hid}/home/inventory`;
		if (p === base) return true;
		if (!p.startsWith(`${base}/`)) return false;
		return !p.includes('inventory-setup');
	});
	const inventoryFromStoreCount = $derived(
		inventoryFromStoresForNav?.length ?? 0
	);
	const showInventoryFromStoreSelect = $derived(
		isInventoryOpsPathname && inventoryFromStoreCount >= 1
	);
	const inventoryFromStoreSelectDisabled = $derived(
		inventoryFromStoreCount <= 1
	);
	const setSelectedInventoryFromStoreUrl = $derived(
		hospitalId
			? `/heka/hospital/${hospitalId}/home/set-selected-inventory-from-store`
			: ''
	);
	const selectedInventoryFromStoreIdStr = $derived(
		selectedInventoryFromStoreId != null
			? String(selectedInventoryFromStoreId)
			: ''
	);
	let userGroupForm: HTMLFormElement | undefined = $state();
	let branchForm: HTMLFormElement | undefined = $state();
	let inventoryFromStoreForm: HTMLFormElement | undefined = $state();

	/** Same outline on every interactive control in the top and module bars. */
	const navBarControlBorder =
		'border-2 border-primary/45 hover:border-primary';
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
						disabled={branchSelectDisabled}
						className="d-select min-w-36 {navBarControlBorder}"
						name="branchId"
						onChange={() => branchForm?.requestSubmit()}
					>
						{#each staffBranchesForNav as b, i (`${b.id}-${i}`)}
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
						disabled={userGroupSelectDisabled}
						className="d-select min-w-36 {navBarControlBorder}"
						name="userGroupId"
						onChange={() => userGroupForm?.requestSubmit()}
					>
						{#each staffUserGroupsForNav as ug, i (`ug-${ug.id}-${i}`)}
							<option value={String(ug.id)}>{ug.name ?? ''}</option>
						{/each}
					</DaisyUiSelect>
				</form>
			{/if}
			{#if showInventoryFromStoreSelect && setSelectedInventoryFromStoreUrl}
				<form
					bind:this={inventoryFromStoreForm}
					class="form-control"
					action={setSelectedInventoryFromStoreUrl}
					method="post"
					role="presentation"
				>
					<DaisyUiSelect
						value={selectedInventoryFromStoreIdStr}
						disabled={inventoryFromStoreSelectDisabled}
						className="d-select min-w-40 max-w-[14rem] {navBarControlBorder}"
						name="storeId"
						onChange={() => inventoryFromStoreForm?.requestSubmit()}
					>
						{#each inventoryFromStoresForNav as s, i (`ifs-${s.id}-${i}`)}
							<option value={String(s.id)}>{s.storeName?.trim() ? s.storeName : `Store #${s.id}`}</option>
						{/each}
					</DaisyUiSelect>
				</form>
			{/if}
			<DaisyUiTooltip
				tooltipText="Notification"
				className="d-tooltip-left"
			>
				<HekaNotifications
					{hospitalId}
					triggerClassName={navBarControlBorder}
				/>
			</DaisyUiTooltip>
			<DaisyUiTooltip
				tooltipText="Account"
				className="d-tooltip-left"
			>
				<DaisyUiButton
					className={staffDisplayName?.trim()
						? `flex min-w-0 max-w-[14rem] items-center gap-2 rounded-full d-btn-ghost h-auto min-h-9 p-1 normal-case ${navBarControlBorder}`
						: `d-btn-circle shrink-0 overflow-hidden p-0 ${navBarControlBorder}`}
					onClick={openAccountModal}
				>
					{#if staffDisplayName?.trim()}
						<span
							class="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-base-300"
							aria-hidden="true"
						>
							{#if hasProfilePhoto}
								<img
									src={profilePhotoDisplayUrl}
									alt=""
									class="size-full object-cover"
								/>
							{:else}
								<LucideUser className="size-5" />
							{/if}
						</span>
						<span class="truncate text-left text-sm font-medium">
							{staffDisplayName.trim()}
						</span>
					{:else}
						{#if hasProfilePhoto}
							<img
								src={profilePhotoDisplayUrl}
								alt="Profile"
								class="size-full object-cover"
							/>
						{:else}
							<LucideUser />
						{/if}
					{/if}
				</DaisyUiButton>
			</DaisyUiTooltip>
		</DaisyUiNavbarEnd>
	</DaisyUiNavbar>
{/if}
<AccountModal
	open={accountModalOpen}
	onClose={closeAccountModal}
	{hospitalId}
	{userEmail}
	{staffId}
/>

<!-- navbar end -->

<!-- module bar start  -->

<DaisyUiNavbar className="flex border-t border-primary/25 gap-3">
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
						className={activeModuleId === m.id
							? `d-btn-accent ${navBarControlBorder}`
							: navBarControlBorder}
					>
						{m?.name}
					</DaisyUiDropdownButton>
					<DaisyUiDropdownContent
						className="max-h-96 flex w-fit min-w-48 flex-col flex-nowrap gap-2 overflow-y-auto overflow-x-hidden bg-accent/50 z-100 p-2"
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
		<DaisyUiTooltip
			tooltipText="Home"
			className="d-tooltip-secondary d-tooltip-left"
		>
			<DaisyUiButton
				className="d-btn-secondary d-btn-square"
				onClick={() =>
					routerUtil.goToRoute(
						hospitalId
							? hekaHospitalHome(hospitalId)
							: WebRoutesEnum.HEKA_HOME
					)}
			>
				<LucideHouse />
			</DaisyUiButton>
		</DaisyUiTooltip>
	</div>
	<div>
		<DaisyUiTooltip
			tooltipText="Search (Ctrl+K)"
			className="d-tooltip-secondary d-tooltip-left"
		>
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
	<div class="d-modal-box flex max-h-[80vh] flex-col gap-3">
		<h3 class="text-lg font-semibold">Search modules &amp; pages</h3>
		<input
			bind:this={searchInputEl}
			bind:value={searchQuery}
			type="text"
			placeholder="Type to search..."
			class="d-input-bordered d-input w-full"
			aria-label="Search"
		/>
		<ul class="flex max-h-80 flex-col gap-1 overflow-y-auto">
			{#each searchEntries as entry (entry.page.id)}
				{@const parentPath = parentChainLabel(entry.page)}
				<li>
					<button
						type="button"
						class="d-btn w-full justify-start text-left d-btn-ghost"
						onclick={() => goToPage(entry.page)}
					>
						<span class="font-medium"
							>{entry.page.name ?? entry.page.pageUrl ?? ''}</span
						>
						{#if entry.moduleName}
							<span class="text-sm text-base-content/60">
								— {entry.moduleName}</span
							>
						{/if}
						{#if parentPath}
							<span class="text-xs text-base-content/50">
								({parentPath})
							</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
		{#if searchEntries.length === 0}
			<p class="text-sm text-base-content/60">No matches.</p>
		{/if}
	</div>
</DaisyUiModal>
