<script lang="ts">
	import { page } from '$app/state';
	import GPrivateMedoraFooterBar from '$lib/component/own/global/private/medora/GPrivateMedoraFooterBar.svelte';
	import GPrivateMedoraModuleBar from '$lib/component/own/global/private/medora/GPrivateMedoraModuleBar.svelte';
	import GPrivateMedoraNavbar from '$lib/component/own/global/private/medora/GPrivateMedoraNavbar.svelte';
	import AnimatedPageContent from '$lib/component/own/library/gsap/AnimatedPageContent.svelte';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { isNursingChartPath } from '$lib/tool/nursing/nursing-worklist.util';
import {
	setPageData,
	pageRowsFrom,
	uniqueModulesFrom,
	getPageData,
	pathnameForPageMatch,
	getSectionIndexRedirectTarget
} from '$lib/state/page.state.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import type { StaffWithRelations } from '$lib/model/type/medora/staff.type';
	import { scrollMedoraSubnavActiveTabsIntoView } from '$lib/util/medora-subnav-scroll.util';
	import { isMedoraVisitScopedPagePath } from '$lib/util/medora-visit-scoped-nav.util';
	import { replaceState, invalidateAll } from '$app/navigation';
	import { browser } from '$app/environment';
	import TrialExpiredRibbon from '$lib/component/own/global/plan/TrialExpiredRibbon.svelte';
	import { setMedoraEntitlementFromLayout } from '$lib/state/medora-entitlement.state.svelte';
	import { setPagePermissions } from '$lib/state/page-permission.state.svelte';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';

	let { children, data } = $props();

	const routerUtil = new RouterUtil();
	const hospitalId = $derived(page.params.hospital_id ?? '');

	// Page list comes from server: all pages for OWNER/SYSTEM_ADMIN, filtered by user group for STAFF
	$effect(() => {
		if (data.pageData?.length !== undefined)
			setPageData(data.pageData);
	});

	// Per-page action grants drive button gating everywhere under this layout.
	$effect(() => {
		setPagePermissions(data.pagePermissions ?? null);
	});

	// Derive directly from layout data: reading the module-level store here made
	// the bar render one flush with `moduleList: []` before the effect populated it.
	const uniqueModuleData = $derived(uniqueModulesFrom(data.pageData ?? []));
	const pageData = $derived(pageRowsFrom(data.pageData ?? []));
	const isEmbed = $derived(
		page.url.searchParams.get('embed') === '1'
	);
	const isInEmrCloneEmr = $derived.by(() => {
		const logicalPath = pathnameForPageMatch();
		return (
			isNursingChartPath(logicalPath) ||
			logicalPath.startsWith(WebRoutesEnum.MEDORA_HOME_CONSULTATION_EMR) ||
			logicalPath.startsWith(WebRoutesEnum.MEDORA_HOME_CONSULTATION_CPOE) ||
			logicalPath.startsWith(WebRoutesEnum.MEDORA_HOME_MEDICATION_ORDER) ||
			logicalPath.startsWith(WebRoutesEnum.MEDORA_HOME_BILLING)
		);
	});
	// Appointment module UX: hide the module bar navbar automatically.
	const isInAppointmentModule = $derived(
		pathnameForPageMatch().startsWith('/medora/home/appointment')
	);
	let appointmentNavbarOpen = $state(false);
	let prevInAppointmentModule = $state(false);
	$effect(() => {
		if (isInAppointmentModule && !prevInAppointmentModule)
			appointmentNavbarOpen = false;
		prevInAppointmentModule = isInAppointmentModule;
	});
	let emrNavbarOpen = $state(false);
	let prevInEmrCloneEmr = $state(false);
	$effect(() => {
		if (isInEmrCloneEmr && !prevInEmrCloneEmr) emrNavbarOpen = false;
		prevInEmrCloneEmr = isInEmrCloneEmr;
	});
	const currentStaffId = $derived(data?.staff?.id ?? null);
	const currentStaffPhotoUrl = $derived(
		(data?.staff as { photoUrl?: string | null } | null)?.photoUrl ??
			null
	);
	const userEmail = $derived(
		((data as { user?: { email?: string | null } | null })?.user
			?.email ?? null) as string | null
	);

	/** Display name in module bar: staff legal name first (fresh after account save invalidate), then `user.name`, then email. */
	const staffDisplayName = $derived.by(() => {
		const s = data?.staff as StaffWithRelations | null | undefined;
		if (s) {
			const name = StringUtil.fullNameWithTitle(
				s.title?.name ?? null,
				s.firstName,
				s.middleName,
				s.lastName
			).trim();
			if (name) return name;
		}
		const u = (
			data as {
				user?: { name?: string | null; email?: string | null } | null;
			}
		)?.user;
		if (u?.name?.trim()) return u.name.trim();
		if (u?.email?.trim()) return u.email.trim();
		return null;
	});

	/** Seed Account settings from session staff already on `page.data` (instant prefill). */
	const accountInitialProfile = $derived.by(() => {
		const s = data?.staff as
			| (StaffWithRelations & {
					photoUrl?: string | null;
					address?: string | null;
					genderId?: number | null;
					staffDetail?: {
						licenseNo?: string | null;
						licenseExpiryDate?: string | Date | null;
						signatureImageUrl?: string | null;
						signatureText?: string | null;
					} | null;
				})
			| null
			| undefined;
		if (!s?.id) return null;

		const toDateSeed = (v: string | Date | null | undefined) => {
			if (v == null || v === '') return null;
			if (v instanceof Date) {
				if (Number.isNaN(v.getTime())) return null;
				return v.toISOString().slice(0, 10);
			}
			const s = String(v).trim();
			if (!s) return null;
			const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
			return m?.[1] ?? s;
		};

		return {
			firstName: s.firstName ?? null,
			middleName: s.middleName ?? null,
			lastName: s.lastName ?? null,
			photoUrl: s.photoUrl ?? null,
			phonePrimary: s.phonePrimary ?? null,
			address: s.address ?? null,
			dateOfBirth: toDateSeed(
				s.dateOfBirth as string | Date | null | undefined
			),
			genderId: s.genderId ?? s.gender?.id ?? null,
			licenseNo: s.staffDetail?.licenseNo ?? null,
			licenseExpiryDate: toDateSeed(s.staffDetail?.licenseExpiryDate),
			signatureImageUrl: s.staffDetail?.signatureImageUrl ?? null,
			signatureText: s.staffDetail?.signatureText ?? null
		};
	});

	$effect(() => {
		page.url.pathname;
		pathnameForPageMatch();
		scrollMedoraSubnavActiveTabsIntoView();
	});

	/** Drop stray `?visitId=` on admin/setup routes without a full navigation (avoids racing child redirects). */
	$effect(() => {
		if (!browser) return;
		const logicalPath = pathnameForPageMatch();
		if (isMedoraVisitScopedPagePath(logicalPath)) return;
		if (!page.url.searchParams.has('visitId')) return;
		const next = new URL(page.url);
		next.searchParams.delete('visitId');
		const target = `${next.pathname}${next.search}${next.hash}`;
		replaceState(target, page.state);
	});

	/** Section index → first sub-page (client navigations; mirrors home layout server redirect). */
	$effect(() => {
		if (!browser || !hospitalId) return;
		// `getSectionIndexRedirectTarget` reads the nav store; keep it the dependency.
		getPageData();
		const target = getSectionIndexRedirectTarget(hospitalId, page.url.search);
		if (!target?.startsWith(`/medora/hospital/${hospitalId}/home`)) {
			return;
		}
		try {
			const targetPath = new URL(target, page.url.origin).pathname;
			if (page.url.pathname === targetPath) return;
		} catch {
			return;
		}
		routerUtil.replaceRoute(target);
	});

	const entitlementShowRibbon = $derived(
		Boolean(
			(data as { entitlementShowRibbon?: boolean })?.entitlementShowRibbon
		)
	);
	const entitlementRibbonLabel = $derived(
		(data as { entitlementRibbonLabel?: string | null })
			?.entitlementRibbonLabel ?? 'Trial expired'
	);
	const ownerWorkspaceReadOnly = $derived(
		Boolean(
			(data as { ownerWorkspaceReadOnly?: boolean })?.ownerWorkspaceReadOnly
		)
	);

	$effect(() => {
		setMedoraEntitlementFromLayout({
			ownerWorkspaceReadOnly: ownerWorkspaceReadOnly
		});
	});

	/** An enrichment query in the layout load failed; the nav may be incomplete. */
	const navLoadError = $derived(
		Boolean((data as { navLoadError?: boolean })?.navLoadError)
	);

	async function retryNavLoad() {
		navRetrying = true;
		try {
			await invalidateAll();
		} finally {
			navRetrying = false;
		}
	}

	let navRetrying = $state(false);
