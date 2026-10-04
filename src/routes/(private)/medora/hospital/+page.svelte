<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import { medoraHospitalHome } from '$lib/model/enum/routes.enum';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import MenziesTableEditDeleteActions from '$lib/component/own/library/menzies/table/MenziesTableEditDeleteActions.svelte';
	import NewHospitalModal from '$lib/component/own/snippet/modal/NewHospitalModal.svelte';
	import { HospitalModalState } from '$lib/state/hospital-modal.state.svelte';
	import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import LucideUserCog from '$lib/component/own/library/lucide/LucideUserCog.svelte';
	import LucideHospital from '$lib/component/own/library/lucide/LucideHospital.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideRefreshCcw from '$lib/component/own/library/lucide/LucideRefreshCcw.svelte';
	import { m } from '$lib/paraglide/messages';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import {
		ensureTwoFactorForMutation,
		redirectIfTwoFactorRequired
	} from '$lib/util/two-factor-gate.util';
	import { getHospitalLogoDisplayUrl } from '$lib/util/staff-photo.util';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';

	type HospitalWithOwner = {
		id: string;
		name: string | null;
		code: string | null;
		address: string | null;
		phone: string | null;
		email: string | null;
		logoUrl: string | null;
		statusId: number | null;
		codingSystem?: string | null;
		owner?: { id: string; name: string | null; email: string } | null;
	};

	function codingSystemLabel(system: string | null | undefined): string {
		if (system === 'ICD11') return msg.hospital_coding_system_icd11();
		return msg.hospital_coding_system_icd10();
	}

	const msg = m as Record<string, (inputs?: object) => string>;

	const data = $derived(page.data);
	const isStaff = $derived(data?.userRoleId === RoleEnum.STAFF);
	const isSystemAdmin = $derived(
		data?.userRoleId === RoleEnum.SYSTEM_ADMIN
	);
	const isOwner = $derived(data?.userRoleId === RoleEnum.OWNER);
	/** Edit: OWNER and SYSTEM_ADMIN (and non-staff managers). */
	const canManageHospitals = $derived(!isStaff);
	/** Create / soft-delete: SYSTEM_ADMIN / admin team only. OWNER cannot. */
	const canCreateHospital = $derived(canManageHospitals && !isOwner);
	const canDeleteHospital = $derived(canManageHospitals && !isOwner);

	const routerUtil = new RouterUtil();
	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	let hospitalResult =
		$state<PaginatedResult<HospitalWithOwner> | null>(null);
	let currentPage = $state(1);
	let pageSizeStr = $state('24');
	let isLoading = $state(true);
	let statusFilter = $state(String(StatusEnum.ACTIVE));

	const hospitals = $derived(hospitalResult?.data ?? []);
	const total = $derived(hospitalResult?.total ?? 0);
	const totalPages = $derived(hospitalResult?.totalPages ?? 1);

	$effect(() => {
		const d = page.data;
		if (d?.initialHospitals != null && hospitalResult == null) {
			hospitalResult = {
				data: d.initialHospitals as HospitalWithOwner[],
				total: d.initialTotal ?? 0,
				page: d.initialPage ?? 1,
				pageSize:
					d.initialPageSize ?? AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE,
				totalPages: d.initialTotalPages ?? 1
			};
			currentPage = d.initialPage ?? 1;
			isLoading = false;
		}
	});

	function statusLabel(statusId: number | null | undefined): string {
		if (statusId === StatusEnum.ACTIVE) return msg.active_label();
		if (statusId === StatusEnum.INACTIVE) return msg.inactive_label();
		return msg.status();
	}

	function statusBadgeClass(
		statusId: number | null | undefined
	): string {
		if (statusId === StatusEnum.ACTIVE) return 'badge-success';
		if (statusId === StatusEnum.INACTIVE) return 'badge-ghost';
		return 'badge-neutral';
	}

	function hospitalDisplayName(h: HospitalWithOwner): string {
		return h.name?.trim() || h.code?.trim() || msg.hospitals();
	}

	async function loadHospitals(forceRefresh = false) {
		isLoading = true;
		try {
			const ownerId =
				isOwner && data?.user
					? (data.user as { id?: string }).id
					: undefined;
			const pageSize = Number(pageSizeStr) || 24;
			const parsedStatusId = statusFilter
				? Number(statusFilter)
				: undefined;
			const params = {
				page: String(currentPage),
				pageSize: String(pageSize),
				...(ownerId != null && { ownerId }),
				...(parsedStatusId != null &&
					Number.isFinite(parsedStatusId) && {
						statusId: String(parsedStatusId)
					}),
				...(forceRefresh && { _t: String(Date.now()) })
			};
			const url = new URL(
				'/api/medora/hospital',
				window.location.origin
			);
			for (const [k, v] of Object.entries(params))
				url.searchParams.set(k, v);

			const res = await fetch(url, { method: 'GET' });
			if (!res.ok) await throwUserFacingHttpError(res);
			hospitalResult =
				(await res.json()) as PaginatedResult<HospitalWithOwner>;
		} finally {
			isLoading = false;
		}
	}

	function goToHospitalHome(hospitalId: string) {
		routerUtil.goToRoute(medoraHospitalHome(hospitalId));
	}

	async function requireMutationTwoFactor(): Promise<boolean> {
		return ensureTwoFactorForMutation({
			userRoleId: data?.userRoleId ?? null,
			twoFactorEnabled: Boolean(
				(data as { twoFactorEnabled?: boolean } | undefined)
					?.twoFactorEnabled
			)
		});
	}

	async function openEditHospitalModal(h: HospitalWithOwner) {
		if (!(await requireMutationTwoFactor())) return;
		HospitalModalState.hospitalId = h.id as string;
		HospitalModalState.currentUserRoleId = data?.userRoleId;
		HospitalModalState.currentUserId = data?.user
			? (data.user as { id?: string }).id
			: undefined;
		HospitalModalState.preselectedOwnerId = null;
		const result = await dialogService.open({
			title: m.edit_hospital(),
			component: NewHospitalModal
		});
		if (result.confirmed) {
			await loadHospitals(true);
		}
	}

	async function openNewHospitalModal() {
		if (!canCreateHospital) return;
		if (!(await requireMutationTwoFactor())) return;
		HospitalModalState.hospitalId = null;
		HospitalModalState.currentUserRoleId = data?.userRoleId;
		HospitalModalState.currentUserId = data?.user
			? (data.user as { id?: string }).id
			: undefined;
		HospitalModalState.preselectedOwnerId = null;
		const result = await dialogService.open({
			title: m.new_hospital(),
			component: NewHospitalModal
		});
		if (result.confirmed) {
			await loadHospitals(true);
		}
	}

	async function handleDelete(h: HospitalWithOwner) {
		if (!canDeleteHospital) return;
		if (!(await requireMutationTwoFactor())) return;
		const result = await dialogService.open({
			title: m.delete_hospital(),
			message: `Delete="${h.name ?? h.code ?? m.hospitals()}"? This cannot be undone.`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			const res = await fetch('/api/medora/hospital', {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id: h.id })
			});
			if (!res.ok) {
				if (await redirectIfTwoFactorRequired(res)) return;
				await throwUserFacingHttpError(res);
			}
			toastService.addToast(
				m.hospital_deleted(),
				StatusColorEnum.SUCCESS
			);
			await loadHospitals(true);
		} catch (err) {
			const errMsg =
				err instanceof Error ? err.message : m.delete_failed();
			toastService.addToast(errMsg, StatusColorEnum.ERROR);
		}
	}

	function onStatusFilterChange(value: string) {
		statusFilter = value;
		currentPage = 1;
		void loadHospitals(true);
	}

	function goPrevPage() {
		if (currentPage <= 1) return;
		currentPage -= 1;
		void loadHospitals(true);
	}

	function goNextPage() {
		if (currentPage >= totalPages) return;
		currentPage += 1;
		void loadHospitals(true);
	}

	lifeCycleUtil.onMount(() => {
		if (page.data?.initialHospitals == null) {
			loadHospitals();
		}
	});
