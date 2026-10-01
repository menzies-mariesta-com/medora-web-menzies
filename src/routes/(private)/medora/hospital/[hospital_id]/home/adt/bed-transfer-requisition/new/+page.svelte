<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashCardBodyAction from '$lib/component/wash/card/body/action/WashCardBodyAction.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import {
		medoraHospitalPageUrl,
		WebRoutesEnum
	} from '$lib/model/enum/routes.enum';
	import type {
		BedRow,
		IpdCensusRow,
		WardRow
	} from '$lib/model/type/medora/ipd/ipd.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const routerUtil = new RouterUtil();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/adt/bed-transfer-requisition`
			: ''
	);
	const admissionApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/adt/admission`
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

	let admissions = $state<IpdCensusRow[]>([]);
	let wards = $state<WardRow[]>([]);
	let beds = $state<BedRow[]>([]);

	let admissionId = $state('');
	let toWardId = $state('');
	let toBedId = $state('');
	let remark = $state('');
	let isSubmitting = $state(false);

	const selectedAdmission = $derived(
		admissions.find((a) => String(a.admissionId) === admissionId) ??
			null
	);

	const admissionOptions = $derived(
		admissions.map((a) => ({
			value: String(a.admissionId),
			label: `${a.admissionNo ?? a.admissionId} — ${a.patientName} (${a.bedName ?? 'bed'})`
		}))
	);
	const wardOptions = $derived(
		wards.map((w) => ({ value: String(w.id), label: w.name }))
	);
	const bedOptions = $derived(
		beds.map((b) => ({
			value: String(b.id),
			label: b.code ? `${b.name} (${b.code})` : (b.name ?? String(b.id))
		}))
	);

	async function loadAdmissions() {
		if (!admissionApi) return;
		const res = await fetch(
			`${admissionApi}?page=1&pageSize=100`,
			{ credentials: 'include' }
		);
		if (!res.ok) return;
		const result = (await res.json()) as { data: IpdCensusRow[] };
		admissions = result.data ?? [];
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

	$effect(() => {
		const wid = Number(toWardId);
		toBedId = '';
		if (Number.isFinite(wid) && wid > 0) void loadFreeBeds(wid);
		else beds = [];
	});

	async function handleCreate(e: Event) {
		e.preventDefault();
		if (isSubmitting || !api || !selectedAdmission) return;
		if (!toWardId || !toBedId) {
			toastService.addToast(
				'Select destination ward and bed',
				StatusColorEnum.ERROR
			);
			return;
		}
		isSubmitting = true;
		try {
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					admissionId: selectedAdmission.admissionId,
					fromBedId: selectedAdmission.bedId,
					toWardId: Number(toWardId),
					toBedId: Number(toBedId),
					remark: remark.trim() || null
				})
			});
			if (!res.ok) throw new Error(await res.text());
			toastService.addToast(
				'Requisition created',
				StatusColorEnum.SUCCESS
			);
			if (hospitalId) {
				routerUtil.replaceRoute(
					medoraHospitalPageUrl(
						hospitalId,
						WebRoutesEnum.MEDORA_HOME_ADT_BED_TRANSFER_REQUISITION_LIST
					)
				);
			}
		} catch (err) {
			toastService.addToast(
				err instanceof Error ? err.message : 'Create failed',
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		loadAdmissions();
		loadWards();
	});
</script>

<div class="space-y-6">
	<WashCard>
		<WashCardBody>
			<form onsubmit={handleCreate} class="space-y-4">
				<WashCardBodyTitle>New Bed Transfer Requisition</WashCardBodyTitle>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
					<div class="md:col-span-2">
						<label class="label-ink mb-1 block text-sm" for="xfer-adm"
							>Active admission <span class="text-error">*</span></label
						>
						<WashSelect
							id="xfer-adm"
							placeholder="Select admission"
							options={admissionOptions}
							bind:value={admissionId}
						/>
					</div>
					{#if selectedAdmission}
						<div>
							<p class="label-ink mb-1 text-sm">From bed</p>
							<p class="pt-2 text-sm">
								{selectedAdmission.bedName ?? selectedAdmission.bedId}
								({selectedAdmission.wardName ?? 'ward'})
							</p>
						</div>
					{/if}
					<div>
						<label class="label-ink mb-1 block text-sm" for="xfer-ward"
							>To ward <span class="text-error">*</span></label
						>
						<WashSelect
							id="xfer-ward"
							placeholder="Select ward"
							options={wardOptions}
							bind:value={toWardId}
						/>
					</div>
					<div>
						<label class="label-ink mb-1 block text-sm" for="xfer-bed"
							>To bed <span class="text-error">*</span></label
						>
						<WashSelect
							id="xfer-bed"
							placeholder={toWardId
								? 'Select free bed'
								: 'Select ward first'}
							options={bedOptions}
							bind:value={toBedId}
							disabled={!toWardId}
						/>
					</div>
					<div class="md:col-span-2">
						<label class="label-ink mb-1 block text-sm" for="xfer-remark"
							>Remark</label
						>
						<WashInputField id="xfer-remark" bind:value={remark} />
					</div>
				</div>
				<WashCardBodyAction>
					<WashButton
						type="submit"
						variant="primary"
						disabled={isSubmitting}
						loading={isSubmitting}>Create requisition</WashButton
					>
				</WashCardBodyAction>
			</form>
		</WashCardBody>
	</WashCard>
</div>
