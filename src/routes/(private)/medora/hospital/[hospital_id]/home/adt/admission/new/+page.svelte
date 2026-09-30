<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashCardBodyAction from '$lib/component/wash/card/body/action/WashCardBodyAction.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import {
		medoraHospitalPageUrl,
		WebRoutesEnum
	} from '$lib/model/enum/routes.enum';
	import type {
		AdtSourceOpdVisitRow,
		BedRow,
		IpdAdmissionOrderRow,
		WardRow
	} from '$lib/model/type/medora/ipd/ipd.type';
	import type { PatientWithRelations } from '$lib/model/type/medora/patient.type';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const routerUtil = new RouterUtil();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const orderIdFromUrl = $derived(
		(() => {
			const raw = page.url.searchParams.get('orderId');
			const n = raw ? Number(raw) : NaN;
			return Number.isFinite(n) && n > 0 ? n : null;
		})()
	);
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/adt/admission`
			: ''
	);
	const orderApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/adt/admission-order`
			: ''
	);
	const wardApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/ward-master?active=1`
			: ''
	);
	const bedApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/bed-master`
			: ''
	);
	const patientApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/registration/patient/list`
			: ''
	);

	let wards = $state<WardRow[]>([]);
	let beds = $state<BedRow[]>([]);
	let sourceOpdVisits = $state<AdtSourceOpdVisitRow[]>([]);
	let patientId = $state('');
	let sourceOpdVisitId = $state('');
	let wardId = $state('');
	let bedId = $state('');
	let reasonNotes = $state('');
	let admissionOrderId = $state<number | null>(null);
	let orderingDoctorId = $state<string | null>(null);
	let orderLocked = $state(false);
	let isSubmitting = $state(false);
	let loadingSource = $state(false);
	let loadingOrder = $state(false);

	const selectedWard = $derived(
		wards.find((w) => String(w.id) === wardId) ?? null
	);
	const branchId = $derived(selectedWard?.branchId ?? '');

	const selectedSource = $derived(
		sourceOpdVisits.find(
			(v) => String(v.visitId) === sourceOpdVisitId
		) ?? null
	);

	const wardOptions = $derived(
		wards.map((w) => ({
			value: String(w.id),
			label: w.code ? `${w.name} (${w.code})` : w.name
		}))
	);
	const bedOptions = $derived(
		beds.map((b) => ({
			value: String(b.id),
			label: b.code ? `${b.name} (${b.code})` : b.name
		}))
	);
	const sourceOpdOptions = $derived(
		sourceOpdVisits.map((v) => ({
			value: String(v.visitId),
			label: `${v.visitNo ?? `#${v.visitId}`}${
				v.hasOpenOpBill ? ' (open OP bill)' : ''
			}`
		}))
	);

	async function searchPatients(
		query: string
	): Promise<{ label: string; value: string }[]> {
		if (!patientApi) return [];
		const qs = new URLSearchParams({
			page: '1',
			pageSize: String(AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT)
		});
		if (query.trim()) qs.set('search', query.trim());
		const res = await fetch(`${patientApi}?${qs}`, {
			credentials: 'include'
		});
		if (!res.ok) return [];
		const result =
			(await res.json()) as PaginatedResult<PatientWithRelations>;
		return (result.data ?? []).map((p) => ({
			label: StringUtil.patientOptionDisplayName(p),
			value: String(p.id)
		}));
	}

	async function getPatientLabelForValue(id: string): Promise<string> {
		if (!patientApi || !id) return '';
		const res = await fetch(
			`${patientApi}?id=${encodeURIComponent(id)}`,
			{ credentials: 'include' }
		);
		if (!res.ok) return '';
		const p = (await res.json()) as PatientWithRelations | null;
		if (!p) return '';
		return StringUtil.patientOptionDisplayName(p);
	}

	async function loadWards() {
		if (!wardApi) return;
		const res = await fetch(wardApi, { credentials: 'include' });
		if (res.ok) wards = (await res.json()) as WardRow[];
	}

	async function loadFreeBeds(wid: number) {
		if (!bedApi || !wid) {
			beds = [];
			return;
		}
		const res = await fetch(
			`${bedApi}?free=1&wardId=${encodeURIComponent(String(wid))}`,
			{ credentials: 'include' }
		);
		beds = res.ok ? ((await res.json()) as BedRow[]) : [];
	}

	async function loadSourceOpdVisits(pid: string) {
		if (orderLocked) return;
		sourceOpdVisits = [];
		sourceOpdVisitId = '';
		if (!api || !pid.trim()) return;
		loadingSource = true;
		try {
			const qs = new URLSearchParams({
				mode: 'source-opd',
				patientId: pid.trim()
			});
			const res = await fetch(`${api}?${qs}`, {
				credentials: 'include'
			});
			if (!res.ok) return;
			const list = (await res.json()) as AdtSourceOpdVisitRow[];
			sourceOpdVisits = list ?? [];
			if (sourceOpdVisits.length > 0) {
				sourceOpdVisitId = String(sourceOpdVisits[0].visitId);
			}
		} finally {
			loadingSource = false;
		}
	}

	async function loadAdmissionOrder(orderId: number) {
		if (!orderApi) return;
		loadingOrder = true;
		try {
			const res = await fetch(
				`${orderApi}?id=${encodeURIComponent(String(orderId))}`,
				{ credentials: 'include' }
			);
			if (!res.ok) throw new Error(await res.text());
			const order = (await res.json()) as IpdAdmissionOrderRow;
			admissionOrderId = order.id;
			orderLocked = true;
			patientId = order.patientId;
			orderingDoctorId = order.orderingDoctorId ?? null;
			sourceOpdVisitId = String(order.sourceOpdVisitId);
			sourceOpdVisits = [
				{
					visitId: order.sourceOpdVisitId,
					visitNo: order.sourceOpdVisitNo,
					hasOpenOpBill: false
				}
			];
			if (order.preferredWardId) {
				wardId = String(order.preferredWardId);
			}
			if (order.notes) reasonNotes = order.notes;
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Failed to load order',
				StatusColorEnum.ERROR
			);
		} finally {
			loadingOrder = false;
		}
	}

	$effect(() => {
		const wid = Number(wardId);
		bedId = '';
		if (Number.isFinite(wid) && wid > 0) void loadFreeBeds(wid);
		else beds = [];
	});

	$effect(() => {
		const pid = patientId;
		if (!orderLocked) void loadSourceOpdVisits(pid);
	});

	$effect(() => {
		const oid = orderIdFromUrl;
		if (oid != null && admissionOrderId !== oid) {
			void loadAdmissionOrder(oid);
		}
	});

	async function handleAdmit(e: Event) {
		e.preventDefault();
		if (isSubmitting || !api) return;
		if (!patientId.trim()) {
			toastService.addToast(
				'Select a registered patient',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!branchId || !wardId || !bedId) {
			toastService.addToast(
				'Select ward and free bed',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (sourceOpdVisits.length > 0 && !sourceOpdVisitId) {
			toastService.addToast(
				'Select the OPD visit to admit from',
				StatusColorEnum.ERROR
			);
			return;
		}

		if (selectedSource?.hasOpenOpBill) {
			const confirm = await dialogService.open({
				title: 'Open OP bill',
				message:
					'This OPD visit has an open OP bill. Admit to IPD anyway? The OP bill stays open to settle later.',
				variant: DialogVariantEnum.CONFIRM
			});
			if (!confirm.confirmed) return;
		}

		isSubmitting = true;
		try {
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					action: 'admit',
					patientId: patientId.trim(),
					branchId,
					wardId: Number(wardId),
					bedId: Number(bedId),
					reasonNotes: reasonNotes.trim() || null,
					sourceOpdVisitId: sourceOpdVisitId
						? Number(sourceOpdVisitId)
						: null,
					admissionOrderId,
					admittingDoctorId: orderingDoctorId
				})
			});
			if (!res.ok) throw new Error(await res.text());
			toastService.addToast(
				'Patient admitted (new IPD visit created)',
				StatusColorEnum.SUCCESS
			);
			if (hospitalId) {
				routerUtil.replaceRoute(
					medoraHospitalPageUrl(
						hospitalId,
						WebRoutesEnum.MEDORA_HOME_ADT_ADMISSION_LIST
					)
				);
			}
		} catch (err) {
			toastService.addToast(
				err instanceof Error ? err.message : 'Admit failed',
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		loadWards();
	});
</script>

<div class="space-y-6">
	<WashCard>
		<WashCardBody>
			<form onsubmit={handleAdmit} class="space-y-4">
				<WashCardBodyTitle>New Admission</WashCardBodyTitle>
				<p class="text-sm opacity-70">
					{#if orderLocked}
						Fulfilling pending admission order #{admissionOrderId}.
						Assign a bed to admit.
					{:else}
						Requires a registered patient. Creates a new IPD visit.
						If the patient has an unfinished OPD visit, select it to
						link (OP bill may stay open).
					{/if}
				</p>
				{#if loadingOrder}
					<p class="text-sm opacity-70">Loading admission order…</p>
				{/if}
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
					<div>
						<label class="label-ink mb-1 block text-sm"
							>Patient <span class="text-error">*</span></label
						>
						<SearchSelect
							bind:value={patientId}
							placeholder="Search registered patient"
							className="w-full"
							searchFn={searchPatients}
							getLabelForValue={getPatientLabelForValue}
							minSearchLength={0}
							disabled={orderLocked}
						/>
					</div>
					{#if patientId && (loadingSource || sourceOpdVisits.length > 0 || orderLocked)}
						<div>
							<label
								class="label-ink mb-1 block text-sm"
								for="adm-source-opd"
							>
								Admit from OPD visit
								{#if sourceOpdVisits.length > 0}
									<span class="text-error">*</span>
								{/if}
							</label>
							{#if loadingSource}
								<p class="pt-2 text-sm opacity-70">Loading…</p>
							{:else}
								<WashSelect
									id="adm-source-opd"
									placeholder="Select OPD visit"
									options={sourceOpdOptions}
									bind:value={sourceOpdVisitId}
									disabled={orderLocked}
								/>
							{/if}
						</div>
					{/if}
					<div>
						<label class="label-ink mb-1 block text-sm" for="adm-ward"
							>Ward <span class="text-error">*</span></label
						>
						<WashSelect
							id="adm-ward"
							placeholder="Select ward"
							options={wardOptions}
							bind:value={wardId}
						/>
					</div>
					<div>
						<label class="label-ink mb-1 block text-sm" for="adm-bed"
							>Bed <span class="text-error">*</span></label
						>
						<WashSelect
							id="adm-bed"
							placeholder={wardId
								? 'Select free bed'
								: 'Select ward first'}
							options={bedOptions}
							bind:value={bedId}
							disabled={!wardId}
						/>
					</div>
					<div class="md:col-span-2 xl:col-span-3">
						<label class="label-ink mb-1 block text-sm" for="adm-notes"
							>Notes</label
						>
						<WashInputField
							id="adm-notes"
							bind:value={reasonNotes}
							inputPlaceholderText="Optional"
						/>
					</div>
				</div>
				<WashCardBodyAction>
					<WashButton
						type="submit"
						variant="primary"
						disabled={isSubmitting || loadingOrder}
						loading={isSubmitting}
					>
						Admit
					</WashButton>
				</WashCardBodyAction>
			</form>
		</WashCardBody>
	</WashCard>
</div>
