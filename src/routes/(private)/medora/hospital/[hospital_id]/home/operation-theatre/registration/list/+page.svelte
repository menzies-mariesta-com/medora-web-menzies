<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import LucideLink from '$lib/component/own/library/lucide/LucideLink.svelte';
	import OtStatusBadge from '$lib/component/own/local/private/medora/operation-theatre/OtStatusBadge.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import type {
		OtOptions,
		OtRequestRow
	} from '$lib/model/type/medora/operation-theatre.type';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';

	const toast = new ToastService();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/operation-theatre`
			: ''
	);

	let options = $state<OtOptions | null>(null);
	let rows = $state<OtRequestRow[]>([]);
	let loading = $state(false);
	let total = $state(0);
	let pageNo = $state(1);
	let pageSize = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let scope = $state<'pending' | 'booked' | 'all'>('all');
	let branchId = $state('');
	let search = $state('');

	const branchOptions = $derived([
		{ value: '', label: 'All facilities' },
		...(options?.branches ?? []).map((branch) => ({
			value: branch.id,
			label: branch.name
		}))
	]);
	const scopeOptions = [
		{ value: 'all', label: 'All requests' },
		{ value: 'pending', label: 'Unbooked' },
		{ value: 'booked', label: 'Booked' }
	];
	const pageSizeOptions = [10, 25, 50, 100].map((size) => ({
		value: String(size),
		label: `${size} per page`
	}));
	const totalPages = $derived(Math.max(1, Math.ceil(total / Number(pageSize))));

	function dateLabel(value: string | null) {
		if (!value) return '—';
		const d = new Date(value);
		return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
	}

	async function loadOptions() {
		if (!apiBase) return;
		const res = await fetch(`${apiBase}/options`);
		if (!res.ok) await throwUserFacingHttpError(res);
		options = (await res.json()) as OtOptions;
	}

	async function load() {
		if (!apiBase) return;
		loading = true;
		try {
			const q = new SvelteURLSearchParams({
				scope,
				page: String(pageNo),
				pageSize
			});
			if (branchId) q.set('branchId', branchId);
			if (search.trim()) q.set('search', search.trim());
			const res = await fetch(`${apiBase}/requests?${q.toString()}`);
			if (!res.ok) await throwUserFacingHttpError(res);
			const result = (await res.json()) as PaginatedResult<OtRequestRow>;
			rows = result.data;
			total = result.total;
		} catch (err) {
			toast.addErrorToast('Could not load OT requests', err);
		} finally {
			loading = false;
		}
	}

	function applyFilters() {
		pageNo = 1;
		void load();
	}

	function goPage(next: number) {
		if (next < 1 || next > totalPages || next === pageNo) return;
		pageNo = next;
		void load();
	}

	function manageUrl(row: OtRequestRow) {
		return resolve(
			`/medora/hospital/${hospitalId}/home/operation-theatre/booking-details?caseId=${row.id}` as never
		);
	}

	onMount(() => {
		void loadOptions();
		void load();
	});
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
	<WashCard>
		<WashCardBody className="gap-3">
			<div class="flex flex-wrap items-end gap-2">
				<label class="form-control min-w-[16rem] flex-1">
					<span class="label-text text-xs">Search</span>
					<input
						class="input input-sm w-full"
						bind:value={search}
						placeholder="HRN, patient, procedure, surgeon"
						onkeydown={(e) => e.key === 'Enter' && applyFilters()}
					/>
				</label>
				<label class="form-control min-w-[12rem]">
					<span class="label-text text-xs">Facility</span>
					<WashSelect
						className="select-sm"
						bind:value={branchId}
						options={branchOptions}
						onChange={applyFilters}
					/>
				</label>
				<label class="form-control min-w-[11rem]">
					<span class="label-text text-xs">Scope</span>
					<WashSelect
						className="select-sm"
						bind:value={scope}
						options={scopeOptions}
						onChange={applyFilters}
					/>
				</label>
				<WashButton
					variant="secondary"
					size="sm"
					className="cursor-pointer"
					onClick={applyFilters}>Apply</WashButton
				>
				<WashButton
					variant="ghost"
					size="sm"
					className="cursor-pointer"
					onClick={() => {
						search = '';
						branchId = '';
						scope = 'all';
						applyFilters();
					}}>Clear</WashButton
				>
			</div>
		</WashCardBody>
	</WashCard>

	<WashCard>
		<WashCardBody className="gap-3">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h2 class="font-bold">OT registrations</h2>
					<p class="text-xs opacity-70">
						All OT requests, their booking state and theatre
						assignment.
					</p>
				</div>
				<WashButton
					variant="ghost"
					size="sm"
					className="cursor-pointer"
					disabled={loading}
					onClick={() => load()}>Refresh</WashButton
				>
			</div>

			<div class="overflow-x-auto">
				<table class="table table-sm">
					<thead>
						<tr>
							<th>Patient</th>
							<th>Procedure</th>
							<th>Surgeon</th>
							<th>Requested</th>
							<th>Booking</th>
							<th>Status</th>
							<th class="text-right">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#if loading}
							<tr>
								<td colspan="7" class="py-8 text-center">
									<span class="loading loading-spinner"></span>
								</td>
							</tr>
						{:else}
							{#each rows as row (row.id)}
								<tr>
									<td>
										<p class="font-semibold">{row.patientName}</p>
										<p class="text-xs opacity-60">
											{row.hrn ?? '—'} · {row.ageGender}
										</p>
									</td>
									<td class="max-w-[18rem]">
										<p class="truncate">
											{row.procedureName || '—'}
										</p>
										{#if row.provisionalDiagnosis}
											<p class="truncate text-xs opacity-60">
												{row.provisionalDiagnosis}
											</p>
										{/if}
									</td>
									<td>{row.surgeonName ?? '—'}</td>
									<td>{dateLabel(row.otRequestDate)}</td>
									<td>
										{#if row.bookingNo}
											<p>{row.bookingNo}</p>
											<p class="text-xs opacity-60">
												{row.otRoomName ?? '—'} ·
												{dateLabel(row.scheduledStart)}
											</p>
										{:else}
											<span class="badge badge-ghost badge-sm"
												>Unbooked</span
											>
										{/if}
									</td>
									<td>
										<OtStatusBadge
											statusId={row.statusTaggingId}
											label={row.statusName}
										/>
									</td>
									<td class="text-right">
										<a
											class="btn btn-ghost btn-xs"
											href={manageUrl(row)}
											title={row.bookingNo
												? 'Manage booking'
												: 'Book theatre'}
										>
											<LucideLink className="size-3.5" />
										</a>
									</td>
								</tr>
							{:else}
								<tr>
									<td colspan="7" class="py-8 text-center opacity-60"
										>No OT requests found.</td
									>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<div class="flex flex-wrap items-center justify-between gap-2">
				<p class="text-xs opacity-70">
					Showing {rows.length} of {total} request(s)
				</p>
				<div class="flex items-center gap-2">
					<WashSelect
						className="select-sm w-36"
						value={pageSize}
						options={pageSizeOptions}
						onChange={(next) => {
							pageSize = next ?? '10';
							applyFilters();
						}}
					/>
					<div class="join">
						<WashButton
							variant="ghost"
							size="sm"
							className="join-item"
							disabled={pageNo <= 1 || loading}
							onClick={() => goPage(pageNo - 1)}>Prev</WashButton
						>
						<span class="btn btn-ghost btn-sm join-item"
							>{pageNo} / {totalPages}</span
						>
						<WashButton
							variant="ghost"
							size="sm"
							className="join-item"
							disabled={pageNo >= totalPages || loading}
							onClick={() => goPage(pageNo + 1)}>Next</WashButton
						>
					</div>
				</div>
			</div>
		</WashCardBody>
	</WashCard>
</div>
