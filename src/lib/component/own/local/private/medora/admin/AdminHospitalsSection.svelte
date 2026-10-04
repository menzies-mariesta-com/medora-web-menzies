<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
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
	import { m } from '$lib/paraglide/messages';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import {
		ensureTwoFactorForMutation,
		redirectIfTwoFactorRequired
	} from '$lib/util/two-factor-gate.util';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	let {
		onChanged,
		refreshKey = 0
	}: {
		onChanged?: () => void | Promise<void>;
		/** Increment to force a reload (e.g. after assign-from-owner). */
		refreshKey?: number;
	} = $props();

	type HospitalWithOwner = {
		id: string;
		name: string | null;
		code: string | null;
		address: string | null;
		phone: string | null;
		email: string | null;
		statusId: number | null;
		owner?: { id: string; name: string | null; email: string } | null;
	};

	const hospitalColumns: MenziesTableColumn<HospitalWithOwner>[] = [
		{
			id: 'name',
			header: m.name(),
			widthClass: 'w-48 min-w-[10rem]',
			filterable: false,
			field: 'name',
			format: (v) => v ?? '-'
		},
		{
			id: 'code',
			header: m.code(),
			widthClass: 'w-28 min-w-[6rem]',
			filterable: false,
			field: 'code',
			format: (v) => v ?? '-'
		},
		{
			id: 'owner',
			header: m.owner(),
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (_v, row) => row.owner?.name ?? row.owner?.email ?? '-'
		},
		{
			id: 'status',
			header: m.status(),
			widthClass: 'w-28 min-w-[7rem]',
			filterable: true,
			filterType: 'select',
			filterOptions: [
				{ label: m.active_label(), value: String(StatusEnum.ACTIVE) },
				{
					label: m.inactive_label(),
					value: String(StatusEnum.INACTIVE)
				}
			],
			defaultFilterValue: String(StatusEnum.ACTIVE),
			format: (_v, row) =>
				row.statusId === StatusEnum.ACTIVE
					? m.active_label()
					: row.statusId === StatusEnum.INACTIVE
						? m.inactive_label()
						: `${m.status()} ${row.statusId ?? m.unknown_label()}`
		},
		{
			id: 'phone',
			header: m.phone(),
			widthClass: 'w-36 min-w-[9rem]',
			filterable: false,
			field: 'phone',
			format: (v) => v ?? '-'
		},
		{
			id: 'email',
			header: m.email(),
			widthClass: 'w-52 min-w-[12rem]',
			filterable: false,
			field: 'email',
			format: (v) => v ?? '-'
		}
	];

	const data = $derived(page.data);
	const routerUtil = new RouterUtil();
	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const msg = m as unknown as Record<string, (inputs?: object) => string>;

	let hospitalResult =
		$state<PaginatedResult<HospitalWithOwner> | null>(null);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(true);
	let tableFilters = $state<Record<string, string>>({});

	const hospitals = $derived(hospitalResult?.data ?? []);
	const total = $derived(hospitalResult?.total ?? 0);

	async function notifyChanged() {
		if (onChanged) await onChanged();
	}

	async function loadHospitals(forceRefresh = false) {
		isLoading = true;
		try {
			const pageSize = Number(pageSizeStr) || 10;
			const parsedStatusId = tableFilters.status
				? Number(tableFilters.status)
				: undefined;
			const params: Record<string, string> = {
				page: String(currentPage),
				pageSize: String(pageSize),
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

			const res = await fetch(url, {
				method: 'GET',
				credentials: 'include'
			});
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

	function setModalUserContext() {
		HospitalModalState.currentUserRoleId = RoleEnum.SYSTEM_ADMIN;
		HospitalModalState.currentUserId = data?.user
			? (data.user as { id?: string }).id
			: undefined;
	}

	async function requireAdminTwoFactor(): Promise<boolean> {
		return ensureTwoFactorForMutation({
			userRoleId: RoleEnum.SYSTEM_ADMIN,
			twoFactorEnabled: Boolean(
				(data as { twoFactorEnabled?: boolean } | undefined)
					?.twoFactorEnabled
			)
		});
	}

	async function openEditHospitalModal(h: HospitalWithOwner) {
		if (!(await requireAdminTwoFactor())) return;
		HospitalModalState.hospitalId = h.id;
		HospitalModalState.preselectedOwnerId = null;
		setModalUserContext();
		const result = await dialogService.open({
			title: m.edit_hospital(),
			component: NewHospitalModal
		});
		if (result.confirmed) {
			await loadHospitals(true);
			await notifyChanged();
		}
	}

	async function openNewHospitalModal() {
		if (!(await requireAdminTwoFactor())) return;
		HospitalModalState.hospitalId = null;
		HospitalModalState.preselectedOwnerId = null;
		setModalUserContext();
		const result = await dialogService.open({
			title: m.new_hospital(),
			component: NewHospitalModal
		});
		if (result.confirmed) {
			await loadHospitals(true);
			await notifyChanged();
		}
	}

	async function handleDelete(h: HospitalWithOwner) {
		if (!(await requireAdminTwoFactor())) return;
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
				credentials: 'include',
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
			await notifyChanged();
		} catch (err) {
			const errMsg =
				err instanceof Error ? err.message : m.delete_failed();
			toastService.addToast(errMsg, StatusColorEnum.ERROR);
		}
	}

	lifeCycleUtil.onMount(() => {
		loadHospitals();
	});

	let lastRefreshKey = $state(0);
	$effect(() => {
		const key = refreshKey;
		if (key > 0 && key !== lastRefreshKey) {
			lastRefreshKey = key;
			void loadHospitals(true);
		}
	});
</script>

<div class="{TableEnum.HEIGHT} min-h-[24rem]">
	<MenziesTable
		title={msg.admin_hospitals_title()}
		showAddButton={true}
		addLabel={m.new_hospital()}
		onAdd={openNewHospitalModal}
		rows={hospitals}
		columns={hospitalColumns}
		{isLoading}
		bind:pageSize={pageSizeStr}
		bind:currentPage
		totalRowCount={total}
		showRefreshButton={true}
		refreshTooltip={m.refresh_data()}
		emptyMessage={msg.admin_no_hospitals_yet()}
		showRowActions={true}
		actionsHeader={m.actions()}
		actionsVariant="none"
		enableColumnFilters={true}
		on:refresh={() => loadHospitals(true)}
		on:pageSizeChange={() => {
			currentPage = 1;
			loadHospitals(true);
		}}
		on:pageChange={() => loadHospitals(true)}
		on:filtersChange={(e) => {
			tableFilters = e.detail.filters;
			currentPage = 1;
			loadHospitals(true);
		}}
	>
		{#snippet rowActions(row)}
			<div class="flex justify-end gap-2">
				<WashButton
					className="btn-primary btn-sm cursor-pointer"
					onClick={() => goToHospitalHome(row.id)}
				>
					{m.enter()}
				</WashButton>
				<MenziesTableEditDeleteActions
					onEdit={() => openEditHospitalModal(row)}
					onDelete={() => handleDelete(row)}
				/>
			</div>
		{/snippet}
	</MenziesTable>
</div>
