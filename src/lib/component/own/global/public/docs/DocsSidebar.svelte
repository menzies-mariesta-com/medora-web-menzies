<script lang="ts">
	import type { DocsManifestModule } from '$lib/docs/manifest.types';
	import manifest from '$lib/docs/manifest.json';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;

	const GUIDES = [
		{ slug: 'getting-started', label: () => msg.docs_nav_getting_started() },
		{ slug: 'security', label: () => msg.docs_nav_security() },
		{ slug: 'coding-standards', label: () => msg.docs_nav_coding_standards() }
	] as const;

	const EMPLOYEE_ROLES = [
		{ slug: 'nurse', title: 'Nurse' },
		{ slug: 'physician', title: 'Physician' },
		{ slug: 'hospital-admin', title: 'Hospital administrator' },
		{ slug: 'lab-technologist', title: 'Lab technologist' },
		{ slug: 'billing-clerk', title: 'Billing clerk' }
	] as const;

	const MACHINE_ROLES = [
		{ slug: 'lis-integration', title: 'LIS / lab integration' },
		{ slug: 'barcode-emar', title: 'Barcode scanning (eMAR)' },
		{ slug: 'document-print', title: 'Document print services' },
		{ slug: 'kiosk-service-account', title: 'Kiosk / service accounts' },
		{ slug: 'upload-service', title: 'Upload endpoints' }
	] as const;

	const JOURNAL_SECTIONS = [
		{ slug: 'registration', title: 'Registration and demographics' },
		{ slug: 'encounters', title: 'Encounters and visits' },
		{ slug: 'vitals', title: 'Vitals' },
		{ slug: 'allergies', title: 'Allergies' },
		{ slug: 'medications', title: 'Medications' },
		{ slug: 'orders', title: 'Orders and CPOE' },
		{ slug: 'results', title: 'Results' },
		{ slug: 'documents', title: 'Clinical documents' },
		{ slug: 'adt', title: 'ADT' },
		{ slug: 'emergency', title: 'Emergency' },
		{ slug: 'perioperative', title: 'Perioperative' },
		{ slug: 'obstetrics', title: 'Obstetrics' },
		{ slug: 'billing', title: 'Billing' }
	] as const;

	const workflowTitleBySlug = new Map(manifest.workflows.map((w) => [w.slug, w.title]));

	let {
		modules = [],
		activePath = '',
		mobileOpen = false,
		onNavigate
	} = $props<{
		modules?: DocsManifestModule[];
		activePath?: string;
		mobileOpen?: boolean;
		onNavigate?: () => void;
	}>();

	function isExact(href: string) {
		return activePath === href;
	}

	function isActivePrefix(href: string) {
		return activePath === href || activePath.startsWith(href + '/');
	}

	function uniqueWorkflowSlugs(slugs: string[]) {
		const out: string[] = [];
		for (const s of slugs) {
			if (!out.includes(s)) out.push(s);
		}
		return out;
	}

	function workflowTitle(slug: string) {
		return workflowTitleBySlug.get(slug) ?? slug;
	}

	const activeWorkflow = $derived(
		manifest.workflows.find((w) => w.path === activePath || activePath === `/docs/workflows/${w.slug}`)
	);

	const activeModuleSlug = $derived(
		activePath.startsWith('/docs/modules/')
			? activePath.split('/')[3]
			: activeWorkflow?.moduleSlug ?? null
	);

	const guidesOpen = $derived(activePath.startsWith('/docs/guides'));
	const modulesOpen = $derived(
		activePath.startsWith('/docs/modules') || activePath.startsWith('/docs/workflows')
	);
	const rolesOpen = $derived(activePath.startsWith('/docs/roles'));
	const employeeRolesOpen = $derived(activePath.startsWith('/docs/roles/employee'));
	const machineRolesOpen = $derived(activePath.startsWith('/docs/roles/machine'));
	const journalOpen = $derived(activePath.startsWith('/docs/patient-journal'));
	const moreOpen = $derived(
		activePath === '/docs/templates' ||
			activePath === '/docs/legal' ||
			activePath === '/docs/releases' ||
			activePath.startsWith('/docs/templates/')
	);

	function moduleOpen(slug: string) {
		return activeModuleSlug === slug;
	}

	function onLinkClick() {
		onNavigate?.();
	}
</script>

<aside
	class="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-ink-border bg-base-200 pt-14 transition-transform duration-200 lg:static lg:z-0 lg:w-64 lg:translate-x-0 lg:pt-0 {mobileOpen
		? 'translate-x-0'
		: '-translate-x-full lg:translate-x-0'}"
