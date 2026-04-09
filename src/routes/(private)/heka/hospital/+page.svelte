<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import { hekaHospitalHome } from '$lib/model/enum/routes.enum';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import NewHospitalModal from '$lib/component/own/snippet/modal/NewHospitalModal.svelte';
	import { HospitalModalState } from '$lib/state/hospital-modal.state.svelte';
	import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import LucideUserCog from '$lib/component/own/library/lucide/LucideUserCog.svelte';
	import { m } from '$lib/paraglide/messages';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';

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

	const hospitalColumns: MariTableColumn<HospitalWithOwner>[] = [
		{
			id: 'name',
			header: m.name(),
			widthClass: 'w-48 min-w-[10rem]',
			filterable: false,
			field: 'name',
			format: (v) => v ?? '—'
		},
		{
			id: 'code',
			header: m.code(),
			widthClass: 'w-28 min-w-[6rem]',
			filterable: false,
			field: 'code',
			format: (v) => v ?? '—'
		},
		{
			id: 'owner',
			header: m.owner(),
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (_v, row) => row.owner?.name ?? row.owner?.email ?? '—'
		},
		{
			id: 'status',
			header: m.status(),
			widthClass: 'w-28 min-w-[7rem]',
			filterable: true,
			filterType: 'select',
			filterOptions: [
				{ label: 'Active', value: String(StatusEnum.ACTIVE) },
				{ label: 'Inactive', value: String(StatusEnum.INACTIVE) }
			],
			defaultFilterValue: String(StatusEnum.ACTIVE),
			format: (_v, row) =>
				row.statusId === StatusEnum.ACTIVE
					? 'Active'
					: row.statusId === StatusEnum.INACTIVE
						? 'Inactive'
						: row.statusId === StatusEnum.DELETED
							? 'Deleted'
							: `Status ${row.statusId ?? 'Unknown'}`
		},
		{
			id: 'phone',
			header: m.phone(),
			widthClass: 'w-36 min-w-[9rem]',
			filterable: false,
			field: 'phone',
			format: (v) => v ?? '—'
		},
		{
			id: 'email',
			header: m.email(),
			widthClass: 'w-52 min-w-[12rem]',
			filterable: false,
			field: 'email',
			format: (v) => v ?? '—'
		},
		{
			id: 'address',
			header: m.address(),
			widthClass: 'w-80 min-w-[16rem]',
			filterable: false,
			format: (_v, row) => row.address ?? '—',
			cellClass: 'max-w-[200px] truncate'
		}
	];

	const data = $derived(page.data);
	const isStaff = $derived(data?.userRoleId === RoleEnum.STAFF);
	const isSystemAdmin = $derived(
		data?.userRoleId === RoleEnum.SYSTEM_ADMIN
	);
	const isOwner = $derived(data?.userRoleId === RoleEnum.OWNER);
	const canManageHospitals = $derived(!isStaff);

	const routerUtil = new RouterUtil();
	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	let hospitalResult =
		$state<PaginatedResult<HospitalWithOwner> | null>(null);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(true);
	let tableFilters = $state<Record<string, string>>({});

	const hospitals = $derived(hospitalResult?.data ?? []);
	const total = $derived(hospitalResult?.total ?? 0);

	$effect(() => {
		const d = page.data;
		if (d?.initialHospitals != null && hospitalResult == null) {
			hospitalResult = {
				data: d.initialHospitals,
				total: d.initialTotal ?? 0,
				page: d.initialPage ?? 1,
				pageSize:
					d.initialPageSize ?? AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE,
				totalPages: d.initialTotalPages ?? 1
			};
			currentPage = d.initialPage ?? 1;
			pageSizeStr = String(
				d.initialPageSize ?? AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE
			);
			isLoading = false;
		}
	});

	async function loadHospitals(forceRefresh = false) {
		isLoading = true;
		try {
			const ownerId =
				isOwner && data?.user
					? (data.user as { id?: string }).id
					: undefined;
			const pageSize = Number(pageSizeStr) || 10;
			const parsedStatusId = tableFilters.status
				? Number(tableFilters.status)
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
			const url = new URL('/api/heka/hospital', window.location.origin);
			for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

			const res = await fetch(url, { method: 'GET' });
			if (!res.ok) throw new Error(await res.text());
			hospitalResult = (await res.json()) as PaginatedResult<HospitalWithOwner>;
		} finally {
			isLoading = false;
		}
	}

	function goToHospitalHome(hospitalId: string) {
		routerUtil.goToRoute(hekaHospitalHome(hospitalId));
	}

	async function openEditHospitalModal(h: HospitalWithOwner) {
		HospitalModalState.hospitalId = h.id as string;
		HospitalModalState.currentUserRoleId = data?.userRoleId;
		HospitalModalState.currentUserId = data?.user
			? (data.user as { id?: string }).id
			: undefined;
		const result = await dialogService.open({
			title: m.edit_hospital(),
			component: NewHospitalModal
		});
		if (result.confirmed) {
			await loadHospitals(true);
		}
	}

	async function openNewHospitalModal() {
		HospitalModalState.hospitalId = null;
		HospitalModalState.currentUserRoleId = data?.userRoleId;
		HospitalModalState.currentUserId = data?.user
			? (data.user as { id?: string }).id
			: undefined;
		const result = await dialogService.open({
			title: m.new_hospital(),
			component: NewHospitalModal
		});
		if (result.confirmed) {
			await loadHospitals(true);
		}
	}

	async function handleDelete(h: HospitalWithOwner) {
		const result = await dialogService.open({
			title: m.delete_hospital(),
			message: `Delete "${h.name ?? h.code ?? m.hospitals()}"? This cannot be undone.`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			const res = await fetch('/api/heka/hospital', {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id: h.id })
			});
			if (!res.ok) throw new Error(await res.text());
			toastService.addToast(
				m.hospital_deleted(),
				StatusColorEnum.SUCCESS
			);
			await loadHospitals(true);
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : m.delete_failed();
			toastService.addToast(msg, StatusColorEnum.ERROR);
		}
	}

	lifeCycleUtil.onMount(() => {
		// Fetch when we don't have server-loaded data
		if (page.data?.initialHospitals == null) {
			loadHospitals();
		}
	});
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">{m.choose_hospital()}</h1>
		<div class="flex flex-wrap items-center gap-2">
			{#if isSystemAdmin}
				<DaisyUiButton
					className="d-btn-outline"
					onClick={() =>
						routerUtil.goToRoute(WebRoutesEnum.HEKA_ADMIN_OWNERS)}
				>
					<LucideUserCog />
					{m.manage_owners()}
				</DaisyUiButton>
			{/if}
			{#if canManageHospitals}
				<DaisyUiButton
					className="d-btn-primary"
					onClick={openNewHospitalModal}
				>
					<LucidePlus />
					{m.new_hospital()}
				</DaisyUiButton>
			{/if}
		</div>
	</div>

	{#if isStaff && !data?.allowedHospitalIds?.length}
		<p class="py-8 text-center text-base-content/70">
			{m.no_hospital_assigned()}
		</p>
	{:else}
		<DaisyUiCard>
			<DaisyUiCardBody>
				<div class={TableEnum.HEIGHT}>
					<MariTable
						rows={hospitals}
						columns={hospitalColumns}
						{isLoading}
						bind:pageSize={pageSizeStr}
						bind:currentPage
						totalRowCount={total}
						showRefreshButton={true}
						refreshTooltip={m.refresh_data()}
						emptyMessage={m.no_hospitals_yet()}
						showRowActions={true}
						actionsHeader={m.actions()}
						actionsVariant="none"
						enableColumnFilters={true}
						useRemoteFilters={true}
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
						{#snippet rowActions(row, rowIndex)}
							<div class="flex justify-end gap-2">
								<DaisyUiButton
									className="d-btn-primary d-btn-sm"
									onClick={() => goToHospitalHome(row.id)}
								>
									{m.enter()}
								</DaisyUiButton>
								{#if canManageHospitals}
									<DaisyUiButton
										className="d-btn-ghost d-btn-sm"
										onClick={() => openEditHospitalModal(row)}
									>
										<LucidePencil />
									</DaisyUiButton>
									<DaisyUiButton
										className="d-btn-ghost d-btn-error d-btn-sm"
										onClick={() => handleDelete(row)}
									>
										<LucideTrash2 />
									</DaisyUiButton>
								{/if}
							</div>
						{/snippet}
					</MariTable>
				</div>
			</DaisyUiCardBody>
		</DaisyUiCard>
	{/if}
</div>
