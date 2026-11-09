<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucideClipboardList from '$lib/component/own/library/lucide/LucideClipboardList.svelte';
	import LucideLogOut from '$lib/component/own/library/lucide/LucideLogOut.svelte';
	import LucideRefreshCcw from '$lib/component/own/library/lucide/LucideRefreshCcw.svelte';
	import LucideStethoscope from '$lib/component/own/library/lucide/LucideStethoscope.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { IpdBedStatusEnum } from '$lib/model/enum/db-link';
	import type { AdtBedStatusRow } from '$lib/model/type/medora/adt/adt.type';
	import type { WardRow } from '$lib/model/type/medora/ipd/ipd.type';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import {
		buildConsultationEmrUrl,
		buildIpdNursingChartUrl
	} from '$lib/tool/ipd/ipd-nursing-redirect.util';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/adt/bed-status`
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

	let rows = $state<AdtBedStatusRow[]>([]);
	let wards = $state<WardRow[]>([]);
	let wardFilter = $state('');
	let statusFilter = $state('');
	let patientFilter = $state('');
	let visitFilter = $state('');
	let bedFilter = $state('');
	let roomFilter = $state('');
	let isLoading = $state(false);

	const statusOptions = [
		{ value: String(IpdBedStatusEnum.FREE), label: 'Free' },
		{ value: String(IpdBedStatusEnum.OCCUPIED), label: 'Occupied' },
		{ value: String(IpdBedStatusEnum.BLOCKED), label: 'Blocked' },
		{ value: String(IpdBedStatusEnum.CLEANING), label: 'Cleaning' }
	];
	const wardOptions = $derived([
		{ value: '', label: 'All wards' },
		...wards.map((w) => ({ value: String(w.id), label: w.name }))
	]);
	const statusFilterOptions = [
		{ value: '', label: 'All statuses' },
		...statusOptions
	];

	function statusLabel(s: number) {
		return (
			statusOptions.find((o) => o.value === String(s))?.label ??
			String(s)
		);
	}

	function statusTone(s: number): string {
		if (s === IpdBedStatusEnum.FREE) return 'badge-success';
		if (s === IpdBedStatusEnum.OCCUPIED) return 'badge-warning';
		if (s === IpdBedStatusEnum.BLOCKED) return 'badge-error';
		if (s === IpdBedStatusEnum.CLEANING) return 'badge-info';
		return 'badge-ghost';
	}

	function bedTitle(row: AdtBedStatusRow): string {
		const name = row.name?.trim() || 'Bed';
		const code = row.code?.trim();
		return code ? `${name} (${code})` : name;
	}

	type StatusCounts = {
		free: number;
		occupied: number;
		blocked: number;
		cleaning: number;
	};

	type RoomGroup = {
		roomId: number;
		roomName: string;
		beds: AdtBedStatusRow[];
	};

	type WardGroup = {
		key: string;
		wardName: string;
		counts: StatusCounts;
		rooms: RoomGroup[];
	};

	function emptyCounts(): StatusCounts {
		return { free: 0, occupied: 0, blocked: 0, cleaning: 0 };
	}

	function addCount(counts: StatusCounts, status: number) {
		if (status === IpdBedStatusEnum.FREE) counts.free += 1;
		else if (status === IpdBedStatusEnum.OCCUPIED) counts.occupied += 1;
		else if (status === IpdBedStatusEnum.BLOCKED) counts.blocked += 1;
		else if (status === IpdBedStatusEnum.CLEANING) counts.cleaning += 1;
	}

	const board = $derived.by(() => {
		const wardsByKey = new Map<string, WardGroup>();
		for (const row of rows) {
			const wardKey = String(row.wardId ?? row.wardName ?? 'none');
			let ward = wardsByKey.get(wardKey);
			if (!ward) {
				ward = {
					key: wardKey,
					wardName: row.wardName?.trim() || 'Ward',
					counts: emptyCounts(),
					rooms: []
				};
				wardsByKey.set(wardKey, ward);
			}
			addCount(ward.counts, row.bedStatus);
			const roomName = row.roomName?.trim() || 'Room';
			let room = ward.rooms.find((r) => r.roomId === row.roomId);
			if (!room) {
				room = { roomId: row.roomId, roomName, beds: [] };
				ward.rooms.push(room);
			}
			room.beds.push(row);
		}
		return [...wardsByKey.values()];
	});

	async function load() {
		if (!api) return;
		isLoading = true;
		try {
			const qs = new URLSearchParams();
			if (wardFilter) qs.set('wardId', wardFilter);
			if (statusFilter) qs.set('bedStatus', statusFilter);
			const patientName = patientFilter.trim();
			const visitName = visitFilter.trim();
			const bedName = bedFilter.trim();
			const roomName = roomFilter.trim();
			if (patientName) qs.set('patientName', patientName);
			if (visitName) qs.set('visitName', visitName);
			if (bedName) qs.set('bedName', bedName);
			if (roomName) qs.set('roomName', roomName);
			const res = await fetch(`${api}?${qs}`, {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			rows = (await res.json()) as AdtBedStatusRow[];
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Load failed',
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	}

	async function loadWards() {
		if (!wardApi) return;
		const res = await fetch(wardApi, { credentials: 'include' });
		if (res.ok) wards = (await res.json()) as WardRow[];
	}

	function rememberVisit(row: AdtBedStatusRow) {
		if (!row.visitId) return;
		VisitState.select({
			visitId: row.visitId,
			patientName: row.patientName ?? ''
		});
	}

	function openNursing(row: AdtBedStatusRow) {
		if (!hospitalId || !row.visitId) return;
		rememberVisit(row);
		const qs = new URLSearchParams({ visitId: row.visitId });
		void goto(
			buildIpdNursingChartUrl({
				hospitalId,
				emrChild: 'vital',
				search: `?${qs}`
			})
		);
	}

	function openEmr(row: AdtBedStatusRow) {
		if (!hospitalId || !row.visitId) return;
		rememberVisit(row);
		void goto(
			buildConsultationEmrUrl({
				hospitalId,
				visitId: row.visitId
			})
		);
	}

	async function handleDischarge(row: AdtBedStatusRow) {
		if (!row.admissionId || !admissionApi) return;
		const result = await dialogService.open({
			title: 'Discharge patient',
			message: `Discharge ${row.patientName ?? 'patient'} from bed ${row.name}?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			const res = await fetch(admissionApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					action: 'discharge',
					admissionId: row.admissionId
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toastService.addToast('Discharged', StatusColorEnum.SUCCESS);
			load();
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Discharge failed',
				StatusColorEnum.ERROR
			);
		}
	}

	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	function resetFilters() {
		if (searchTimer) clearTimeout(searchTimer);
		wardFilter = '';
		statusFilter = '';
		patientFilter = '';
		visitFilter = '';
		bedFilter = '';
		roomFilter = '';
		void load();
	}

	function scheduleSearch() {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			void load();
		}, 300);
	}

	lifeCycleUtil.onMount(() => {
		loadWards();
		load();
	});

	lifeCycleUtil.onDestroy(() => {
		if (searchTimer) clearTimeout(searchTimer);
	});
