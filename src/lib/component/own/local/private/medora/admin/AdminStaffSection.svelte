<script lang="ts">
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import type { AdminStaffListRow } from '$lib/model/type/medora/admin-staff.type';
	import { m } from '$lib/paraglide/messages';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';

	const lifeCycleUtil = new LifeCycleUtil();
	const msg = m as unknown as Record<string, (inputs?: object) => string>;

	let staff = $state<AdminStaffListRow[]>([]);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(true);
	let totalStaff = $state(0);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	function formatDate(s: string | null | undefined): string {
		if (!s) return '-';
		try {
			const d = new Date(s);
			if (Number.isNaN(d.getTime())) return '-';
			return d.toLocaleString(undefined, {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return '-';
		}
	}

	function hospitalsLabel(row: AdminStaffListRow): string {
		if (!row.hospitals.length) return '-';
		return row.hospitals
			.map((h) => h.name?.trim() || h.id)
			.join(', ');
	}

	const staffColumns: MenziesTableColumn<AdminStaffListRow>[] = [
		{
			id: 'name',
			header: m.name(),
			widthClass: 'w-56 min-w-[14rem]',
			field: 'name'
		},
		{
			id: 'email',
			header: m.email(),
			widthClass: 'w-64 min-w-[16rem]',
			field: 'email'
		},
		{
			id: 'hospitals',
			header: msg.admin_staff_hospitals(),
			widthClass: 'w-56 min-w-[14rem]',
			filterable: false,
			format: (_value, row) => hospitalsLabel(row)
		},
		{
			id: 'status',
			header: m.status(),
			widthClass: 'w-32 min-w-[8rem]',
			filterType: 'select',
			filterOptions: [
				{
					label: m.active_label(),
					value: String(StatusEnum.ACTIVE)
				},
				{
					label: m.inactive_label(),
					value: String(StatusEnum.INACTIVE)
				}
			],
			format: (_value, row) => {
				if (row.statusId === StatusEnum.ACTIVE)
					return m.active_label();
				if (row.statusId === StatusEnum.INACTIVE)
					return m.inactive_label();
				if (row.statusId == null) return '-';
				return `${m.status()} ${row.statusId}`;
			}
		},
		{
			id: 'emailVerified',
			header: msg.admin_email_status(),
			widthClass: 'w-32 min-w-[8rem]',
			filterable: false,
			format: (value) =>
				value
					? msg.admin_email_verified()
					: msg.admin_email_unverified()
		},
		{
			id: 'createdAt',
			header: m.created(),
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (value) =>
				formatDate(value as string | null | undefined)
		}
	];

	async function loadStaff() {
		isLoading = true;
		try {
			const pageSize = Number(pageSizeStr) || 10;
			const statusId = tableFilters.status
				? Number(tableFilters.status)
				: undefined;
			const qs = new URLSearchParams();
			qs.set('page', String(currentPage));
			qs.set('pageSize', String(pageSize));
			const name = tableFilters.name?.trim();
			const email = tableFilters.email?.trim();
			if (name) qs.set('name', name);
			if (email) qs.set('email', email);
			if (statusId != null && Number.isFinite(statusId)) {
				qs.set('statusId', String(statusId));
			}
			const res = await fetch(
				`/api/medora/admin/staff?${qs.toString()}`,
				{
					credentials: 'include',
					cache: 'no-store'
				}
			);
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Load failed: ${res.status}`);
			}
			const result = (await res.json()) as {
				data: AdminStaffListRow[];
				total: number;
			};
			staff = result.data;
			totalStaff = result.total;
		} finally {
			isLoading = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		void loadStaff();
	});
</script>

<div class="{TableEnum.HEIGHT} min-h-[24rem]">
	<MenziesTable
		title={msg.admin_staff_title()}
		showAddButton={false}
		rows={staff}
		columns={staffColumns}
		{isLoading}
		bind:pageSize={pageSizeStr}
		bind:currentPage
		totalRowCount={totalStaff}
		showRefreshButton={false}
		emptyMessage={msg.admin_no_staff_yet()}
		showRowActions={false}
		enableColumnFilters={true}
		on:pageSizeChange={() => {
			currentPage = 1;
			void loadStaff();
		}}
		on:pageChange={() => void loadStaff()}
		on:filtersChange={(event) => {
			if (filterDebounceTimeout) {
				clearTimeout(filterDebounceTimeout);
			}
			tableFilters = event.detail.filters;
			currentPage = 1;
			filterDebounceTimeout = setTimeout(() => {
				void loadStaff();
			}, 350);
		}}
	/>
</div>