>
	<nav class="min-h-0 flex-1 overflow-y-auto px-2 py-4 text-sm" aria-label={msg.docs_nav_aria()}>
		<ul class="menu menu-md w-full gap-0.5 p-0">
			<li>
				<a
					href="/docs"
					class="cursor-pointer"
					class:menu-active={isExact('/docs')}
					onclick={onLinkClick}
				>
					{msg.docs_nav_overview()}
				</a>
			</li>
		</ul>

		<details class="docs-nav-details" open={guidesOpen}>
			<summary class="docs-nav-summary cursor-pointer">{msg.docs_nav_guides()}</summary>
			<ul class="menu menu-sm w-full gap-0 p-0 pl-1">
				{#each GUIDES as guide (guide.slug)}
					<li>
						<a
							href="/docs/guides/{guide.slug}"
							class="cursor-pointer"
							class:menu-active={isExact(`/docs/guides/${guide.slug}`)}
							onclick={onLinkClick}
						>
							{guide.label()}
						</a>
					</li>
				{/each}
			</ul>
		</details>

		<details class="docs-nav-details" open={modulesOpen}>
			<summary class="docs-nav-summary cursor-pointer">{msg.docs_nav_modules()}</summary>
			<div class="flex flex-col gap-0 pl-1">
				{#each modules as mod (mod.slug)}
					<details class="docs-nav-details docs-nav-details-nested" open={moduleOpen(mod.slug)}>
						<summary class="docs-nav-summary docs-nav-summary-nested cursor-pointer">
							{mod.name}
						</summary>
						<ul class="menu menu-sm w-full gap-0 p-0 pl-2">
							<li>
								<a
									href="/docs/modules/{mod.slug}"
									class="cursor-pointer"
									class:menu-active={isExact(`/docs/modules/${mod.slug}`)}
									onclick={onLinkClick}
								>
									{msg.docs_nav_module_overview()}
								</a>
							</li>
							{#each uniqueWorkflowSlugs(mod.workflows) as wfSlug (wfSlug)}
								<li>
									<a
										href="/docs/workflows/{wfSlug}"
										class="cursor-pointer"
										class:menu-active={isExact(`/docs/workflows/${wfSlug}`)}
										onclick={onLinkClick}
									>
										{workflowTitle(wfSlug)}
									</a>
								</li>
							{/each}
						</ul>
					</details>
				{/each}
			</div>
		</details>

		<details class="docs-nav-details" open={rolesOpen}>
			<summary class="docs-nav-summary cursor-pointer">{msg.docs_nav_roles()}</summary>
			<div class="pl-1">
				<details class="docs-nav-details docs-nav-details-nested" open={employeeRolesOpen}>
					<summary class="docs-nav-summary docs-nav-summary-nested cursor-pointer">
						{msg.docs_nav_employee_roles()}
					</summary>
					<ul class="menu menu-sm w-full gap-0 p-0 pl-2">
						{#each EMPLOYEE_ROLES as role (role.slug)}
							<li>
								<a
									href="/docs/roles/employee/{role.slug}"
									class="cursor-pointer"
									class:menu-active={isExact(`/docs/roles/employee/${role.slug}`)}
									onclick={onLinkClick}
								>
									{role.title}
								</a>
							</li>
						{/each}
					</ul>
				</details>
				<details class="docs-nav-details docs-nav-details-nested" open={machineRolesOpen}>
					<summary class="docs-nav-summary docs-nav-summary-nested cursor-pointer">
						{msg.docs_nav_machine_roles()}
					</summary>
					<ul class="menu menu-sm w-full gap-0 p-0 pl-2">
						{#each MACHINE_ROLES as role (role.slug)}
							<li>
								<a
									href="/docs/roles/machine/{role.slug}"
									class="cursor-pointer"
									class:menu-active={isExact(`/docs/roles/machine/${role.slug}`)}
									onclick={onLinkClick}
								>
									{role.title}
								</a>
							</li>
						{/each}
					</ul>
				</details>
			</div>
		</details>

		<details class="docs-nav-details" open={journalOpen}>
			<summary class="docs-nav-summary cursor-pointer">{msg.docs_nav_journal()}</summary>
			<ul class="menu menu-sm w-full gap-0 p-0 pl-1">
				{#each JOURNAL_SECTIONS as section (section.slug)}
					<li>
						<a
							href="/docs/patient-journal/{section.slug}"
							class="cursor-pointer"
							class:menu-active={isExact(`/docs/patient-journal/${section.slug}`)}
							onclick={onLinkClick}
						>
							{section.title}
						</a>
					</li>
				{/each}
			</ul>
		</details>

		<details class="docs-nav-details" open={moreOpen}>
			<summary class="docs-nav-summary cursor-pointer">{msg.docs_nav_more()}</summary>
			<ul class="menu menu-sm w-full gap-0 p-0 pl-1">
				<li>
					<a
						href="/docs/templates"
						class="cursor-pointer"
						class:menu-active={isActivePrefix('/docs/templates')}
						onclick={onLinkClick}
					>
						{msg.docs_nav_templates()}
					</a>
				</li>
				<li>
					<a
						href="/docs/legal"
						class="cursor-pointer"
						class:menu-active={isExact('/docs/legal')}
						onclick={onLinkClick}
					>
						{msg.docs_nav_legal()}
					</a>
				</li>
				<li>
					<a
						href="/docs/releases"
						class="cursor-pointer"
						class:menu-active={isExact('/docs/releases')}
						onclick={onLinkClick}
					>
						{msg.docs_nav_releases()}
					</a>
				</li>
			</ul>
		</details>
	</nav>
</aside>

<style>
	.docs-nav-details {
		margin-top: 0.25rem;
	}

	.docs-nav-summary {
		list-style: none;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.5rem 0.75rem;
		font-weight: 600;
		border-radius: var(--radius-field);
		user-select: none;
	}

	.docs-nav-summary::-webkit-details-marker {
		display: none;
	}

	.docs-nav-summary::before {
		content: '';
		display: inline-block;
		width: 0.4rem;
		height: 0.4rem;
		border-right: 2px solid currentColor;
		border-bottom: 2px solid currentColor;
		transform: rotate(-45deg);
		transition: transform 0.15s ease;
		flex-shrink: 0;
		opacity: 0.7;
	}

	.docs-nav-details[open] > .docs-nav-summary::before {
		transform: rotate(45deg);
	}

	.docs-nav-summary-nested {
		font-weight: 500;
		font-size: 0.875rem;
		padding-left: 0.5rem;
	}

	.docs-nav-details-nested {
		margin-top: 0;
	}
</style>
