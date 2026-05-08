<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCheckbox from '$lib/component/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import { SupplierModalState } from '$lib/state/supplier-modal.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { page } from '$app/state';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { m } from '$lib/paraglide/messages';
	import type {
		PatientRegCityRow,
		PatientRegCountryRow,
		PatientRegPostalCodeRow,
		PatientRegStateRow
	} from '$lib/model/type/heka/patient-reg-master.type';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' && page.params.hospital_id
			? page.params.hospital_id
			: ''
	);
	const apiBase = $derived(
		hospitalId
			? `/api/heka/hospital/${hospitalId}/home/inventory-setup/supplier-setup`
			: ''
	);

	let countryData = $state<PatientRegCountryRow[]>([]);
	let stateData = $state<PatientRegStateRow[]>([]);
	let cityData = $state<PatientRegCityRow[]>([]);
	let postalCodeData = $state<PatientRegPostalCodeRow[]>([]);

	let name = $state('');
	let code = $state('');
	let address = $state('');
	let selectedCountryId = $state('');
	let selectedStateId = $state('');
	let selectedCityId = $state('');
	let selectedPostalCodeId = $state('');
	let phone = $state('');
	let selectedPhoneCountryId = $state('');
	let email = $state('');
	let remark = $state('');
	let formActive = $state(true);
	let isSubmitting = $state(false);
	let isLoading = $state(true);

	const modalState = $derived(SupplierModalState);
	const isEdit = $derived(
		modalState.mode === 'edit' && modalState.editRow != null
	);

	const selectedCountry = $derived(
		countryData.find((c) => String(c.id) === selectedCountryId) ?? null
	);
	const selectedState = $derived(
		stateData.find((s) => String(s.id) === selectedStateId) ?? null
	);
	const selectedCity = $derived(
		cityData.find((c) => String(c.id) === selectedCityId) ?? null
	);

	const filteredStateData = $derived(
		selectedCountry?.id
			? stateData.filter((s) => s.countryId === selectedCountry.id)
			: []
	);
	const filteredCityData = $derived(
		selectedState?.id
			? cityData.filter((c) => c.stateId === selectedState.id)
			: []
	);
	const filteredPostalCodeData = $derived(
		selectedCity?.id
			? postalCodeData.filter((p) => p.cityId === selectedCity.id)
			: []
	);

	$effect(() => {
		if (selectedCountryId) {
			if (
				!selectedCountry?.id ||
				(selectedStateId &&
					selectedState?.countryId !== selectedCountry.id)
			) {
				selectedStateId = '';
				selectedCityId = '';
				selectedPostalCodeId = '';
			}
		}
	});

	$effect(() => {
		if (selectedStateId) {
			if (
				!selectedState?.id ||
				(selectedCityId && selectedCity?.stateId !== selectedState.id)
			) {
				selectedCityId = '';
				selectedPostalCodeId = '';
			}
		}
	});

	$effect(() => {
		if (selectedCityId) {
			if (
				!selectedCity?.id ||
				(selectedPostalCodeId &&
					selectedPostalCode?.cityId !== selectedCity.id)
			) {
				selectedPostalCodeId = '';
			}
		}
	});

	const selectedPostalCode = $derived(
		postalCodeData.find((p) => String(p.id) === selectedPostalCodeId) ??
			null
	);

	lifeCycleUtil.onMount(async () => {
		try {
			if (!hospitalId) return;
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/administration/staff/registration?mode=lookups`,
				{ credentials: 'include', cache: 'no-store' }
			);
			if (res.ok) {
				const d = (await res.json()) as {
					countryData?: PatientRegCountryRow[];
					stateData?: PatientRegStateRow[];
					cityData?: PatientRegCityRow[];
					postalCodeData?: PatientRegPostalCodeRow[];
				};
				countryData = d.countryData ?? [];
				stateData = d.stateData ?? [];
				cityData = d.cityData ?? [];
				postalCodeData = d.postalCodeData ?? [];
			}

			if (modalState.mode === 'edit' && modalState.editRow != null) {
				const r = modalState.editRow;
				name = r.name ?? '';
				code = r.code ?? '';
				address = r.address ?? '';
				selectedCountryId =
					r.countryId != null ? String(r.countryId) : '';
				selectedStateId = r.stateId != null ? String(r.stateId) : '';
				selectedCityId = r.cityId != null ? String(r.cityId) : '';
				selectedPostalCodeId =
					r.postalCodeId != null ? String(r.postalCodeId) : '';
				phone = r.phone ?? '';
				selectedPhoneCountryId =
					r.phoneCountryId != null ? String(r.phoneCountryId) : '';
				email = r.email ?? '';
				remark = r.remark ?? '';
				formActive =
					(r.statusId ?? StatusEnum.ACTIVE) === StatusEnum.ACTIVE;
			}
		} finally {
			isLoading = false;
		}
	});

	function numOrNull(s: string): number | null {
		const t = s.trim();
		if (!t) return null;
		const n = Number(t);
		return Number.isFinite(n) ? n : null;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (isSubmitting || isLoading) return;
		if (!name?.trim()) {
			toastService.addToast(m.name_required(), StatusColorEnum.ERROR);
			return;
		}
		if (!apiBase) {
			toastService.addToast(m.delete_failed(), StatusColorEnum.ERROR);
			return;
		}
		const statusId = formActive
			? StatusEnum.ACTIVE
			: StatusEnum.INACTIVE;
		const body = {
			name: name.trim(),
			code: code.trim() || null,
			address: address.trim() || null,
			countryId: numOrNull(selectedCountryId),
			stateId: numOrNull(selectedStateId),
			cityId: numOrNull(selectedCityId),
			postalCodeId: numOrNull(selectedPostalCodeId),
			phone: phone.trim() || null,
			phoneCountryId: numOrNull(selectedPhoneCountryId),
			email: email.trim() || null,
			remark: remark.trim() || null,
			statusId
		};
		isSubmitting = true;
		try {
			if (modalState.mode === 'create') {
				const res = await fetch(apiBase, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(body)
				});
				if (!res.ok) {
					const t = await res.text().catch(() => '');
					throw new Error(t || `Create failed: ${res.status}`);
				}
				toastService.addToast(
					m.supplier_created(),
					StatusColorEnum.SUCCESS
				);
			} else if (modalState.editRow) {
				const res = await fetch(apiBase, {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						id: modalState.editRow.id,
						...body
					})
				});
				if (!res.ok) {
					const t = await res.text().catch(() => '');
					throw new Error(t || `Update failed: ${res.status}`);
				}
				toastService.addToast(
					m.supplier_updated(),
					StatusColorEnum.SUCCESS
				);
			}
			confirm();
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : m.delete_failed();
			toastService.addToast(msg, StatusColorEnum.ERROR);
		} finally {
			isSubmitting = false;
		}
	}
</script>

{#if isLoading}
	<p class="text-sm opacity-70">{m.loading()}</p>
{:else}
	<form onsubmit={handleSubmit} class="flex max-h-[min(70vh,36rem)] flex-col gap-4 overflow-y-auto pe-1">
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="sup-name" className="shrink-0 sm:w-40"
				>{m.supplier_name()}
				<span class="text-error">*</span></DaisyUiLabel
			>
			<div class="max-w-lg flex-1">
				<DaisyUiInputField
					id="sup-name"
					bind:value={name}
					inputType="text"
					inputPlaceholderText={m.supplier_name()}
					required
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="sup-code" className="shrink-0 sm:w-40"
				>{m.supplier_code()}</DaisyUiLabel
			>
			<div class="max-w-lg flex-1">
				<DaisyUiInputField
					id="sup-code"
					bind:value={code}
					inputType="text"
					inputPlaceholderText={m.supplier_code()}
				/>
			</div>
		</div>
		<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
			<DaisyUiLabel forText="sup-addr" className="shrink-0 sm:w-40"
				>{m.address()}</DaisyUiLabel
			>
			<div class="max-w-lg flex-1">
				<DaisyUiTextarea
					id="sup-addr"
					bind:value={address}
					placeholder={m.address()}
					className="min-h-20"
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="sup-country" className="shrink-0 sm:w-40"
				>{m.country()}</DaisyUiLabel
			>
			<div class="max-w-lg flex-1">
				<DaisyUiSelect
					id="sup-country"
					bind:value={selectedCountryId}
					optionHeader={m.select_country()}
				>
					{#each countryData as c (c.id)}
						<option value={String(c.id)}>{c.name}</option>
					{/each}
				</DaisyUiSelect>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="sup-state" className="shrink-0 sm:w-40"
				>{m.state()}</DaisyUiLabel
			>
			<div class="max-w-lg flex-1">
				<DaisyUiSelect
					id="sup-state"
					bind:value={selectedStateId}
					disabled={!selectedCountryId}
					optionHeader={m.state()}
				>
					{#each filteredStateData as s (s.id)}
						<option value={String(s.id)}>{s.name ?? s.code ?? s.id}</option>
					{/each}
				</DaisyUiSelect>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="sup-city" className="shrink-0 sm:w-40"
				>{m.city()}</DaisyUiLabel
			>
			<div class="max-w-lg flex-1">
				<DaisyUiSelect
					id="sup-city"
					bind:value={selectedCityId}
					disabled={!selectedStateId}
					optionHeader={m.city()}
				>
					{#each filteredCityData as ct (ct.id)}
						<option value={String(ct.id)}>{ct.name ?? ct.code ?? ct.id}</option>
					{/each}
				</DaisyUiSelect>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="sup-postal" className="shrink-0 sm:w-40"
				>{m.postal_code()}</DaisyUiLabel
			>
			<div class="max-w-lg flex-1">
				<DaisyUiSelect
					id="sup-postal"
					bind:value={selectedPostalCodeId}
					disabled={!selectedCityId}
					optionHeader={m.postal_code()}
				>
					{#each filteredPostalCodeData as p (p.id)}
						<option value={String(p.id)}>{String(p.value)}</option>
					{/each}
				</DaisyUiSelect>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="sup-phone-cc" className="shrink-0 sm:w-40"
				>{m.inventory_party_phone_country()}</DaisyUiLabel
			>
			<div class="max-w-lg flex-1">
				<DaisyUiSelect
					id="sup-phone-cc"
					bind:value={selectedPhoneCountryId}
					optionHeader={m.select_country_code()}
				>
					{#each countryData as c (c.id)}
						<option value={String(c.id)}
							>{c.name} (+{c.countryCallingCode})</option
						>
					{/each}
				</DaisyUiSelect>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="sup-phone" className="shrink-0 sm:w-40"
				>{m.phone()}</DaisyUiLabel
			>
			<div class="max-w-lg flex-1">
				<DaisyUiInputField
					id="sup-phone"
					bind:value={phone}
					inputType="text"
					inputPlaceholderText={m.phone()}
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="sup-email" className="shrink-0 sm:w-40"
				>{m.email()}</DaisyUiLabel
			>
			<div class="max-w-lg flex-1">
				<DaisyUiInputField
					id="sup-email"
					bind:value={email}
					inputType="email"
					inputPlaceholderText={m.email()}
				/>
			</div>
		</div>
		<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
			<DaisyUiLabel forText="sup-remark" className="shrink-0 sm:w-40"
				>{m.inventory_party_remark()}</DaisyUiLabel
			>
			<div class="max-w-lg flex-1">
				<DaisyUiTextarea
					id="sup-remark"
					bind:value={remark}
					placeholder={m.inventory_party_remark()}
					className="min-h-16"
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel className="shrink-0 sm:w-40">{m.status()}</DaisyUiLabel>
			<div class="flex max-w-lg flex-1 flex-wrap items-center gap-2">
				<label class="flex cursor-pointer items-center gap-2">
					<DaisyUiCheckbox bind:checked={formActive} />
					<span class="text-sm opacity-80">{m.active_label()}</span>
				</label>
			</div>
		</div>
		<div
			class="d-modal-action flex shrink-0 justify-end gap-2 border-t border-base-300 pt-4"
		>
			<DaisyUiButton
				type="button"
				className="d-btn-ghost"
				onClick={() => cancel()}
			>
				{m.cancel()}
			</DaisyUiButton>
			<DaisyUiButton
				type="submit"
				className="d-btn-primary"
				loading={isSubmitting}
			>
				{isEdit ? m.update() : m.create()}
			</DaisyUiButton>
		</div>
	</form>
{/if}