</script>

<div class="my-app">
	{#if entitlementShowRibbon}
		<TrialExpiredRibbon label={entitlementRibbonLabel} />
	{/if}
	{#if ownerWorkspaceReadOnly}
		<div
			class="bg-error/70 text-error-content border-error/30 border-b px-4 py-2 text-center text-sm text-error"
			role="status"
		>
			This workspace is read-only. Viewing is allowed; changes are blocked until your plan is renewed.
		</div>
	{/if}
	{#if !isEmbed}
		<GPrivateMedoraNavbar />
		{#if navLoadError}
			<div class="px-3 pt-2">
				<WashAlert
					type={StatusColorEnum.ERROR}
					message={m.nav_load_degraded()}
					className="z-0 border-l-4 border-error shadow-sm"
				>
					{#snippet trailing()}
						<WashButton
							className="btn-sm btn-outline"
							onClick={() => void retryNavLoad()}
							loading={navRetrying}
						>
							{m.nav_load_retry()}
						</WashButton>
					{/snippet}
				</WashAlert>
			</div>
		{/if}
		{#key `${hospitalId}-${((data as any)?.staffUserGroupsForNav ?? []).map((g: { id: number }) => g.id).join(',')}-${((data as any)?.staffBranchesForNav ?? []).map((b: { id: string }) => b.id).join(',')}-${(data as any)?.selectedInventoryFromStoreId ?? ''}-${(data as any)?.inventoryFromStoresForNav?.length ?? 0}`}
			<GPrivateMedoraModuleBar
				{hospitalId}
				{userEmail}
				hospitalName={data?.currentHospitalName ?? null}
				hospitalLogoUrl={
					(data as { currentHospitalLogoUrl?: string | null })
						?.currentHospitalLogoUrl ?? null
				}
				moduleList={uniqueModuleData}
				pageList={pageData}
				staffId={currentStaffId}
				staffPhotoUrl={currentStaffPhotoUrl}
				{staffDisplayName}
				initialProfile={accountInitialProfile}
				userRoleId={data?.userRoleId ?? null}
				staffUserGroupsForNav={(data as any)?.staffUserGroupsForNav ??
					[]}
				selectedUserGroupId={data?.selectedUserGroupId ?? null}
				staffBranchesForNav={(data as any)?.staffBranchesForNav ?? []}
				selectedBranchId={data?.selectedBranchId ?? null}
				inventoryFromStoresForNav={(data as any)
					?.inventoryFromStoresForNav ?? []}
				selectedInventoryFromStoreId={(data as any)
					?.selectedInventoryFromStoreId ?? null}
				navbarVisible={isInAppointmentModule
					? appointmentNavbarOpen
					: isInEmrCloneEmr
						? emrNavbarOpen
						: undefined}
				onToggleNavbar={isInAppointmentModule
					? () => (appointmentNavbarOpen = !appointmentNavbarOpen)
					: isInEmrCloneEmr
						? () => (emrNavbarOpen = !emrNavbarOpen)
						: undefined}
			/>
		{/key}
	{/if}
	<div class="my-main p-3" class:my-main-embed={isEmbed}>
		{#key page.url.pathname}
			<AnimatedPageContent>
				{#if children}
					{@render children()}
				{/if}
			</AnimatedPageContent>
		{/key}
	</div>
	{#if !isEmbed}
		<GPrivateMedoraFooterBar />
	{/if}
</div>

<style>
	.my-main-embed {
		padding: 0.5rem;
	}
</style>
