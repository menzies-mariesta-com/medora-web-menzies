<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import StockAlertRecipientDialogContent, {
		type StockAlertRecipientDialogRow
	} from '$lib/component/own/local/private/medora/inventory-setup/stock-alerts/StockAlertRecipientDialogContent.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { SvelteSet } from 'svelte/reactivity';

	type RecipientDto = {
		storeId: number;
		storeName: string | null;
		staffId: string;
		firstName: string | null;
		middleName: string | null;
		lastName: string | null;
		code: string | null;
		notifyLowStock: boolean;
		notifyExpired: boolean;
		notifyExpiringSoon: boolean;
	};

	type StaffOpt = { id: string; name: string };
	type StoreOpt = { id: number; name: string };

	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	let bundleLoading = $state(false);
	let bundleError = $state<string | null>(null);
	let recipients = $state<RecipientDto[]>([]);

	let staffOptions = $state<StaffOpt[]>([]);
	let storeOptions = $state<StoreOpt[]>([]);
	let savingAll = $state(false);

	function apiBase() {
		return `/api/medora/hospital/${hospitalId}/home/inventory-setup/stock-alerts`;
	}

	function staffDisplay(r: RecipientDto): string {
		const parts = [r.firstName, r.middleName, r.lastName].filter(
			Boolean
		);
		const name = parts.join(' ').trim();
		const code = (r.code ?? '').trim();
		if (name && code) return `${code} — ${name}`;
		return name || code || r.staffId;
	}

	function storeDisplay(r: RecipientDto): string {
		const n = (r.storeName ?? '').trim();
		return n || `Store #${r.storeId}`;
	}

	async function loadBundle() {
		if (!hospitalId) return;
		bundleLoading = true;
		bundleError = null;
		try {
			const res = await fetch(apiBase(), {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Load failed (${res.status})`);
			}
			const b = (await res.json()) as { recipients: RecipientDto[] };
			recipients = [...b.recipients];
		} catch (e) {
			bundleError = e instanceof Error ? e.message : 'Load failed';
			recipients = [];
		} finally {
			bundleLoading = false;
		}
	}

	async function loadStaffPage(pageNum: number): Promise<StaffOpt[]> {
		const res = await fetch(
			`/api/medora/hospital/${hospitalId}/home/administration/staff/list?page=${pageNum}&pageSize=100`,
			{ credentials: 'include', cache: 'no-store' }
		);
		if (!res.ok) return [];
		const data = (await res.json()) as {
			data?: {
				id?: string;
				firstName?: string | null;
				lastName?: string | null;
				code?: string | null;
			}[];
		};
		const rows = data.data ?? [];
		return rows.map((r) => {
			const parts = [r.firstName, r.lastName].filter(Boolean);
			const name = parts.join(' ').trim();
			const code = (r.code ?? '').trim();
			const label =
				code && name
					? `${code} — ${name}`
					: name || code || String(r.id ?? '');
			return { id: String(r.id ?? ''), name: label };
		});
	}

	async function hydrateStaffOptions() {
		if (!hospitalId) return;
		const merged: StaffOpt[] = [];
		const seen = new SvelteSet<string>();
		for (let p = 1; p <= 5; p++) {
			const chunk = await loadStaffPage(p);
			for (const o of chunk) {
				if (!o.id || seen.has(o.id)) continue;
				seen.add(o.id);
				merged.push(o);
			}
			if (chunk.length < 100) break;
		}
		staffOptions = merged.sort((a, b) =>
			a.name.localeCompare(b.name)
		);
	}

	async function hydrateStores() {
		if (!hospitalId) return;
		const res = await fetch(
			`/api/medora/hospital/${hospitalId}/home/inventory-setup/stores?page=1&pageSize=500`,
			{ credentials: 'include', cache: 'no-store' }
		);
		if (!res.ok) {
			storeOptions = [];
			return;
		}
		const data = (await res.json()) as {
			data?: { id?: number; storeName?: string | null }[];
		};
		const rows = data.data ?? [];
		storeOptions = rows
			.map((s) => {
				const id = Number(s.id);
				const name = String(s.storeName ?? '').trim();
				return {
					id,
					name: name || `Store #${id}`
				};
			})
			.filter((s) => Number.isFinite(s.id) && s.id > 0)
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	async function persistRecipients(list: RecipientDto[]) {
		if (!hospitalId || savingAll) return;
		savingAll = true;
		try {
			const res = await fetch(apiBase(), {
				method: 'PUT',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					recipients: list.map((r) => ({
						storeId: r.storeId,
						staffId: r.staffId,
						notifyLowStock: r.notifyLowStock,
						notifyExpired: r.notifyExpired,
						notifyExpiringSoon: r.notifyExpiringSoon
					}))
				})
			});
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Save failed (${res.status})`);
			}
			const b = (await res.json()) as { recipients: RecipientDto[] };
			recipients = [...b.recipients];
			toastService.addToast(
				m.inv_stock_alert_recipients_saved(),
				StatusColorEnum.SUCCESS
			);
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Save failed',
				StatusColorEnum.ERROR
			);
			await loadBundle();
		} finally {
			savingAll = false;
		}
	}

	async function openRecipientCreateDialog() {
		if (!hospitalId || bundleLoading) return;
		await hydrateStaffOptions();
		await hydrateStores();

		const result =
			await dialogService.open<StockAlertRecipientDialogRow>({
				title: m.inv_stock_alert_recipient_dialog_add(),
				modalClassName: 'max-w-lg',
				component: StockAlertRecipientDialogContent,
				props: {
					mode: 'create',
					storeOptions,
					staffOptions,
					isPairTaken: (sid: number, stid: string) =>
						recipients.some(
							(r) => r.storeId === sid && r.staffId === stid
						)
				}
			});

		if (result.confirmed && result.data) {
			await persistRecipients([
				...recipients,
				result.data as RecipientDto
			]);
		}
	}

	async function openRecipientEditDialog(row: RecipientDto) {
		if (!hospitalId || bundleLoading) return;
		await hydrateStaffOptions();
		await hydrateStores();

		const result =
			await dialogService.open<StockAlertRecipientDialogRow>({
				title: m.inv_stock_alert_recipient_dialog_edit(),
				modalClassName: 'max-w-lg',
				component: StockAlertRecipientDialogContent,
				props: {
					mode: 'edit',
					storeOptions,
					staffOptions,
					initialRow: row,
					isPairTaken: (sid: number, stid: string) =>
						recipients.some(
							(r) =>
								r.storeId === sid &&
								r.staffId === stid &&
								(r.storeId !== row.storeId ||
									r.staffId !== row.staffId)
						)
				}
			});

		if (result.confirmed && result.data) {
			const next = result.data as RecipientDto;
			await persistRecipients(
				recipients.map((r) =>
					r.storeId === row.storeId && r.staffId === row.staffId
						? next
						: r
				)
			);
		}
	}

	async function removeRecipient(storeId: number, staffId: string) {
		await persistRecipients(
			recipients.filter(
				(r) => !(r.storeId === storeId && r.staffId === staffId)
			)
		);
	}

	const recipientColumns: MenziesTableColumn<RecipientDto>[] = [
		{
			id: 'store',
			header: m.inv_stock_alert_col_store(),
			field: 'storeName',
			widthClass: 'w-56 min-w-[12rem]',
			filterType: 'text',
			format: (_v, row) => storeDisplay(row)
		},
		{
			id: 'staff',
			header: m.inv_stock_alert_col_staff(),
			field: 'staffId',
			widthClass: 'min-w-[14rem]',
			filterType: 'text',
			format: (_v, row) => staffDisplay(row)
		},
		{
			id: 'low',
			header: m.inv_stock_alert_col_low(),
			field: 'notifyLowStock',
			filterable: false,
			format: (_v, row) => (row.notifyLowStock ? '✓' : '—')
		},
		{
			id: 'ex',
			header: m.inv_stock_alert_col_expired(),
			field: 'notifyExpired',
			filterable: false,
			format: (_v, row) => (row.notifyExpired ? '✓' : '—')
		},
		{
			id: 'soon',
			header: m.inv_stock_alert_col_soon(),
			field: 'notifyExpiringSoon',
			filterable: false,
			format: (_v, row) => (row.notifyExpiringSoon ? '✓' : '—')
		}
	];

	$effect(() => {
		void hospitalId;
		void loadBundle();
		void hydrateStaffOptions();
		void hydrateStores();
	});
</script>

<div class="space-y-6">
	<div class="space-y-1">
		<h1 class="text-lg font-semibold">{m.inv_stock_alert_title()}</h1>
		<p class="text-sm opacity-70">{m.inv_stock_alert_subtitle()}</p>
	</div>

	{#if bundleError}
		<div class="alert alert-error">
			<span>{bundleError}</span>
		</div>
	{/if}

	<WashCard>
		<WashCardBody className="space-y-4">
			<div
				class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between"
			>
				<div class="max-w-xl space-y-1">
					<h2 class="text-base font-semibold">
						{m.inv_stock_alert_section_recipients()}
					</h2>
					<p class="text-xs opacity-70">
						{m.inv_stock_alert_recipients_hint()}
					</p>
				</div>
				<WashButton
					type="button"
					className="btn-primary btn-sm shrink-0"
					disabled={bundleLoading || savingAll}
					onClick={() => void openRecipientCreateDialog()}
				>
					{m.inv_stock_alert_add()}
				</WashButton>
			</div>

			<div class={TableEnum.HEIGHT}>
				<MenziesTable
					rows={recipients}
					columns={recipientColumns}
					isLoading={bundleLoading}
					enableColumnFilters={false}
					showRefreshButton={true}
					refreshTooltip={m.refresh_data()}
					showRowActions={true}
					actionsHeader={m.actions()}
					actionsVariant="none"
					emptyMessage={m.inv_stock_alert_no_recipients()}
					on:refresh={() => loadBundle()}
				>
					{#snippet rowActions(row, rowIndex)}
						<td class="text-right" aria-rowindex={rowIndex + 2}>
							<div class="flex justify-end gap-1">
								<WashTooltip
									tooltipText={m.inv_line_items_tooltip_edit()}
									className="tooltip-ghost"
								>
									<WashButton
										type="button"
										className="btn-sm btn-ghost btn-square"
										disabled={savingAll}
										onClick={() => void openRecipientEditDialog(row)}
									>
										<LucidePencil className="size-5" />
									</WashButton>
								</WashTooltip>
								<WashTooltip
									tooltipText={m.inv_line_items_tooltip_delete()}
									className="tooltip-error"
								>
									<WashButton
										type="button"
										className="btn-sm btn-ghost btn-square text-error"
										disabled={savingAll}
										onClick={() =>
											void removeRecipient(row.storeId, row.staffId)}
									>
										<LucideTrash2 className="size-5" />
									</WashButton>
								</WashTooltip>
							</div>
						</td>
					{/snippet}
				</MenziesTable>
			</div>
		</WashCardBody>
	</WashCard>
</div>