</script>

{#if isStaff && !data?.allowedHospitalIds?.length}
	<p class="py-8 text-center text-base-content/70">
		{m.no_hospital_assigned()}
	</p>
{:else}
	<div class="flex h-full min-h-0 flex-col gap-4 p-4 sm:p-6">
		<header
			class="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
		>
			<div class="min-w-0">
				<h1 class="text-primary text-xl font-bold sm:text-2xl">
					{m.choose_hospital()}
				</h1>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<div class="form-control w-auto min-w-[9rem]">
					<label for="a11y-page-477885" class="sr-only">{m.status()}</label>
					<WashSelect
						id="a11y-page-477885"
						className="select select-bordered select-sm min-w-[9rem] cursor-pointer"
						menuWidth="9rem"
						aria-label={m.status()}
						value={statusFilter}
						options={[
							{
								value: String(StatusEnum.ACTIVE),
								label: msg.active_label()
							},
							{
								value: String(StatusEnum.INACTIVE),
								label: msg.inactive_label()
							}
						]}
						onChange={(next) => {
							if (next != null) onStatusFilterChange(next);
						}}
					/>
				</div>
				<div
					class="tooltip tooltip-bottom tooltip-primary"
					data-tip={m.refresh_data()}
				>
					<button
						type="button"
						class="btn btn-ghost btn-square btn-sm btn-primary cursor-pointer"
						class:loading={isLoading}
						disabled={isLoading}
						class:cursor-not-allowed={isLoading}
						aria-label={m.refresh_data()}
						onclick={() => loadHospitals(true)}
					>
						{#if !isLoading}
							<LucideRefreshCcw className="size-4" />
						{/if}
					</button>
				</div>
				{#if isSystemAdmin}
					<WashButton
						className="btn-outline btn-sm"
						onClick={() =>
							routerUtil.goToRoute(WebRoutesEnum.MEDORA_ADMIN)}
					>
						<LucideUserCog className="size-4" />
						{m.manage_owners()}
					</WashButton>
				{/if}
				{#if canCreateHospital}
					<WashButton
						className="btn-primary btn-sm"
						onClick={openNewHospitalModal}
					>
						<LucidePlus className="size-4" />
						{m.new_hospital()}
					</WashButton>
				{/if}
			</div>
		</header>

		{#if isLoading && hospitals.length === 0}
			<div class="flex flex-1 items-center justify-center py-16">
				<span class="loading loading-spinner loading-lg text-primary"
				></span>
			</div>
		{:else if hospitals.length === 0}
			<p class="py-16 text-center text-base-content/70">
				{isOwner ? msg.owner_no_hospitals_yet() : m.no_hospitals_yet()}
			</p>
		{:else}
			<div
				class="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
			>
				{#each hospitals as h (h.id)}
					{@const displayName = hospitalDisplayName(h)}
					{@const logoSrc = getHospitalLogoDisplayUrl(h.logoUrl)}
					<WashCard
						className="h-full transition-shadow hover:shadow-lg"
						animate={true}
					>
						<WashCardBody className="gap-4 p-4 sm:p-5">
							<button
								type="button"
								class="flex w-full cursor-pointer items-start gap-3 rounded-box text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
								aria-label={msg.hospital_chooser_enter_aria({
									name: displayName
								})}
								onclick={() => goToHospitalHome(h.id)}
							>
								<div
									class="bg-base-200 flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-box"
								>
									{#if logoSrc}
										<img
											src={logoSrc}
											alt={m.hospital_logo_alt()}
											class="size-full object-contain p-1"
										/>
									{:else}
										<LucideHospital
											className="size-7 text-base-content/40"
										/>
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<h2
										class="card-title text-base font-bold leading-snug sm:text-lg"
									>
										{displayName}
									</h2>
									{#if h.code}
										<p class="mt-0.5 text-sm text-base-content/60">
											{msg.hospital_code_label({ code: h.code })}
										</p>
									{/if}
									<p class="mt-0.5 text-sm text-base-content/60">
										{msg.hospital_coding_system_label({
											system: codingSystemLabel(h.codingSystem)
										})}
									</p>
									<span
										class="badge badge-sm mt-2 {statusBadgeClass(
											h.statusId
										)}"
									>
										{statusLabel(h.statusId)}
									</span>
								</div>
							</button>

							<div
								class="card-actions mt-auto flex items-center justify-between gap-2"
							>
								{#if canManageHospitals}
									<MenziesTableEditDeleteActions
										onEdit={() => openEditHospitalModal(h)}
										onDelete={() => handleDelete(h)}
										showDelete={canDeleteHospital}
									/>
								{:else}
									<span></span>
								{/if}
								<WashButton
									className="btn-primary btn-sm"
									onClick={() => goToHospitalHome(h.id)}
								>
									{m.enter()}
								</WashButton>
							</div>
						</WashCardBody>
					</WashCard>
				{/each}
			</div>

			{#if totalPages > 1}
				<div class="join shrink-0 self-center">
					<button
						type="button"
						class="btn join-item btn-sm cursor-pointer"
						class:btn-disabled={currentPage <= 1}
						disabled={currentPage <= 1}
						class:cursor-not-allowed={currentPage <= 1}
						onclick={goPrevPage}
					>
						«
					</button>
					<button
						type="button"
						class="btn join-item btn-sm cursor-default"
						disabled
					>
						{currentPage} / {totalPages}
						<span class="sr-only">({total})</span>
					</button>
					<button
						type="button"
						class="btn join-item btn-sm cursor-pointer"
						class:btn-disabled={currentPage >= totalPages}
						disabled={currentPage >= totalPages}
						class:cursor-not-allowed={currentPage >= totalPages}
						onclick={goNextPage}
					>
						»
					</button>
				</div>
			{/if}
		{/if}
	</div>
{/if}
