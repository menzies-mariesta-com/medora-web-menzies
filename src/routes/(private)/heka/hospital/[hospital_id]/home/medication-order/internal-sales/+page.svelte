<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import LucideListOrdered from '$lib/component/own/library/lucide/LucideListOrdered.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { MedicationOrderMastersResponse } from '$lib/model/type/heka/medication-order.type';
	import type { MedicationOrderLineInput } from '$lib/model/type/heka/medication-order.type';
	import { untrack } from 'svelte';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' && page.params.hospital_id
			? page.params.hospital_id
			: ''
	);

	const visitIdNum = $derived(
		VisitState.visitId ? Number(VisitState.visitId) : 0
	);

	function apiRoot() {
		return `/api/heka/hospital/${hospitalId}/home/medication-order/internal-sales`;
	}

	function toDateTimeLocalValue(d: Date): string {
		const y = d.getFullYear();
		const mo = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		const h = String(d.getHours()).padStart(2, '0');
		const min = String(d.getMinutes()).padStart(2, '0');
		return `${y}-${mo}-${day}T${h}:${min}`;
	}

	function parseDateTimeLocalToIso(s: string): string {
		return new Date(s).toISOString();
	}

	const minStart = $derived.by(() => toDateTimeLocalValue(new Date()));

	let masters = $state<MedicationOrderMastersResponse | null>(null);

	let storeSearch = $state('');
	let storeOptions = $state<{ id: number; storeName: string | null }[]>([]);
	let storeId = $state(0);
	let storeLabel = $state('');

	let pharmacyGenerics = $state<{ id: number; name: string; code: string | null }[]>([]);
	let pharmacyGenericId = $state('');

	let itemQuery = $state('');
	let itemOptions = $state<
		{ id: number; itemName: string | null; displayPrice: string | null }[]
	>([]);
	let selectedItem = $state<{
		id: number;
		itemName: string | null;
		displayPrice: string | null;
	} | null>(null);

	let dose = $state('1');
	let doseUnitIdStr = $state('');
	let frequencyIdStr = $state('');
	let freqFilter = $state('');

	let durationValue = $state('1');
	let durationUnitIdStr = $state('');

	let formId = $state('');
	let routeId = $state('');
	let orderTypeId = $state('');
	let foodRelationId = $state('');

	let startAtLocal = $state('');

	let testDose = $state('');
	let substituteNotAllowed = $state(false);

	let isBusy = $state(false);
	let editingBatchId = $state(0);

	type DraftLine = MedicationOrderLineInput & {
		_key: string;
		_itemName: string;
		_freqLabel: string;
	};

	let draftLines = $state<DraftLine[]>([]);

	/** — History */
	let historyOpen = $state(false);
	let historyRows = $state<
		{ id: number; batchNo: string; storeId: number; createdAt?: string | null }[]
	>([]);
	let storeNameById = $state<Record<number, string>>({});

	const filteredFreqs = $derived.by(() => {
		const f = freqFilter.trim().toLowerCase();
		const list = masters?.freqs ?? [];
		if (!f) return list;
		return list.filter(
			(x) =>
				(x.label ?? '').toLowerCase().includes(f) ||
				(x.summaryText ?? '').toLowerCase().includes(f)
		);
	});

	async function loadMasters() {
		if (!hospitalId) return;
		const res = await fetch(`${apiRoot()}?mode=masters`, {
			credentials: 'include'
		});
		if (!res.ok) return;
		masters = (await res.json()) as MedicationOrderMastersResponse;
		if (masters.durUnits[0] && !durationUnitIdStr) {
			durationUnitIdStr = String(masters.durUnits[0].id);
		}
		if (masters.doseUnits[0] && !doseUnitIdStr) {
			doseUnitIdStr = String(masters.doseUnits[0].id);
		}
		if (masters.freqs[0] && !frequencyIdStr) {
			frequencyIdStr = String(masters.freqs[0].id);
		}
	}

	async function loadPharmacyGenerics() {
		if (!hospitalId) return;
		const url = new URL(
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/pharmacy-generic`,
			window.location.origin
		);
		url.searchParams.set('page', '1');
		url.searchParams.set('pageSize', '500');
		const res = await fetch(url, { credentials: 'include' });
		if (!res.ok) return;
		const pack = (await res.json()) as {
			data: { id: number; name: string; code: string | null }[];
		};
		pharmacyGenerics = pack.data ?? [];
	}

	let storeSearchT: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		if (!hospitalId) return;
		const q = storeSearch;
		if (storeSearchT) clearTimeout(storeSearchT);
		storeSearchT = setTimeout(() => {
			untrack(async () => {
				const u = new URL(apiRoot(), window.location.origin);
				u.searchParams.set('mode', 'stores.search');
				if (q.trim()) u.searchParams.set('name', q.trim());
				const res = await fetch(u, { credentials: 'include' });
				if (!res.ok) return;
				storeOptions = (await res.json()) as typeof storeOptions;
			});
		}, 300);
		return () => {
			if (storeSearchT) clearTimeout(storeSearchT);
		};
	});

	let itemSearchT: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		if (!hospitalId || !storeId) {
			itemOptions = [];
			return;
		}
		const q = itemQuery;
		const gen = pharmacyGenericId;
		if (itemSearchT) clearTimeout(itemSearchT);
		itemSearchT = setTimeout(() => {
			untrack(async () => {
				const u = new URL(apiRoot(), window.location.origin);
				u.searchParams.set('mode', 'items.search');
				u.searchParams.set('storeId', String(storeId));
				if (q.trim()) u.searchParams.set('search', q.trim());
				if (gen) {
					u.searchParams.set('pharmacyGenericId', gen);
				}
				const res = await fetch(u, { credentials: 'include' });
				if (!res.ok) return;
				itemOptions = (await res.json()) as typeof itemOptions;
			});
		}, 300);
		return () => {
			if (itemSearchT) clearTimeout(itemSearchT);
		};
	});

	$effect(() => {
		if (VisitState.visitId && hospitalId) {
			untrack(() => {
				if (!startAtLocal) {
					startAtLocal = toDateTimeLocalValue(new Date());
				}
			});
		}
	});

	lifeCycleUtil.onMount(() => {
		if (hospitalId) {
			loadMasters();
			loadPharmacyGenerics();
			fetch(`${apiRoot()}?mode=stores.search`, { credentials: 'include' })
				.then((r) => (r.ok ? r.json() : null))
				.then((d) => {
					if (d) storeOptions = d as typeof storeOptions;
				})
				.catch(() => {});
		}
	});

	function selectStore(s: { id: number; storeName: string | null }) {
		storeId = s.id;
		storeLabel = s.storeName ?? `#${s.id}`;
		selectedItem = null;
		itemQuery = '';
	}

	function resetEditing() {
		editingBatchId = 0;
		draftLines = [];
	}

	function addDraft() {
		if (!visitIdNum) {
			toastService.addToast(
				m.med_order_int_no_visit(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!storeId) {
			toastService.addToast(
				m.med_order_int_no_store(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!selectedItem) {
			toastService.addToast(
				m.med_order_int_no_item(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const doseUnitId = Number(doseUnitIdStr);
		const frequencyId = Number(frequencyIdStr);
		const durationUnitId = Number(durationUnitIdStr);
		if (
			!doseUnitIdStr ||
			!frequencyIdStr ||
			!durationUnitIdStr ||
			!Number.isFinite(doseUnitId) ||
			doseUnitId <= 0 ||
			!Number.isFinite(frequencyId) ||
			frequencyId <= 0 ||
			!Number.isFinite(durationUnitId) ||
			durationUnitId <= 0
		) {
			toastService.addToast(
				m.med_order_int_missing_master(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const st = new Date(parseDateTimeLocalToIso(startAtLocal));
		if (st.getTime() < Date.now() - 60_000) {
			toastService.addToast(
				m.med_order_int_past_start(),
				StatusColorEnum.ERROR
			);
			return;
		}

		const fRow = (masters?.freqs ?? []).find(
			(x) => x.id === frequencyId
		);
		const line: MedicationOrderLineInput = {
			itemMasterId: selectedItem.id,
			dose: dose.trim() || '1',
			doseUnitId,
			frequencyId,
			durationValue: durationValue.trim() || '1',
			durationUnitId,
			formId: formId ? Number(formId) : null,
			routeId: routeId ? Number(routeId) : null,
			orderTypeId: orderTypeId ? Number(orderTypeId) : null,
			foodRelationId: foodRelationId ? Number(foodRelationId) : null,
			startAt: parseDateTimeLocalToIso(startAtLocal),
			testDose: testDose.trim() || null,
			substituteNotAllowed
		};

		draftLines = [
			...draftLines,
			{
				...line,
				_key: `d-${Date.now()}-${Math.random()}`,
				_itemName: selectedItem.itemName ?? `Item #${selectedItem.id}`,
				_freqLabel: fRow?.label ?? '—'
			}
		];
	}

	function removeDraft(k: string) {
		draftLines = draftLines.filter((d) => d._key !== k);
	}

	async function persistBatch() {
		if (!visitIdNum) {
			toastService.addToast(
				m.med_order_int_no_visit(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!storeId) {
			toastService.addToast(
				m.med_order_int_no_store(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (draftLines.length === 0) {
			toastService.addToast(
				m.med_order_int_draft_empty(),
				StatusColorEnum.ERROR
			);
			return;
		}
		isBusy = true;
		const lines = draftLines.map(
			({ _key, _itemName, _freqLabel, ...rest }) => rest
		);
		try {
			if (editingBatchId) {
				const res = await fetch(apiRoot(), {
					method: 'POST',
					credentials: 'include',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						mode: 'batch.update',
						batchId: editingBatchId,
						lines
					})
				});
				if (!res.ok) throw new Error(await res.text());
				toastService.addToast(m.med_order_int_updated(), StatusColorEnum.SUCCESS);
			} else {
				const res = await fetch(apiRoot(), {
					method: 'POST',
					credentials: 'include',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						mode: 'batch.save',
						visitId: visitIdNum,
						storeId,
						lines
					})
				});
				if (!res.ok) throw new Error(await res.text());
				void (await res.json());
				toastService.addToast(m.med_order_int_saved(), StatusColorEnum.SUCCESS);
			}
			resetEditing();
		} catch (e) {
			toastService.addErrorToast(
				editingBatchId
					? m.med_order_int_update_failed()
					: m.med_order_int_save_failed(),
				e
			);
		} finally {
			isBusy = false;
		}
	}

	async function openHistory() {
		if (!visitIdNum) {
			toastService.addToast(
				m.med_order_int_no_visit(),
				StatusColorEnum.ERROR
			);
			return;
		}
		historyOpen = true;
		const u = new URL(apiRoot(), window.location.origin);
		u.searchParams.set('mode', 'batch.list');
		u.searchParams.set('visitId', String(visitIdNum));
		const res = await fetch(u, { credentials: 'include' });
		if (!res.ok) {
			historyRows = [];
			return;
		}
		historyRows = (await res.json()) as typeof historyRows;
		const r = await fetch(
			`${apiRoot()}?mode=stores.search`,
			{ credentials: 'include' }
		);
		if (r.ok) {
			const stores = (await r.json()) as {
				id: number;
				storeName: string | null;
			}[];
			const mp: Record<number, string> = {};
			for (const s of stores) mp[s.id] = s.storeName ?? `#${s.id}`;
			storeNameById = mp;
		}
	}

	function lineToDraft(
		ln: Record<string, unknown>,
		itemName: string
	): DraftLine {
		const fRow = (masters?.freqs ?? []).find(
			(x) => x.id === Number(ln.frequencyId)
		);
		return {
			_key: `e-${String(ln.id)}`,
			_itemName: itemName,
			_freqLabel: fRow?.label ?? '—',
			itemMasterId: Number(ln.itemMasterId),
			dose: String(ln.dose ?? '1'),
			doseUnitId: Number(ln.doseUnitId),
			frequencyId: Number(ln.frequencyId),
			durationValue: String(ln.durationValue ?? '1'),
			durationUnitId: Number(ln.durationUnitId),
			formId: ln.formId != null ? Number(ln.formId) : null,
			routeId: ln.routeId != null ? Number(ln.routeId) : null,
			orderTypeId: ln.orderTypeId != null ? Number(ln.orderTypeId) : null,
			foodRelationId:
				ln.foodRelationId != null ? Number(ln.foodRelationId) : null,
			startAt: String(ln.startAt),
			testDose: ln.testDose != null ? String(ln.testDose) : null,
			substituteNotAllowed: Boolean(ln.substituteNotAllowed)
		};
	}

	async function loadBatchForEdit(id: number) {
		const u = new URL(apiRoot(), window.location.origin);
		u.searchParams.set('mode', 'batch.get');
		u.searchParams.set('batchId', String(id));
		const res = await fetch(u, { credentials: 'include' });
		if (!res.ok) {
			toastService.addToast(m.med_order_int_load_failed(), StatusColorEnum.ERROR);
			return;
		}
		const pack = (await res.json()) as {
			batch: { id: number; storeId: number; batchNo: string };
			lines: Record<string, unknown>[];
		};
		if (!masters) await loadMasters();
		historyOpen = false;
		editingBatchId = id;
		storeId = pack.batch.storeId;
		storeLabel =
			storeNameById[pack.batch.storeId] ?? `#${pack.batch.storeId}`;
		draftLines = pack.lines.map((ln) =>
			lineToDraft(
				ln,
				`${m.med_order_int_item()} #${String(ln.itemMasterId)}`
			)
		);
	}

	async function deleteCurrentBatch() {
		if (!editingBatchId) return;
		const c = await dialogService.open({
			title: m.med_order_int_delete_title(),
			message: m.med_order_int_delete_confirm(),
			variant: DialogVariantEnum.CONFIRM
		});
		if (!c.confirmed) return;
		isBusy = true;
		try {
			const res = await fetch(apiRoot(), {
				method: 'POST',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode: 'batch.delete',
					batchId: editingBatchId
				})
			});
			if (!res.ok) throw new Error(await res.text());
			toastService.addToast(m.med_order_int_deleted(), StatusColorEnum.SUCCESS);
			historyOpen = false;
			resetEditing();
		} catch (e) {
			toastService.addErrorToast(m.med_order_int_delete_failed(), e);
		} finally {
			isBusy = false;
		}
	}
</script>

<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
	<h1 class="text-lg font-semibold">
		{m.medication_order_internal_sales_title()}
	</h1>
	<div class="flex flex-wrap items-center gap-2">
		{#if editingBatchId}
			<span class="text-sm text-warning"
				>{m.med_order_int_editing()}</span
			>
			<DaisyUiButton
				className="d-btn-ghost d-btn-sm"
				onClick={resetEditing}
			>
				{m.med_order_int_cancel_edit()}
			</DaisyUiButton>
			<DaisyUiButton
				className="d-btn-error d-btn-ghost d-btn-sm"
				onClick={deleteCurrentBatch}
				disabled={isBusy}
			>
				<LucideTrash2 className="size-4" />
				{m.delete_data()}
			</DaisyUiButton>
		{/if}
		<DaisyUiButton
			className="d-btn d-btn-ghost d-btn-sm"
			onClick={openHistory}
			disabled={!visitIdNum}
		>
			<LucideListOrdered className="size-4" />
			{m.med_order_int_history()}
		</DaisyUiButton>
	</div>
</div>

{#if !visitIdNum}
	<DaisyUiCard>
		<DaisyUiCardBody>
			<p class="text-sm text-base-content/70">
				{m.no_visit_selected()}
			</p>
		</DaisyUiCardBody>
	</DaisyUiCard>
{:else}
	<DaisyUiCard>
		<DaisyUiCardBody className="p-4 sm:p-6">
			<div
				class="mx-auto flex w-full max-w-5xl flex-col gap-5 sm:gap-6"
			>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
					<div class="flex min-w-0 flex-col gap-1.5">
						<span class="text-sm font-medium">{m.med_order_int_store()}</span>
						<div class="flex min-w-0 flex-col gap-1">
							<DaisyUiInputField
								nameText="med-store-s"
								bind:value={storeSearch}
								inputPlaceholderText={m.med_order_int_store_search()}
								minLength={0}
							/>
							{#if storeOptions.length}
								<div
									class="max-h-40 overflow-y-auto rounded border border-base-300"
								>
									{#each storeOptions as s (s.id)}
										<button
											type="button"
											class="d-btn d-btn-ghost w-full justify-start d-btn-sm rounded-none"
											onclick={() => selectStore(s)}
										>
											{s.storeName ?? `#${s.id}`}
										</button>
									{/each}
								</div>
							{/if}
							{#if storeId}
								<p class="text-xs opacity-80">
									{m.med_order_int_store_selected()}: {storeLabel}
								</p>
							{/if}
						</div>
					</div>
					<div class="flex min-w-0 flex-col gap-1.5">
						<span class="text-sm font-medium"
							>{m.med_order_int_pharmacy_generic()}</span
						>
						<DaisyUiSelect
							className="d-select d-select-bordered d-select-sm w-full"
							bind:value={pharmacyGenericId}
						>
							<option value="">{m.med_order_int_all_generics()}</option>
							{#each pharmacyGenerics as g (g.id)}
								<option value={String(g.id)}>{g.name}</option>
							{/each}
						</DaisyUiSelect>
					</div>
				</div>

				<div class="flex min-w-0 flex-col gap-1.5">
					<span class="text-sm font-medium">{m.med_order_int_item()}</span>
					<DaisyUiInputField
						nameText="med-item-s"
						bind:value={itemQuery}
						inputPlaceholderText={m.med_order_int_item_search()}
						minLength={0}
						disabled={!storeId}
					/>
					{#if itemOptions.length}
						<div
							class="max-h-40 overflow-y-auto rounded border border-base-300"
						>
							{#each itemOptions as it (it.id)}
								<button
									type="button"
									class="d-btn d-btn-ghost w-full justify-start d-btn-sm rounded-none"
									onclick={() => (selectedItem = it)}
								>
									{it.itemName}
									{#if it.displayPrice != null}
										— {it.displayPrice}
									{/if}
								</button>
							{/each}
						</div>
					{/if}
					{#if selectedItem}
						<p class="text-xs opacity-80">
							{selectedItem.itemName}
							{#if selectedItem.displayPrice != null}
								· {m.med_order_int_price()}: {selectedItem.displayPrice}
							{/if}
						</p>
					{/if}
				</div>

				<div
					class="grid grid-cols-1 gap-4 md:grid-cols-6 md:items-start"
				>
					<div class="flex min-w-0 flex-col gap-1.5 md:col-span-1">
						<span class="text-sm font-medium"
							>{m.med_order_int_dose()}</span
						>
						<DaisyUiInputField
							nameText="dose"
							bind:value={dose}
							inputType="text"
							className="w-full max-w-full"
							minLength={0}
						/>
					</div>
					<div class="flex min-w-0 flex-col gap-1.5 md:col-span-2">
						<span class="text-sm font-medium"
							>{m.med_order_int_dose_unit()}</span
						>
						<DaisyUiSelect
							className="d-select d-select-bordered d-select-sm w-full min-w-0"
							bind:value={doseUnitIdStr}
						>
							{#each masters?.doseUnits ?? [] as u (u.id)}
								<option value={String(u.id)}>{u.name}</option>
							{/each}
						</DaisyUiSelect>
					</div>
					<div class="flex min-w-0 flex-col gap-1.5 md:col-span-3">
						<span class="text-sm font-medium"
							>{m.med_order_int_frequency()}</span
						>
						<div class="flex min-w-0 flex-col gap-1.5">
							<DaisyUiInputField
								nameText="freq-filter"
								bind:value={freqFilter}
								inputPlaceholderText={m.med_order_int_frequency_filter()}
								minLength={0}
							/>
							<DaisyUiSelect
								className="d-select d-select-bordered d-select-sm w-full min-w-0"
								bind:value={frequencyIdStr}
							>
								{#each filteredFreqs as f (f.id)}
									<option value={String(f.id)}>
										{f.label}
										{#if f.summaryText}
											· {f.summaryText}
										{/if}
									</option>
								{/each}
							</DaisyUiSelect>
						</div>
					</div>
				</div>

				<div
					class="grid grid-cols-1 gap-4 md:grid-cols-6 md:items-start"
				>
					<div class="flex min-w-0 flex-col gap-1.5 md:col-span-2">
						<span class="text-sm font-medium"
							>{m.med_order_int_duration()}</span
						>
						<div class="flex min-w-0 items-center gap-2">
							<DaisyUiInputField
								nameText="dv"
								bind:value={durationValue}
								inputType="text"
								className="w-20 shrink-0"
								minLength={0}
							/>
							<DaisyUiSelect
								className="d-select d-select-bordered d-select-sm min-w-0 flex-1"
								bind:value={durationUnitIdStr}
							>
								{#each masters?.durUnits ?? [] as u (u.id)}
									<option value={String(u.id)}>
										{u.name} ({u.code})
									</option>
								{/each}
							</DaisyUiSelect>
						</div>
					</div>
					<div class="flex min-w-0 flex-col gap-1.5 md:col-span-2">
						<span class="text-sm font-medium"
							>{m.med_order_int_form()}</span
						>
						<DaisyUiSelect
							className="d-select d-select-bordered d-select-sm w-full min-w-0"
							bind:value={formId}
						>
							<option value="">{m.med_order_int_not_applicable()}</option>
							{#each masters?.forms ?? [] as u (u.id)}
								<option value={String(u.id)}>{u.name}</option>
							{/each}
						</DaisyUiSelect>
					</div>
					<div class="flex min-w-0 flex-col gap-1.5 md:col-span-2">
						<span class="text-sm font-medium"
							>{m.med_order_int_route()}</span
						>
						<DaisyUiSelect
							className="d-select d-select-bordered d-select-sm w-full min-w-0"
							bind:value={routeId}
						>
							<option value="">{m.med_order_int_not_applicable()}</option>
							{#each masters?.routes ?? [] as u (u.id)}
								<option value={String(u.id)}>{u.name}</option>
							{/each}
						</DaisyUiSelect>
					</div>
				</div>

				<div
					class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start"
				>
					<div class="flex min-w-0 flex-col gap-1.5">
						<span class="text-sm font-medium"
							>{m.med_order_int_order_type()}</span
						>
						<DaisyUiSelect
							className="d-select d-select-bordered d-select-sm w-full min-w-0"
							bind:value={orderTypeId}
						>
							<option value="">{m.med_order_int_not_applicable()}</option>
							{#each masters?.orderTypes ?? [] as u (u.id)}
								<option value={String(u.id)}>{u.name}</option>
							{/each}
						</DaisyUiSelect>
					</div>
					<div class="flex min-w-0 flex-col gap-1.5">
						<span class="text-sm font-medium"
							>{m.med_order_int_food_relation()}</span
						>
						<DaisyUiSelect
							className="d-select d-select-bordered d-select-sm w-full min-w-0"
							bind:value={foodRelationId}
						>
							<option value="">{m.med_order_int_not_applicable()}</option>
							{#each masters?.foodRels ?? [] as u (u.id)}
								<option value={String(u.id)}>{u.name}</option>
							{/each}
						</DaisyUiSelect>
					</div>
				</div>

				<div
					class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start"
				>
					<div class="flex min-w-0 flex-col gap-1.5">
						<span class="text-sm font-medium"
							>{m.med_order_int_start()}</span
						>
						<input
							type="datetime-local"
							class="d-input d-input-bordered w-full min-w-0"
							bind:value={startAtLocal}
							min={minStart}
						/>
					</div>
					<div class="flex min-w-0 flex-col gap-1.5">
						<span class="text-sm font-medium"
							>{m.med_order_int_test_dose()}</span
						>
						<DaisyUiInputField
							nameText="td"
							bind:value={testDose}
							minLength={0}
						/>
					</div>
				</div>

				<div class="flex min-w-0 flex-col gap-2">
					<span class="text-sm font-medium"
						>{m.med_order_int_substitue()}</span
					>
					<div class="flex flex-wrap gap-4 sm:gap-6">
						<label class="flex cursor-pointer items-center gap-2 text-sm">
							<input
								type="radio"
								checked={!substituteNotAllowed}
								class="d-radio d-radio-sm"
								onchange={() => (substituteNotAllowed = false)}
							/>
							{m.med_order_int_substitue_no()}
						</label>
						<label class="flex cursor-pointer items-center gap-2 text-sm">
							<input
								type="radio"
								checked={substituteNotAllowed}
								class="d-radio d-radio-sm"
								onchange={() => (substituteNotAllowed = true)}
							/>
							{m.med_order_int_substitue_yes()}
						</label>
					</div>
				</div>

				<div
					class="flex flex-wrap gap-2 border-t border-base-300 pt-4 sm:pt-5"
				>
					<DaisyUiButton
						className="d-btn d-btn-primary d-btn-sm"
						onClick={addDraft}
						disabled={!storeId}
					>
						<LucidePlus className="size-4" />
						{m.med_order_int_add_to_list()}
					</DaisyUiButton>
					<DaisyUiButton
						className="d-btn d-btn-secondary d-btn-sm"
						onClick={persistBatch}
						disabled={!storeId || draftLines.length === 0 || isBusy}
						loading={isBusy}
					>
						<LucideCircleCheck className="size-4" />
						{editingBatchId
							? m.med_order_int_update_order()
							: m.med_order_int_save_order()}
					</DaisyUiButton>
				</div>
			</div>
		</DaisyUiCardBody>
	</DaisyUiCard>

	<DaisyUiCard>
		<DaisyUiCardBody className="gap-2">
			<h2 class="text-base font-semibold">{m.med_order_int_draft_title()}</h2>
			{#if draftLines.length === 0}
				<p class="text-sm text-base-content/60">
					{m.medication_order_internal_sales_empty()}
				</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="table-zebra table w-full text-sm">
						<thead>
							<tr>
								<th>{m.med_order_int_item()}</th>
								<th>{m.med_order_int_dose()}</th>
								<th>{m.med_order_int_frequency()}</th>
								<th>{m.med_order_int_start()}</th>
								<th class="w-20">{m.actions()}</th>
							</tr>
						</thead>
						<tbody>
							{#each draftLines as ln (ln._key)}
								<tr>
									<td>{ln._itemName}</td>
									<td>{ln.dose}</td>
									<td>{ln._freqLabel}</td>
									<td
										>{toDateTimeLocalValue(
											new Date(ln.startAt)
										)}</td
									>
									<td>
										<DaisyUiButton
											className="d-btn-ghost d-btn-xs"
											onClick={() => removeDraft(ln._key)}
										>
											<LucideTrash2
												className="text-error size-4"
											/>
										</DaisyUiButton>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</DaisyUiCardBody>
	</DaisyUiCard>
{/if}

{#if historyOpen}
	<dialog class="d-modal d-modal-open" open>
		<div class="d-modal-box max-w-3xl max-h-[90vh] overflow-y-auto">
			<h3 class="d-modal-title text-lg font-semibold">
				{m.med_order_int_history()}
			</h3>
			<div class="py-2">
				<div class="overflow-x-auto">
					<table class="table-zebra table w-full text-sm">
						<thead>
							<tr>
								<th>{m.med_order_int_batch()}</th>
								<th>{m.med_order_int_store()}</th>
								<th>{m.created_at()}</th>
								<th>{m.actions()}</th>
							</tr>
						</thead>
						<tbody>
							{#each historyRows as b (b.id)}
								<tr>
									<td>{b.batchNo}</td>
									<td>{storeNameById[b.storeId] ?? String(b.storeId)}</td>
									<td
										>{b.createdAt
											? toDateTimeLocalValue(
													new Date(b.createdAt)
												)
											: '—'}</td
									>
									<td>
										<DaisyUiButton
											className="d-btn-ghost d-btn-xs"
											onClick={() => loadBatchForEdit(b.id)}
										>
											{m.edit_data()}
										</DaisyUiButton>
									</td>
								</tr>
							{:else}
								<tr
									><td colspan="4" class="text-center"
										>{m.med_order_int_no_batches()}</td
									></tr
								>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
			<div class="d-modal-action">
				<button
					type="button"
					class="d-btn"
					onclick={() => (historyOpen = false)}>{m.ok()}</button
				>
			</div>
		</div>
		<button
			type="button"
			class="d-modal-backdrop"
			aria-label={m.med_order_dialog_close_aria()}
			onclick={() => (historyOpen = false)}
		></button>
	</dialog>
{/if}
