<script lang="ts">
	import DaisyUiModal from '$lib/component/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiModalBox from '$lib/component/daisyui/modal/box/DaisyUiModalBox.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCheckbox from '$lib/component/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiJoin from '$lib/component/daisyui/join/DaisyUiJoin.svelte';
	import { page } from '$app/state';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { ReferTypeEnum, StatusEnum } from '$lib/model/enum/db-link';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	type DialogMode = 'create' | 'view' | 'edit';

	let {
		modalState,
		onClose
	}: {
		modalState: { mode: DialogMode; id?: number };
		onClose: () => void;
	} = $props();

	const toastService = new ToastService();
	const lifeCycle = new LifeCycleUtil();

	type CountryRow = {
		id: number;
		name: string | null;
		code: string | null;
		countryCallingCode: string | null;
	};
	type TitleRow = { id: number; name: string | null };
	type StateRow = {
		id: number;
		name: string | null;
		countryId: number | null;
	};
	type CityRow = {
		id: number;
		name: string | null;
		code: string | null;
		stateId: number | null;
	};
	type PostalCodeRow = {
		id: number;
		value: unknown;
		cityId: number | null;
	};
	type ExternalReferRow = {
		id: number;
		titleId: number | null;
		name: string | null;
		address: string | null;
		phoneCountryId: number | null;
		phone: string | null;
		email: string | null;
		countryId: number | null;
		stateId: number | null;
		cityId: number | null;
		postalCodeId: number | null;
		statusId: number | null;
	};

	let countries = $state<CountryRow[]>([]);
	let titles = $state<TitleRow[]>([]);
	let states = $state<StateRow[]>([]);
	let cities = $state<CityRow[]>([]);
	let postalCodes = $state<PostalCodeRow[]>([]);

	let titleId = $state('');
	let name = $state('');
	let address = $state('');
	let phoneCountryId = $state('');
	let phone = $state('');
	let email = $state('');
	let countryId = $state('');
	let stateId = $state('');
	let cityId = $state('');
	let postalCodeId = $state('');
	let isActive = $state(true);

	let loaded = $state(false);
	let isSubmitting = $state(false);

	const isView = $derived(modalState.mode === 'view');
	const isCreate = $derived(modalState.mode === 'create');
	const isEdit = $derived(modalState.mode === 'edit');
	const title = $derived(
		isCreate
			? 'Create external refer'
			: isView
				? 'View external refer'
				: 'Edit external refer'
	);

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: null
	);

	// Selected objects and filtered lists (one-by-one like staff registration)
	const selectedCountry = $derived(
		countries.find((c) => String(c.id) === countryId) ??
			({} as CountryRow)
	);
	const selectedState = $derived(
		states.find((s) => String(s.id) === stateId) ?? ({} as StateRow)
	);
	const selectedCity = $derived(
		cities.find((c) => String(c.id) === cityId) ?? ({} as CityRow)
	);
	const selectedPostalCode = $derived(
		postalCodes.find((p) => String(p.id) === postalCodeId) ??
			({} as PostalCodeRow)
	);
	const filteredStateData = $derived(
		selectedCountry?.id
			? states.filter((s) => s.countryId === selectedCountry.id)
			: []
	);
	const filteredCityData = $derived(
		selectedState?.id
			? cities.filter((c) => c.stateId === selectedState.id)
			: []
	);
	const filteredPostalCodeData = $derived(
		selectedCity?.id
			? postalCodes.filter((p) => p.cityId === selectedCity.id)
			: []
	);

	// Track previous parent values so we only reset when *user* changes parent (not on load)
	let prevCountryId = $state('');
	let prevStateId = $state('');
	let prevCityId = $state('');

	// Reset dependent fields when parent selection changes (not on initial load)
	$effect(() => {
		if (!loaded) return;
		if (countryId !== prevCountryId) {
			prevCountryId = countryId;
			if (countryId) {
				if (
					!selectedCountry?.id ||
					(stateId && selectedState?.countryId !== selectedCountry.id)
				) {
					stateId = '';
					cityId = '';
					postalCodeId = '';
				}
			}
		}
	});
	$effect(() => {
		if (!loaded) return;
		if (stateId !== prevStateId) {
			prevStateId = stateId;
			if (stateId) {
				if (
					!selectedState?.id ||
					(cityId && selectedCity?.stateId !== selectedState.id)
				) {
					cityId = '';
					postalCodeId = '';
				}
			}
		}
	});
	$effect(() => {
		if (!loaded) return;
		if (cityId !== prevCityId) {
			prevCityId = cityId;
			if (cityId) {
				if (
					!selectedCity?.id ||
					(postalCodeId &&
						selectedPostalCode?.cityId !== selectedCity.id)
				) {
					postalCodeId = '';
				}
			}
		}
	});

	lifeCycle.onMount(async () => {
		const hospitalId = page.params.hospital_id;
		const baseUrl = `/api/heka/hospital/${hospitalId}/home/administration/external-refer-master`;

		const metaRes = await fetch(`${baseUrl}?meta=1`, {
			method: 'GET'
		});
		if (!metaRes.ok) throw new Error(await metaRes.text());
		const meta = (await metaRes.json()) as {
			countries: CountryRow[];
			titles: TitleRow[];
			states: StateRow[];
			cities: CityRow[];
			postalCodes: PostalCodeRow[];
		};
		countries = meta.countries ?? [];
		titles = meta.titles ?? [];
		states = meta.states ?? [];
		cities = meta.cities ?? [];
		postalCodes = meta.postalCodes ?? [];

		let refer: ExternalReferRow | null = null;
		if (modalState.id != null) {
			const referRes = await fetch(`${baseUrl}?id=${modalState.id}`, {
				method: 'GET'
			});
			if (!referRes.ok) throw new Error(await referRes.text());
			refer = (await referRes.json()) as ExternalReferRow | null;
		}
		if (refer) {
			titleId = refer.titleId != null ? String(refer.titleId) : '';
			name = refer.name ?? '';
			address = refer.address ?? '';
			phoneCountryId =
				refer.phoneCountryId != null
					? String(refer.phoneCountryId)
					: '';
			phone = refer.phone ?? '';
			email = refer.email ?? '';
			countryId =
				refer.countryId != null ? String(refer.countryId) : '';
			stateId = refer.stateId != null ? String(refer.stateId) : '';
			cityId = refer.cityId != null ? String(refer.cityId) : '';
			postalCodeId =
				refer.postalCodeId != null ? String(refer.postalCodeId) : '';
			isActive = refer.statusId === StatusEnum.ACTIVE;
			prevCountryId = countryId;
			prevStateId = stateId;
			prevCityId = cityId;
		} else if (isCreate) {
			isActive = true;
		}
		loaded = true;
	});

	async function handleSubmit() {
		if (isView) return;
		isSubmitting = true;
		try {
			const hospitalId = page.params.hospital_id;
			const baseUrl = `/api/heka/hospital/${hospitalId}/home/administration/external-refer-master`;
			if (isCreate) {
				const res = await fetch(baseUrl, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						titleId: titleId ? parseInt(titleId, 10) : null,
						name: name.trim() || null,
						address: address.trim() || null,
						phoneCountryId: phoneCountryId
							? parseInt(phoneCountryId, 10)
							: null,
						phone: phone.trim() || null,
						email: email.trim() || null,
						referTypeId: ReferTypeEnum.EXTERNAL,
						countryId: countryId ? parseInt(countryId, 10) : null,
						stateId: stateId ? parseInt(stateId, 10) : null,
						cityId: cityId ? parseInt(cityId, 10) : null,
						postalCodeId: postalCodeId
							? parseInt(postalCodeId, 10)
							: null,
						statusId: isActive
							? StatusEnum.ACTIVE
							: StatusEnum.INACTIVE
					})
				});
				if (!res.ok) throw new Error(await res.text());
				toastSuccess(
					toastService,
					m.entity_external_referral(),
					m.toast_action_created()
				);
			} else if (isEdit && modalState.id != null) {
				const res = await fetch(baseUrl, {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						id: modalState.id,
						titleId: titleId ? parseInt(titleId, 10) : null,
						name: name.trim() || null,
						address: address.trim() || null,
						phoneCountryId: phoneCountryId
							? parseInt(phoneCountryId, 10)
							: null,
						phone: phone.trim() || null,
						email: email.trim() || null,
						referTypeId: ReferTypeEnum.EXTERNAL,
						countryId: countryId ? parseInt(countryId, 10) : null,
						stateId: stateId ? parseInt(stateId, 10) : null,
						cityId: cityId ? parseInt(cityId, 10) : null,
						postalCodeId: postalCodeId
							? parseInt(postalCodeId, 10)
							: null,
						statusId: isActive
							? StatusEnum.ACTIVE
							: StatusEnum.INACTIVE
					})
				});
				if (!res.ok) throw new Error(await res.text());
				toastSuccess(
					toastService,
					m.entity_external_referral(),
					m.toast_action_updated()
				);
			}
			onClose();
		} catch (e) {
			toastService.addToast(
				e instanceof Error
					? e.message
					: 'Failed to save external refer.',
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<DaisyUiModal
	groupName="external-refer-master-modal"
	open={true}
	{onClose}
>
	<DaisyUiModalBox {onClose} showCloseButton={true}>
		<div
			class="flex items-center justify-between border-b border-base-300 pb-3"
		>
			<h2 class="text-lg font-semibold">{title}</h2>
			<DaisyUiButton
				className="d-btn-ghost d-btn-sm d-btn-circle"
				onClick={onClose}
			>
				<LucideX className="size-5" />
			</DaisyUiButton>
		</div>

		{#if !loaded}
			<p class="py-4 text-base-content/70">Loading…</p>
		{:else}
			<div class="mt-4 flex flex-col gap-4">
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="refer-name"
						className="shrink-0 sm:w-36">Name</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						{#if isView}
							<span id="refer-name">
								{[
									(
										titles.find((t) => String(t.id) === titleId)
											?.name ?? ''
									).trim(),
									(name ?? '').trim()
								]
									.filter(Boolean)
									.join(' ') || '—'}
							</span>
						{:else}
							<DaisyUiJoin>
								<DaisyUiSelect
									className="d-select min-w-24 d-join-item"
									optionHeader="Title"
									bind:value={titleId}
								>
									{#each titles as t (t.id)}
										<option value={String(t.id)}
											>{t.name ?? t.id}</option
										>
									{/each}
								</DaisyUiSelect>
								<DaisyUiInputField
									className=" d-join-item"
									bind:value={name}
									inputPlaceholderText="Name"
								/>
							</DaisyUiJoin>
						{/if}
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
				>
					<DaisyUiLabel
						forText="refer-address"
						className="shrink-0 sm:w-36">Address</DaisyUiLabel
					>
					{#if isView}
						<span
							id="refer-address"
							class="flex-1 whitespace-pre-wrap"
							>{address || '—'}</span
						>
					{:else}
						<textarea
							id="refer-address"
							class="d-textarea-bordered d-textarea min-h-20 flex-1"
							bind:value={address}
							placeholder="Address"
						></textarea>
					{/if}
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="refer-country"
						className="shrink-0 sm:w-36">Country</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						{#if isView}
							<span id="refer-country">
								{countries.find((c) => String(c.id) === countryId)
									?.name ?? '—'}
							</span>
						{:else}
							<DaisyUiSelect
								className="d-select"
								optionHeader="Select a country ..."
								bind:value={countryId}
							>
								{#each countries as c (c.id)}
									<option value={String(c.id)}
										>{c.name ?? c.code ?? c.id}</option
									>
								{/each}
							</DaisyUiSelect>
						{/if}
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="refer-state"
						className="shrink-0 sm:w-36">State</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						{#if isView}
							<span id="refer-state">
								{states.find((s) => String(s.id) === stateId)?.name ??
									'—'}
							</span>
						{:else}
							<DaisyUiSelect
								className="d-select"
								optionHeader="Select a state ..."
								disabled={!selectedCountry?.id}
								bind:value={stateId}
							>
								{#each filteredStateData as data (data.id)}
									<option value={String(data.id)}
										>{data.name ?? data.id}</option
									>
								{/each}
							</DaisyUiSelect>
						{/if}
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="refer-city"
						className="shrink-0 sm:w-36">City</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						{#if isView}
							<span id="refer-city">
								{cities.find((c) => String(c.id) === cityId)?.name ??
									'—'}
							</span>
						{:else}
							<DaisyUiSelect
								className="d-select"
								optionHeader="Select a city ..."
								disabled={!selectedState?.id}
								bind:value={cityId}
							>
								{#each filteredCityData as data (data.id)}
									<option value={String(data.id)}
										>{data.name ?? data.code ?? data.id}</option
									>
								{/each}
							</DaisyUiSelect>
						{/if}
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="refer-postalCode"
						className="shrink-0 sm:w-36">Postal Code</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						{#if isView}
							<span id="refer-postalCode">
								{postalCodes.find(
									(p) => String(p.id) === postalCodeId
								)?.value ?? '—'}
							</span>
						{:else}
							<DaisyUiSelect
								className="d-select"
								optionHeader="Select a postal code ..."
								disabled={!selectedCity?.id}
								bind:value={postalCodeId}
							>
								{#each filteredPostalCodeData as data (data.id)}
									<option value={String(data.id)}
										>{String(data.value)}</option
									>
								{/each}
							</DaisyUiSelect>
						{/if}
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="refer-phone"
						className="shrink-0 sm:w-36">Phone</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						{#if isView}
							{@const code = phoneCountryId
								? countries.find(
										(c) => String(c.id) === phoneCountryId
									)?.countryCallingCode
								: ''}
							{@const display = (code ?? '') + (phone ?? '')}
							<span id="refer-phone">{display || '—'}</span>
						{:else}
							<DaisyUiJoin>
								<DaisyUiSelect
									bind:value={phoneCountryId}
									optionHeader="Select country code ..."
									className="d-select min-w-20 d-join-item"
								>
									{#each countries as c (c.id)}
										<option value={String(c.id)}
											>{c.countryCallingCode} [{c.code?.toUpperCase() ??
												c.id}]</option
										>
									{/each}
								</DaisyUiSelect>
								<DaisyUiInputField
									id="refer-phone"
									className=" d-join-item"
									bind:value={phone}
									inputType="tel"
									inputPlaceholderText="Number"
								/>
							</DaisyUiJoin>
						{/if}
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="refer-email"
						className="shrink-0 sm:w-36">Email</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						{#if isView}
							<span id="refer-email">{email || '—'}</span>
						{:else}
							<DaisyUiInputField
								id="refer-email"
								bind:value={email}
								inputPlaceholderText="Email"
							/>
						{/if}
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="refer-status"
						className="shrink-0 sm:w-36">Status</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						{#if isView}
							<span id="refer-status"
								>{isActive ? 'Active' : 'Inactive'}</span
							>
						{:else}
							<label class="flex cursor-pointer items-center gap-2">
								<DaisyUiCheckbox bind:checked={isActive} />
								<span>Active</span>
							</label>
						{/if}
					</div>
				</div>
			</div>

			{#if !isView}
				<div class="d-modal-action mt-4">
					<DaisyUiButton className="d-btn" onClick={onClose}
						>Cancel</DaisyUiButton
					>
					<DaisyUiButton
						className="d-btn d-btn-primary"
						disabled={isSubmitting}
						onClick={handleSubmit}
					>
						{isSubmitting ? 'Saving…' : isCreate ? 'Create' : 'Save'}
					</DaisyUiButton>
				</div>
			{/if}
		{/if}
	</DaisyUiModalBox>
</DaisyUiModal>
