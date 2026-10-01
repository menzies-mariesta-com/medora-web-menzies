<script lang="ts">
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';

	import type {
		MedoraPageModuleRow,
		MedoraPageRow
	} from '$lib/model/type/medora/page.type';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucidePanelTopClose from '$lib/component/own/library/lucide/LucidePanelTopClose.svelte';
	import LucideUser from '$lib/component/own/library/lucide/LucideUser.svelte';
	import MedoraBrandWordmark from '$lib/component/own/global/MedoraBrandWordmark.svelte';
	import LucidePanelTopOpen from '$lib/component/own/library/lucide/LucidePanelTopOpen.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import {
		WebRoutesEnum,
		medoraHospitalHome,
		medoraHospitalPageUrl,
		requestPathToDbPageUrl
	} from '$lib/model/enum/routes.enum';
	import { getStaffPhotoDisplayUrl } from '$lib/util/staff-photo.util';
	import AccountModal from '$lib/component/own/snippet/modal/AccountModal.svelte';
	import { RoleEnum } from '$lib/model/enum/db-link';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import LucideHouse from '$lib/component/own/library/lucide/LucideHouse.svelte';
	import LucideSearch from '$lib/component/own/library/lucide/LucideSearch.svelte';
	import WashDialog from '$lib/component/wash/dialog/WashDialog.svelte';
	import { tick } from 'svelte';
	import MedoraNotifications from './MedoraNotifications.svelte';
	import MedoraModuleIcon from './MedoraModuleIcon.svelte';

	type StaffUserGroupForNav = { id: number; name: string | null };
	type StaffBranchForNav = { id: string; name: string | null };
	type InventoryFromStoreForNav = {
		id: number;
		storeName: string | null;
		isPurchaseRequisitable?: boolean;
	};

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
		moduleList: MedoraPageModuleRow[];
		pageList: MedoraPageRow[];
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
	type SearchEntry = { page: MedoraPageRow; moduleName: string };

	function parentChainLabel(p: MedoraPageRow): string {
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

	function modulePageHref(p: MedoraPageRow): string | null {
		const base =
			hospitalId && p.pageUrl != null
				? medoraHospitalPageUrl(hospitalId, p.pageUrl)
				: p.pageUrl;
		if (base == null) return null;
		return currentSearch ? `${base}${currentSearch}` : base;
	}

	function goToPage(p: MedoraPageRow) {
		closeSearchDialog();
		const url = modulePageHref(p);
		if (url != null) routerUtil.replaceRoute(url);
	}

	/** SPA navigate via replaceRoute; allow modified/middle clicks to use href. */
	function goToModulePage(p: MedoraPageRow, e: MouseEvent) {
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
			return;
		}
		e.preventDefault();
		hoveredModuleId = null;
		cancelCloseModuleMenu();
		const url = modulePageHref(p);
		if (url != null) routerUtil.replaceRoute(url);
	}

	/** Hover menu outside the scroll strip so `overflow-x-auto` cannot clip it. */
	let hoveredModuleId = $state<number | null>(null);
	let moduleMenuPos = $state({ top: 0, left: 0 });
	let moduleMenuEl = $state<HTMLElement | null>(null);
	let moduleMenuCloseTimer: ReturnType<typeof setTimeout> | null = null;

	const hoveredModule = $derived(
		hoveredModuleId == null
			? null
			: (orderedModuleList.find((m) => m.id === hoveredModuleId) ??
					null)
	);
	const hoveredModulePages = $derived.by(() => {
		if (hoveredModuleId == null) return [];
		return orderedPageList.filter(
			(p) => p.moduleId === hoveredModuleId && p.parentId == null
		);
	});

	function cancelCloseModuleMenu() {
		if (moduleMenuCloseTimer != null) {
			clearTimeout(moduleMenuCloseTimer);
			moduleMenuCloseTimer = null;
		}
	}

	function scheduleCloseModuleMenu() {
		cancelCloseModuleMenu();
		moduleMenuCloseTimer = setTimeout(() => {
			hoveredModuleId = null;
			moduleMenuCloseTimer = null;
		}, 140);
	}

	function clampModuleMenuLeft(preferredLeft: number) {
		const width = moduleMenuEl?.offsetWidth ?? 0;
		const maxLeft = Math.max(8, window.innerWidth - width - 8);
		return Math.min(Math.max(8, preferredLeft), maxLeft);
	}

	async function openModuleMenu(moduleId: number, trigger: HTMLElement) {
		cancelCloseModuleMenu();
		const r = trigger.getBoundingClientRect();
		hoveredModuleId = moduleId;
		moduleMenuPos = { top: r.bottom, left: r.left };
		await tick();
		moduleMenuPos = {
			top: r.bottom,
			left: clampModuleMenuLeft(r.left)
		};
	}

	function onModuleStripScroll() {
		hoveredModuleId = null;
		cancelCloseModuleMenu();
		updateModuleStripOverflow();
	}

	let moduleStripEl = $state<HTMLElement | null>(null);
	let moduleStripCanScrollLeft = $state(false);
	let moduleStripCanScrollRight = $state(false);

	function updateModuleStripOverflow() {
		const el = moduleStripEl;
		if (!el) {
			moduleStripCanScrollLeft = false;
			moduleStripCanScrollRight = false;
			return;
		}
		const maxScroll = el.scrollWidth - el.clientWidth;
		const epsilon = 2;
		moduleStripCanScrollLeft = el.scrollLeft > epsilon;
		moduleStripCanScrollRight = maxScroll - el.scrollLeft > epsilon;
	}

	$effect(() => {
		// Re-measure when the module list (or layout) changes.
		void orderedModuleList.length;
		const el = moduleStripEl;
		if (!el) return;

		updateModuleStripOverflow();
		const ro = new ResizeObserver(() => updateModuleStripOverflow());
		ro.observe(el);
		window.addEventListener('resize', updateModuleStripOverflow);
		return () => {
			ro.disconnect();
			window.removeEventListener('resize', updateModuleStripOverflow);
		};
	});

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

	// Map current pathname -> DB page URL (/medora/home/...) for highlighting.
	const activeDbPageUrl = $derived.by(() => {
		if (!hospitalId) return null;
		return requestPathToDbPageUrl(page.url.pathname, hospitalId);
	});

	// Determine which module is "active" based on the current DB page URL.
	// Prefer longest prefix match so nested routes (e.g. …/grn/new) still
	// highlight the parent page’s module (…/grn → Inventory).
	const activeModuleId = $derived.by(() => {
		if (!activeDbPageUrl) return null;
		let best: MedoraPageRow | null = null;
		for (const p of orderedPageList) {
			if (!p.pageUrl) continue;
			const exact = activeDbPageUrl === p.pageUrl;
			const nested = activeDbPageUrl.startsWith(`${p.pageUrl}/`);
			if (!exact && !nested) continue;
			if (
				!best ||
				(p.pageUrl?.length ?? 0) > (best.pageUrl?.length ?? 0)
			) {
				best = p;
			}
		}
		return best?.moduleId ?? null;
	});

	function isPageActive(p: MedoraPageRow): boolean {
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
	const staffUserGroupCount = $derived(
		staffUserGroupsForNav?.length ?? 0
	);
	const showUserGroupSelect = $derived(
		userRoleId === RoleEnum.STAFF && staffUserGroupCount >= 1
	);
	const userGroupSelectDisabled = $derived(staffUserGroupCount <= 1);
	const setSelectedUserGroupUrl = $derived(
		hospitalId
			? `/medora/hospital/${hospitalId}/home/set-selected-user-group`
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
			? `/medora/hospital/${hospitalId}/home/set-selected-branch`
			: ''
	);
	const selectedBranchIdStr = $derived(selectedBranchId ?? '');
	const isInventoryOpsPathname = $derived.by(() => {
		const hid = hospitalId ?? '';
		if (!hid) return false;
		const p = page.url.pathname;
		const base = `/medora/hospital/${hid}/home/inventory`;
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
			? `/medora/hospital/${hospitalId}/home/set-selected-inventory-from-store`
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

	async function submitNavSelectForm(
		form: HTMLFormElement | undefined
	): Promise<void> {
		await tick();
		form?.requestSubmit();
	}

	/** Soft chrome outline — avoid thick high-contrast primary rings. */
	const navBarControlBorder =
		'border border-base-300 hover:border-primary/40';
</script>

{#if isNavbarVisible}
	<div class="flex w-full flex-wrap items-center gap-2 border-b border-base-300/80 px-2 py-2">
		<div class="shrink-0">
			<MedoraBrandWordmark className="text-xl" />
		</div>
		<div
			class="flex min-w-0 flex-1 basis-[min(100%,16rem)] justify-center px-1"
		>
			<WashButton
				variant="primary"
				className="btn-outline pointer-events-none h-auto min-h-10 max-w-full whitespace-normal break-words text-center normal-case no-animation"
				title={pageLocator}
			>
				{pageLocator}
			</WashButton>
		</div>
		<div class="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-3">
			{#if showBranchSelect && setSelectedBranchUrl}
				<form
					bind:this={branchForm}
					class="form-control"
					action={setSelectedBranchUrl}
					method="post"
					role="presentation"
				>
					<WashSelect
						value={selectedBranchIdStr}
						disabled={branchSelectDisabled}
						className="select min-w-36 {navBarControlBorder}"
						name="branchId"
						onChange={() => submitNavSelectForm(branchForm)}
					>
						{#each staffBranchesForNav as b, i (`${b.id}-${i}`)}
							<option value={b.id}>{b.name ?? ''}</option>
						{/each}
					</WashSelect>
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
					<WashSelect
						value={selectedUserGroupIdStr}
						disabled={userGroupSelectDisabled}
						className="select min-w-36 {navBarControlBorder}"
						name="userGroupId"
						onChange={() => submitNavSelectForm(userGroupForm)}
					>
						{#each staffUserGroupsForNav as ug, i (`ug-${ug.id}-${i}`)}
							<option value={String(ug.id)}>{ug.name ?? ''}</option>
						{/each}
					</WashSelect>
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
					<WashSelect
						value={selectedInventoryFromStoreIdStr}
						disabled={inventoryFromStoreSelectDisabled}
						className="select min-w-40 max-w-[14rem] {navBarControlBorder}"
						name="storeId"
						onChange={() =>
							submitNavSelectForm(inventoryFromStoreForm)
						}
					>
						{#each inventoryFromStoresForNav as s, i (`ifs-${s.id}-${i}`)}
							<option value={String(s.id)}
								>{s.storeName?.trim()
									? s.storeName
									: `Store #${s.id}`}</option
							>
						{/each}
					</WashSelect>
				</form>
			{/if}
			<WashTooltip
				tooltipText="Notification"
				className="overflow-visible z-10"
			>
				<MedoraNotifications
					{hospitalId}
					triggerClassName={navBarControlBorder}
				/>
			</WashTooltip>
			<WashTooltip
				tooltipText="Account"
				className=""
			>
				<WashButton
					className={staffDisplayName?.trim()
						? `flex min-w-0 max-w-[14rem] items-center gap-2 rounded-full btn-ghost h-auto min-h-9 p-1 normal-case ${navBarControlBorder}`
						: `btn-circle shrink-0 overflow-hidden p-0 ${navBarControlBorder}`}
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
					{:else if hasProfilePhoto}
						<img
							src={profilePhotoDisplayUrl}
							alt="Profile"
							class="size-full object-cover"
						/>
					{:else}
						<LucideUser />
					{/if}
				</WashButton>
			</WashTooltip>
		</div>
	</div>
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

<div class="navbar max-w-full min-w-0 bg-base-200 shadow-md flex border-t border-base-300 gap-3">
	{#if isNavbarVisible}
		<WashTooltip
			tooltipText="close top panel"
			className="tooltip-primary"
		>
			<WashButton
				className="btn-primary"
				onClick={toggleNavbarVisibility}
			>
				<LucidePanelTopClose />
			</WashButton>
		</WashTooltip>
	{:else}
		<WashTooltip
			tooltipText="open top panel"
			className="tooltip-primary"
		>
			<WashButton
				className="btn-primary"
				onClick={toggleNavbarVisibility}
			>
				<LucidePanelTopOpen />
			</WashButton>
		</WashTooltip>
	{/if}
	<div class="relative min-w-0 flex-1">
		{#if moduleStripCanScrollLeft}
			<div
				class="menzies-module-bar-fade menzies-module-bar-fade-left pointer-events-none absolute inset-y-0 left-0 z-10 w-8"
				aria-hidden="true"
			></div>
		{/if}
		{#if moduleStripCanScrollRight}
			<div
				class="menzies-module-bar-fade menzies-module-bar-fade-right pointer-events-none absolute inset-y-0 right-0 z-10 w-8"
				aria-hidden="true"
			></div>
		{/if}
		<div
			bind:this={moduleStripEl}
			data-module-bar-scroll
			class="menzies-module-bar-scroll flex min-w-0 w-full flex-nowrap items-center gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain"
			onscroll={onModuleStripScroll}
		>
			{#each orderedModuleList as m (m.id)}
				{@const isActiveModule = activeModuleId === m.id}
				<div
					class="shrink-0"
					role="group"
					onmouseenter={(e) =>
						openModuleMenu(m.id, e.currentTarget)}
					onmouseleave={scheduleCloseModuleMenu}
				>
					{#if isActiveModule}
						<div class="aura aura-dual text-primary">
							<div
								tabindex="0"
								role="button"
								class="btn {navBarControlBorder} cursor-pointer gap-2"
							>
								<MedoraModuleIcon
									name={m.imageUrl}
									className="size-4 shrink-0"
								/>
								<span class="whitespace-nowrap">{m?.name}</span>
							</div>
						</div>
					{:else}
						<div
							tabindex="0"
							role="button"
							class="btn {navBarControlBorder} cursor-pointer gap-2"
						>
							<MedoraModuleIcon
								name={m.imageUrl}
								className="size-4 shrink-0"
							/>
							<span class="whitespace-nowrap">{m?.name}</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
	{#if hoveredModule != null}
		<div
			bind:this={moduleMenuEl}
			role="menu"
			tabindex="-1"
			class="fixed z-50 bg-transparent p-0 pt-1 shadow-none"
			style:top="{moduleMenuPos.top}px"
			style:left="{moduleMenuPos.left}px"
			onmouseenter={cancelCloseModuleMenu}
			onmouseleave={scheduleCloseModuleMenu}
		>
			<ul
				tabindex="-1"
				class="menzies-module-dropdown-menu menu flex w-max min-w-52 max-w-[min(24rem,calc(100vw-1rem))] flex-col flex-nowrap overflow-x-hidden overflow-y-auto rounded-box border border-ink-border bg-base-100 p-2 shadow-[var(--shadow-paper-md)] max-h-[min(70vh,24rem)]"
			>
				{#each hoveredModulePages as p (p.id)}
					{@const url = modulePageHref(p)}
					{#if url != null}
						<li class="w-full shrink-0">
							<a
								href={resolve(url as any)}
								class="whitespace-nowrap {isPageActive(p)
									? 'menu-active menu-wash-active'
									: ''}"
								aria-current={isPageActive(p)
									? 'page'
									: undefined}
								onclick={(e) => goToModulePage(p, e)}
							>
								{p.name}
							</a>
						</li>
					{/if}
				{/each}
			</ul>
		</div>
	{/if}
	<div class="shrink-0">
		<WashTooltip
			tooltipText="Home"
			className="tooltip-secondary"
		>
			<WashButton
				className="btn-secondary btn-square"
				onClick={() =>
					routerUtil.goToRoute(
						hospitalId
							? medoraHospitalHome(hospitalId)
							: WebRoutesEnum.MEDORA_HOME
					)}
			>
				<LucideHouse />
			</WashButton>
		</WashTooltip>
	</div>
	<div class="shrink-0">
		<WashTooltip
			tooltipText="Search (Ctrl+K)"
			className="tooltip-secondary"
		>
			<WashButton
				className="btn-secondary btn-square"
				onClick={openSearchDialog}
			>
				<LucideSearch />
			</WashButton>
		</WashTooltip>
	</div>
</div>

<WashDialog
	id="medora-module-search"
	className="modal-middle"
	open={searchDialogOpen}
	onClose={closeSearchDialog}
	title="Search modules & pages"
	boxClassName="flex max-h-[80vh] flex-col gap-3"
>
		<input
			bind:this={searchInputEl}
			bind:value={searchQuery}
			type="text"
			placeholder="Type to search..."
			class="input-bordered input w-full"
			aria-label="Search"
		/>
		<ul class="flex max-h-80 flex-col gap-1 overflow-y-auto">
			{#each searchEntries as entry (entry.page.id)}
				{@const parentPath = parentChainLabel(entry.page)}
				<li>
					<button
						type="button"
						class="btn w-full justify-start text-left btn-ghost"
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
		{#snippet actions()}
			<WashButton variant="ghost" onClick={closeSearchDialog}>Close</WashButton>
		{/snippet}
</WashDialog>