</script>

<div class="space-y-4">
	<WashCard>
		<WashCardBody
			className="grid grid-cols-1 items-end gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
		>
			<div class="min-w-0 w-full">
				<label class="label-ink mb-1 block text-sm" for="adt-bed-ward"
					>Ward</label
				>
				<SearchSelect
					inputId="adt-bed-ward"
					className="w-full"
					options={wardOptions}
					placeholder="All wards"
					bind:value={wardFilter}
					onChange={() => load()}
				/>
			</div>
			<div class="min-w-0 w-full">
				<label class="label-ink mb-1 block text-sm" for="adt-room-name"
					>Room name</label
				>
				<WashInputField
					id="adt-room-name"
					className="w-full"
					bind:value={roomFilter}
					inputPlaceholderText="Room name"
					oninput={scheduleSearch}
				/>
			</div>
			<div class="min-w-0 w-full">
				<label class="label-ink mb-1 block text-sm" for="adt-bed-name"
					>Bed name</label
				>
				<WashInputField
					id="adt-bed-name"
					className="w-full"
					bind:value={bedFilter}
					inputPlaceholderText="Bed name"
					oninput={scheduleSearch}
				/>
			</div>
			<div class="min-w-0 w-full">
				<label class="label-ink mb-1 block text-sm" for="adt-bed-status"
					>Status</label
				>
				<WashSelect
					id="adt-bed-status"
					className="w-full"
					options={statusFilterOptions}
					bind:value={statusFilter}
					onChange={() => load()}
				/>
			</div>
			<div class="min-w-0 w-full">
				<label class="label-ink mb-1 block text-sm" for="adt-bed-patient"
					>Patient name</label
				>
				<WashInputField
					id="adt-bed-patient"
					className="w-full"
					bind:value={patientFilter}
					inputPlaceholderText="Patient name"
					oninput={scheduleSearch}
				/>
			</div>
			<div class="min-w-0 w-full">
				<label class="label-ink mb-1 block text-sm" for="adt-bed-visit"
					>Visit name</label
				>
				<WashInputField
					id="adt-bed-visit"
					className="w-full"
					bind:value={visitFilter}
					inputPlaceholderText="Visit name"
					oninput={scheduleSearch}
				/>
			</div>
			<div
				class="flex h-full min-w-0 w-full items-end gap-2 sm:col-span-2 lg:col-span-1 xl:col-span-2"
			>
				<WashButton
					type="button"
					disabled={isLoading}
					onClick={resetFilters}
				>
					Reset
				</WashButton>
				<WashTooltip tooltipText="Refresh">
					<WashButton
						type="button"
						variant="primary"
						disabled={isLoading}
						onClick={() => load()}
					>
						<LucideRefreshCcw className="size-4" />
						Refresh
					</WashButton>
				</WashTooltip>
			</div>
		</WashCardBody>
	</WashCard>

	{#if isLoading && rows.length === 0}
		<p class="text-sm text-base-content/60">Loading beds…</p>
	{:else if board.length === 0}
		<p class="text-sm text-base-content/60">No beds</p>
	{:else}
		<div class="space-y-8">
			{#each board as ward (ward.key)}
				<section class="space-y-4">
					<header class="flex flex-wrap items-center gap-2">
						<h2 class="text-base font-semibold">{ward.wardName}</h2>
						<span class="badge badge-sm badge-success"
							>Free {ward.counts.free}</span
						>
						<span class="badge badge-sm badge-warning"
							>Occupied {ward.counts.occupied}</span
						>
						<span class="badge badge-sm badge-info"
							>Cleaning {ward.counts.cleaning}</span
						>
						<span class="badge badge-sm badge-error"
							>Blocked {ward.counts.blocked}</span
						>
					</header>
					{#each ward.rooms as room (room.roomId)}
						<div class="space-y-2">
							<h3 class="text-sm font-medium text-base-content/70">
								{room.roomName}
							</h3>
							<div
								class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
							>
								{#each room.beds as bed (bed.id)}
									{@const tone = statusTone(bed.bedStatus)}
									{@const canDischarge =
										!!bed.admissionId &&
										bed.bedStatus === IpdBedStatusEnum.OCCUPIED}
									{@const canOpenChart = !!bed.visitId}
									<WashCard className="h-40 w-full min-w-0">
										<WashCardBody className="flex h-full min-h-0 flex-col p-3">
											<div class="flex items-center justify-between gap-1.5">
												<h4
													class="min-w-0 truncate text-sm font-semibold leading-tight"
												>
													{bedTitle(bed)}
												</h4>
												<span class="badge badge-xs shrink-0 {tone}">
													{statusLabel(bed.bedStatus)}
												</span>
											</div>
											<div class="mt-2 min-w-0 space-y-0.5">
												<p class="truncate text-xs leading-tight">
													{bed.bedStatus === IpdBedStatusEnum.OCCUPIED
														? bed.patientName?.trim() || '—'
														: '—'}
												</p>
												<p
													class="truncate text-[11px] leading-tight text-base-content/60"
												>
													{bed.visitNo?.trim() || '—'}
												</p>
											</div>
											<div class="mt-auto flex h-6 shrink-0 items-center gap-1">
												{#if canOpenChart}
													<WashTooltip
														tooltipText="Nursing workbench"
														className="tooltip-primary"
													>
														<WashButton
															type="button"
															variant="primary"
															size="xs"
															square
															onClick={() => openNursing(bed)}
														>
															<LucideClipboardList className="size-3.5" />
															<span class="sr-only">Nursing workbench</span>
														</WashButton>
													</WashTooltip>
													<WashTooltip
														tooltipText="EMR"
														className="tooltip-secondary"
													>
														<WashButton
															type="button"
															variant="secondary"
															size="xs"
															square
															onClick={() => openEmr(bed)}
														>
															<LucideStethoscope className="size-3.5" />
															<span class="sr-only">EMR</span>
														</WashButton>
													</WashTooltip>
												{/if}
												{#if canDischarge}
													<WashTooltip
														tooltipText="Discharge"
														className="tooltip-warning"
													>
														<WashButton
															type="button"
															variant="warning"
															size="xs"
															square
															onClick={() => handleDischarge(bed)}
														>
															<LucideLogOut className="size-3.5" />
															<span class="sr-only">Discharge</span>
														</WashButton>
													</WashTooltip>
												{/if}
											</div>
										</WashCardBody>
									</WashCard>
								{/each}
							</div>
						</div>
					{/each}
				</section>
			{/each}
		</div>
	{/if}
</div>
