<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiLoading from '$lib/component/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { RoleEnum } from '$lib/model/enum/db-link';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { SupportTicketStatusEnum } from '$lib/model/enum/support-ticket-status.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import type { SupportTicketListRow } from '$lib/model/type/heka/ui-rows.type';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { m } from '$lib/paraglide/messages';

	type SupportTicketSessionResult =
		| {
				authenticated: true;
				userId: string;
				userRoleId: number | null;
		  }
		| { authenticated: false; userId: null; userRoleId: null };

	type SupportTicketDetail = SupportTicketListRow & {
		requester?: { id: string; name: string; email: string } | null;
		hospital?: { id: string; name: string | null } | null;
		assignedTo?: { id: string; name: string; email: string } | null;
	};

	let { cancel }: DialogSlotProps = $props();

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: undefined
	);

	let session = $state<SupportTicketSessionResult | null>(null);
	let activeTab = $state<'new' | 'my' | 'all'>('new');
	let listResult =
		$state<PaginatedResult<SupportTicketListRow> | null>(null);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoadingList = $state(false);
	let statusFilter = $state('');
	let selectedId = $state<number | null>(null);
	let detail = $state<SupportTicketDetail | null>(null);
	let isLoadingDetail = $state(false);

	let newSubject = $state('');
	let newDescription = $state('');
	let newPriorityStr = $state('2');
	let isSubmittingNew = $state(false);

	let adminStatus = $state<string>(SupportTicketStatusEnum.OPEN);
	let adminResolution = $state('');
	let adminAssigneeId = $state('');
	let isSavingAdmin = $state(false);

	const isAdmin = $derived(
		session?.authenticated === true &&
			session.userRoleId === RoleEnum.SYSTEM_ADMIN
	);

	const rows = $derived(listResult?.data ?? []);
	const totalRows = $derived(listResult?.total ?? 0);

	async function apiJson<T>(
		input: string,
		init?: RequestInit
	): Promise<T> {
		const res = await fetch(input, {
			...init,
			headers: {
				...(init?.body ? { 'content-type': 'application/json' } : {}),
				...(init?.headers ?? {})
			}
		});

		if (!res.ok) {
			let message = res.statusText || 'Request failed';
			try {
				const body = (await res.json()) as
					| { message?: string; error?: string }
					| undefined;
				message = body?.message || body?.error || message;
			} catch {
				// ignore non-json
			}
			throw new Error(message);
		}

		return (await res.json()) as T;
	}

	function formatDt(value: string | null | undefined): string {
		if (!value) return '—';
		try {
			return new Date(value).toLocaleString(undefined, {
				dateStyle: 'short',
				timeStyle: 'short'
			});
		} catch {
			return '—';
		}
	}

	function statusLabel(s: string): string {
		switch (s) {
			case SupportTicketStatusEnum.OPEN:
				return m.support_status_open();
			case SupportTicketStatusEnum.IN_PROGRESS:
				return m.support_status_in_progress();
			case SupportTicketStatusEnum.RESOLVED:
				return m.support_status_resolved();
			case SupportTicketStatusEnum.CLOSED:
				return m.support_status_closed();
			default:
				return s;
		}
	}

	function priorityLabel(p: number): string {
		switch (p) {
			case 1:
				return m.support_priority_1();
			case 2:
				return m.support_priority_2();
			case 3:
				return m.support_priority_3();
			case 4:
				return m.support_priority_4();
			default:
				return String(p);
		}
	}

	const ticketColumns: MariTableColumn<SupportTicketListRow>[] = [
		{
			id: 'subject',
			header: m.support_subject(),
			widthClass: 'min-w-[12rem]',
			filterable: false,
			field: 'subject'
		},
		{
			id: 'status',
			header: m.support_status(),
			widthClass: 'w-32 min-w-[8rem]',
			filterable: false,
			format: (_v, row) => statusLabel(row.status)
		},
		{
			id: 'priority',
			header: m.support_priority(),
			widthClass: 'w-28 min-w-[7rem]',
			filterable: false,
			format: (_v, row) => priorityLabel(row.priority)
		},
		{
			id: 'createdAt',
			header: m.created_at(),
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (_v, row) => formatDt(row.createdAt)
		}
	];

	async function loadSession() {
		try {
			session = await apiJson<SupportTicketSessionResult>(
				'/api/support-ticket?op=session'
			);
			if (!session?.authenticated) {
				toastService.addToast(
					m.support_unauthorized(),
					StatusColorEnum.ERROR
				);
			}
		} catch {
			session = {
				authenticated: false,
				userId: null,
				userRoleId: null
			};
			toastService.addToast(
				m.support_unauthorized(),
				StatusColorEnum.ERROR
			);
		}
	}

	async function fetchList(opts?: { bustCache?: boolean }) {
		if (activeTab !== 'my' && activeTab !== 'all') return;
		if (activeTab === 'all' && !isAdmin) return;
		isLoadingList = true;
		const pageSize = Number(pageSizeStr) || 10;
		const status =
			statusFilter.trim() &&
			Object.values(SupportTicketStatusEnum).includes(
				statusFilter.trim() as SupportTicketStatusEnum
			)
				? statusFilter.trim()
				: undefined;
		try {
			const sp = new URLSearchParams();
			sp.set('op', 'list');
			sp.set('scope', activeTab);
			sp.set('page', String(currentPage));
			sp.set('pageSize', String(pageSize));
			if (status) sp.set('status', status);
			if (opts?.bustCache) sp.set('_t', String(Date.now()));

			listResult = await apiJson<
				PaginatedResult<SupportTicketListRow>
			>(`/api/support-ticket?${sp.toString()}`);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			toastService.addToast(msg, StatusColorEnum.ERROR);
			listResult = null;
		} finally {
			isLoadingList = false;
		}
	}

	async function loadDetail(id: number) {
		isLoadingDetail = true;
		selectedId = id;
		try {
			const sp = new URLSearchParams();
			sp.set('op', 'byId');
			sp.set('id', String(id));

			const row = await apiJson<SupportTicketDetail | null>(
				`/api/support-ticket?${sp.toString()}`
			);
			detail = row as SupportTicketDetail | null;
			if (detail && isAdmin) {
				adminStatus = detail.status;
				adminResolution = detail.resolution ?? '';
				adminAssigneeId = detail.assignedToUserId ?? '';
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			toastService.addToast(msg, StatusColorEnum.ERROR);
			detail = null;
		} finally {
			isLoadingDetail = false;
		}
	}

	function switchTab(tab: typeof activeTab) {
		activeTab = tab;
		selectedId = null;
		detail = null;
		currentPage = 1;
		if (tab === 'my' || tab === 'all') {
			fetchList({ bustCache: true });
		}
	}

	lifeCycleUtil.onMount(() => {
		void loadSession();
	});

	async function handleCreateTicket(e: Event) {
		e.preventDefault();
		const subject = newSubject.trim();
		const description = newDescription.trim();
		if (!subject) {
			toastService.addToast(
				m.support_subject() + ' *',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!description) {
			toastService.addToast(
				m.support_description() + ' *',
				StatusColorEnum.ERROR
			);
			return;
		}
		const priority = Number(newPriorityStr);
		isSubmittingNew = true;
		try {
			const ctx =
				(typeof page.url?.pathname === 'string'
					? page.url.pathname
					: '') +
				(typeof page.url?.search === 'string' ? page.url.search : '');
			await apiJson('/api/support-ticket', {
				method: 'POST',
				body: JSON.stringify({
					subject,
					description,
					priority,
					hospitalId: hospitalId ?? null,
					contextUrl: ctx || null
				})
			});
			toastService.addToast(
				m.support_ticket_created(),
				StatusColorEnum.SUCCESS
			);
			newSubject = '';
			newDescription = '';
			newPriorityStr = '2';
			switchTab('my');
		} catch (err) {
			const msg =
				err instanceof Error
					? err.message
					: m.support_ticket_failed();
			toastService.addToast(msg, StatusColorEnum.ERROR);
		} finally {
			isSubmittingNew = false;
		}
	}

	async function handleSaveAdmin() {
		if (!detail) return;
		isSavingAdmin = true;
		try {
			await apiJson('/api/support-ticket', {
				method: 'PUT',
				body: JSON.stringify({
					id: detail.id,
					status: adminStatus as SupportTicketStatusEnum,
					assignedToUserId: adminAssigneeId.trim() || null,
					resolution: adminResolution.trim() || null
				})
			});
			toastService.addToast(
				m.support_ticket_updated(),
				StatusColorEnum.SUCCESS
			);
			await loadDetail(detail.id);
			await fetchList({ bustCache: true });
		} catch (err) {
			const msg =
				err instanceof Error
					? err.message
					: m.support_ticket_update_failed();
			toastService.addToast(msg, StatusColorEnum.ERROR);
		} finally {
			isSavingAdmin = false;
		}
	}

	function onRowClick(e: CustomEvent<SupportTicketListRow>) {
		const row = e.detail;
		if (row?.id != null) void loadDetail(row.id);
	}
</script>

<div class="flex h-full min-h-[60vh] flex-col gap-0">
	<div
		class="flex flex-wrap items-center justify-between gap-2 border-b border-base-300 px-4 py-2"
	>
		<h2 class="text-lg font-semibold">{m.support_it_title()}</h2>
		<DaisyUiButton
			className="d-btn-ghost d-btn-sm d-btn-circle"
			onClick={() => cancel()}
		>
			<LucideX className="size-5" />
		</DaisyUiButton>
	</div>

	<div
		class="flex flex-wrap gap-1 border-b border-base-200 px-4 py-2"
	>
		<DaisyUiButton
			className="d-btn-sm {activeTab === 'new'
				? 'd-btn-primary'
				: 'd-btn-ghost'}"
			onClick={() => switchTab('new')}
		>
			{m.support_tab_new()}
		</DaisyUiButton>
		<DaisyUiButton
			className="d-btn-sm {activeTab === 'my'
				? 'd-btn-primary'
				: 'd-btn-ghost'}"
			onClick={() => switchTab('my')}
		>
			{m.support_tab_my_tickets()}
		</DaisyUiButton>
		{#if isAdmin}
			<DaisyUiButton
				className="d-btn-sm {activeTab === 'all'
					? 'd-btn-primary'
					: 'd-btn-ghost'}"
				onClick={() => switchTab('all')}
			>
				{m.support_tab_all_tickets()}
			</DaisyUiButton>
		{/if}
	</div>

	{#if activeTab === 'new'}
		<form
			class="flex flex-1 flex-col gap-4 overflow-auto p-4"
			onsubmit={handleCreateTicket}
		>
			<div class="flex flex-col gap-1">
				<DaisyUiLabel
					forText="support-subject"
					className="font-semibold"
				>
					{m.support_subject()} <span class="text-error">*</span>
				</DaisyUiLabel>
				<DaisyUiInputField
					id="support-subject"
					className="w-full"
					bind:value={newSubject}
					inputPlaceholderText={m.support_subject()}
				/>
			</div>
			<div class="flex flex-col gap-1">
				<DaisyUiLabel
					forText="support-desc"
					className="font-semibold"
				>
					{m.support_description()}
					<span class="text-error">*</span>
				</DaisyUiLabel>
				<DaisyUiTextarea
					id="support-desc"
					className="textarea-bordered min-h-32 w-full"
					bind:value={newDescription}
				/>
			</div>
			<div class="flex max-w-xs flex-col gap-1">
				<DaisyUiLabel
					forText="support-priority"
					className="font-semibold"
				>
					{m.support_priority()}
				</DaisyUiLabel>
				<DaisyUiSelect className="w-full" bind:value={newPriorityStr}>
					<option value="1">{m.support_priority_1()}</option>
					<option value="2">{m.support_priority_2()}</option>
					<option value="3">{m.support_priority_3()}</option>
					<option value="4">{m.support_priority_4()}</option>
				</DaisyUiSelect>
			</div>
			<div class="d-modal-action">
				<DaisyUiButton
					type="button"
					className="d-btn"
					onClick={() => cancel()}
				>
					{m.cancel()}
				</DaisyUiButton>
				<DaisyUiButton
					type="submit"
					className="d-btn d-btn-primary"
					loading={isSubmittingNew}
					loadingText={m.support_submitting()}
				>
					{m.support_submit_ticket()}
				</DaisyUiButton>
			</div>
		</form>
	{:else}
		<div
			class="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-2"
		>
			<div class="flex min-h-0 flex-col gap-2">
				<div class="flex flex-wrap items-end gap-2">
					<div class="min-w-[10rem] flex-1">
						<DaisyUiLabel className="text-sm font-semibold">
							{m.support_filter_status()}
						</DaisyUiLabel>
						<DaisyUiSelect
							optionHeader={m.support_filter_all_statuses()}
							className="mt-1 w-full"
							bind:value={statusFilter}
							onChange={() => {
								currentPage = 1;
								void fetchList({ bustCache: true });
							}}
						>
							<option value={SupportTicketStatusEnum.OPEN}>
								{m.support_status_open()}
							</option>
							<option value={SupportTicketStatusEnum.IN_PROGRESS}>
								{m.support_status_in_progress()}
							</option>
							<option value={SupportTicketStatusEnum.RESOLVED}>
								{m.support_status_resolved()}
							</option>
							<option value={SupportTicketStatusEnum.CLOSED}>
								{m.support_status_closed()}
							</option>
						</DaisyUiSelect>
					</div>
				</div>
				<div class="min-h-0 flex-1 overflow-auto {TableEnum.HEIGHT}">
					{#if isLoadingList && !listResult}
						<div class="flex justify-center py-12">
							<DaisyUiLoading className="d-loading-lg" />
						</div>
					{:else}
						<MariTable
							{rows}
							columns={ticketColumns}
							isLoading={isLoadingList}
							bind:pageSize={pageSizeStr}
							bind:currentPage
							totalRowCount={totalRows}
							showRefreshButton={true}
							refreshTooltip={m.support_refresh_list()}
							emptyMessage={m.support_no_tickets()}
							useRemoteFilters={true}
							enableColumnFilters={false}
							on:refresh={() => fetchList({ bustCache: true })}
							on:pageSizeChange={() => {
								currentPage = 1;
								void fetchList();
							}}
							on:pageChange={() => void fetchList()}
							on:rowClick={onRowClick}
						/>
					{/if}
				</div>
			</div>
			<div
				class="flex min-h-[12rem] flex-col gap-3 overflow-auto rounded-lg border border-base-300 p-3 lg:min-h-0"
			>
				{#if isLoadingDetail}
					<div class="flex flex-1 items-center justify-center">
						<DaisyUiLoading className="d-loading-md" />
					</div>
				{:else if !detail}
					<p class="text-base-content/70">
						{m.support_select_ticket()}
					</p>
				{:else}
					<h3 class="text-md font-semibold">
						{m.support_ticket_id()}{detail.id}: {detail.subject}
					</h3>
					<dl class="grid gap-1 text-sm">
						<dt class="font-semibold opacity-80">
							{m.support_status()}
						</dt>
						<dd>{statusLabel(detail.status)}</dd>
						<dt class="font-semibold opacity-80">
							{m.support_priority()}
						</dt>
						<dd>{priorityLabel(detail.priority)}</dd>
						<dt class="font-semibold opacity-80">
							{m.created_at()}
						</dt>
						<dd>{formatDt(detail.createdAt)}</dd>
						<dt class="font-semibold opacity-80">
							{m.support_requester()}
						</dt>
						<dd>
							{detail.requester?.name ?? '—'} ({detail.requester
								?.email ?? detail.requesterId})
						</dd>
						{#if detail.hospital?.name}
							<dt class="font-semibold opacity-80">
								{m.support_hospital()}
							</dt>
							<dd>{detail.hospital.name}</dd>
						{/if}
						{#if detail.contextUrl}
							<dt class="font-semibold opacity-80">
								{m.support_context_url()}
							</dt>
							<dd class="text-xs break-all">{detail.contextUrl}</dd>
						{/if}
					</dl>
					<div class="flex flex-col gap-1">
						<DaisyUiLabel className="font-semibold"
							>{m.support_description()}</DaisyUiLabel
						>
						<p class="text-sm whitespace-pre-wrap">
							{detail.description}
						</p>
					</div>
					{#if detail.resolution && !isAdmin}
						<div class="flex flex-col gap-1">
							<DaisyUiLabel className="font-semibold"
								>{m.support_resolution()}</DaisyUiLabel
							>
							<p class="text-sm whitespace-pre-wrap">
								{detail.resolution}
							</p>
						</div>
					{/if}
					{#if isAdmin}
						<div class="divider my-1">IT</div>
						<div class="flex flex-col gap-2">
							<DaisyUiLabel
								forText="admin-status"
								className="font-semibold"
							>
								{m.support_status()}
							</DaisyUiLabel>
							<DaisyUiSelect
								className="w-full"
								bind:value={adminStatus}
							>
								<option value={SupportTicketStatusEnum.OPEN}>
									{m.support_status_open()}
								</option>
								<option value={SupportTicketStatusEnum.IN_PROGRESS}>
									{m.support_status_in_progress()}
								</option>
								<option value={SupportTicketStatusEnum.RESOLVED}>
									{m.support_status_resolved()}
								</option>
								<option value={SupportTicketStatusEnum.CLOSED}>
									{m.support_status_closed()}
								</option>
							</DaisyUiSelect>
							<DaisyUiLabel className="font-semibold">
								{m.support_assigned_to()}
							</DaisyUiLabel>
							<DaisyUiInputField
								id="admin-assign"
								className="w-full"
								bind:value={adminAssigneeId}
								inputPlaceholderText="user id"
							/>
							<DaisyUiLabel
								forText="admin-resolution"
								className="font-semibold"
							>
								{m.support_resolution()}
							</DaisyUiLabel>
							<DaisyUiTextarea
								id="admin-resolution"
								className="textarea-bordered min-h-24 w-full"
								bind:value={adminResolution}
							/>
							<DaisyUiButton
								className="d-btn-primary d-btn-sm w-fit"
								disabled={isSavingAdmin}
								onClick={() => void handleSaveAdmin()}
							>
								{m.support_save_changes()}
							</DaisyUiButton>
						</div>
					{/if}
				{/if}
			</div>
		</div>
		<div class="border-t border-base-200 px-4 py-2">
			<DaisyUiButton
				className="d-btn-ghost d-btn-sm"
				onClick={() => cancel()}
			>
				{m.cancel()}
			</DaisyUiButton>
		</div>
	{/if}
</div>
