<script lang="ts">
	import { page } from '$app/state';
	import GPrivateMedoraFooterBar from '$lib/component/own/global/private/medora/GPrivateMedoraFooterBar.svelte';
	import GPrivateMedoraModuleBar from '$lib/component/own/global/private/medora/GPrivateMedoraModuleBar.svelte';
	import GPrivateMedoraNavbar from '$lib/component/own/global/private/medora/GPrivateMedoraNavbar.svelte';
	import AnimatedPageContent from '$lib/component/own/library/gsap/AnimatedPageContent.svelte';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import {
		setPageData,
		getUniqueModuleData,
		getPageData,
		pathnameForPageMatch
	} from '$lib/state/page.state.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import type { StaffWithRelations } from '$lib/model/type/medora/staff.type';

	let { children, data } = $props();

	const hospitalId = $derived(page.params.hospital_id ?? '');

	// Page list comes from server: all pages for OWNER/SYSTEM_ADMIN, filtered by user group for STAFF
	$effect(() => {
		if (data.pageData?.length !== undefined)
			setPageData(data.pageData);
	});

	const uniqueModuleData = $derived(getUniqueModuleData());
	const pageData = $derived(getPageData());
	const isEmbed = $derived(
		page.url.searchParams.get('embed') === '1'
	);
	const isInEmrCloneEmr = $derived(
		pathnameForPageMatch().startsWith(
			WebRoutesEnum.MEDORA_HOME_NURSING_WORKBENCH_EMR
		) ||
			pathnameForPageMatch().startsWith(
				WebRoutesEnum.MEDORA_HOME_CONSULTATION_EMR
			) ||
			pathnameForPageMatch().startsWith(
				WebRoutesEnum.MEDORA_HOME_CONSULTATION_CPOE
			) ||
			pathnameForPageMatch().startsWith(
				WebRoutesEnum.MEDORA_HOME_MEDICATION_ORDER
			) ||
			pathnameForPageMatch().startsWith(
				WebRoutesEnum.MEDORA_HOME_BILLING
			)
	);
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

	/** Display name in module bar: `user.name` (auth `user` table) first, then staff legal name, then email. */
	const staffDisplayName = $derived.by(() => {
		const u = (
			data as {
				user?: { name?: string | null; email?: string | null } | null;
			}
		)?.user;
		if (u?.name?.trim()) return u.name.trim();
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
		if (u?.email?.trim()) return u.email.trim();
		return null;
	});
</script>

<div class="my-app">
	{#if !isEmbed}
		<GPrivateMedoraNavbar />
		{#key `${hospitalId}-${((data as any)?.staffUserGroupsForNav ?? []).map((g: { id: number }) => g.id).join(',')}-${((data as any)?.staffBranchesForNav ?? []).map((b: { id: string }) => b.id).join(',')}-${(data as any)?.selectedInventoryFromStoreId ?? ''}-${(data as any)?.inventoryFromStoresForNav?.length ?? 0}`}
			<GPrivateMedoraModuleBar
				{hospitalId}
				{userEmail}
				hospitalName={data?.currentHospitalName ?? null}
				moduleList={uniqueModuleData}
				pageList={pageData}
				staffId={currentStaffId}
				staffPhotoUrl={currentStaffPhotoUrl}
				{staffDisplayName}
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
				{@render children?.()}
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
