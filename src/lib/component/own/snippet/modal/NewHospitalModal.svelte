<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiJoin from '$lib/component/daisyui/join/DaisyUiJoin.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import { RoleEnum } from '$lib/model/enum/db-link';
	import { HospitalModalState } from '$lib/state/hospital-modal.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type {
		PatientRegCityRow,
		PatientRegCountryRow,
		PatientRegPostalCodeRow,
		PatientRegStateRow
	} from '$lib/model/type/heka/patient-reg-master.type';
	import type { UserListRow } from '$lib/model/type/heka/ui-rows.type';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

	let name = $state('');
	let code = $state('');
	let address = $state('');
	let phoneCountryId = $state<string>('');
	let phone = $state('');
	let email = $state('');
	let website = $state('');
	let postalCodeId = $state<string>('');
	let cityId = $state<string>('');
	let stateId = $state<string>('');
	let countryId = $state<string>('');
	let logoUrl = $state('');
	let description = $state('');
	let establishedDate = $state('');
	let isSubmitting = $state(false);
	let isLoading = $state(false);
	let editId = $state<string | null>(null);

	let countries = $state<PatientRegCountryRow[]>([]);
	let states = $state<PatientRegStateRow[]>([]);
	let cities = $state<PatientRegCityRow[]>([]);
	let postalCodes = $state<PatientRegPostalCodeRow[]>([]);
	let owners = $state<UserListRow[]>([]);
	let ownerId = $state<string>('');

	/** When current user is OWNER, ownerId is forced to their id; only SYSTEM_ADMIN can choose owner. */
	const isOwnerUser = $derived(
		HospitalModalState.currentUserRoleId === RoleEnum.OWNER &&
			HospitalModalState.currentUserId != null &&
			HospitalModalState.currentUserId !== ''
	);
	const currentUserId = $derived(
		HospitalModalState.currentUserId ?? ''
	);

	/** Filter by parent: State by country, City by state, Postal code by city (one-by-one step). */
	const filteredStates = $derived(
		!countryId
			? []
			: states.filter((s) => String(s.countryId) === countryId)
	);
	const filteredCities = $derived(
		!stateId
			? []
			: cities.filter((c) => String(c.stateId) === stateId)
	);
	const filteredPostalCodes = $derived(
		!cityId
			? []
			: postalCodes.filter((p) => String(p.cityId) === cityId)
	);

	/** When parent selection changes, clear child selections. */
	let prevCountryId = $state('');
	let prevStateId = $state('');
	let prevCityId = $state('');
	$effect(() => {
		if (countryId !== prevCountryId) {
			prevCountryId = countryId;
			stateId = '';
			cityId = '';
			postalCodeId = '';
			prevStateId = '';
			prevCityId = '';
		}
	});
	$effect(() => {
		if (stateId !== prevStateId) {
			prevStateId = stateId;
			cityId = '';
			postalCodeId = '';
			prevCityId = '';
		}
	});
	$effect(() => {
		if (cityId !== prevCityId) {
			prevCityId = cityId;
			postalCodeId = '';
		}
	});

	async function loadOptions() {
		const [
			countriesData,
			statesData,
			citiesData,
			postalCodesData,
			ownersRes
		] = await Promise.all([
			fetch('/api/heka/master/lookup?kind=country').then((r) => r.json()),
			fetch('/api/heka/master/lookup?kind=state').then((r) => r.json()),
			fetch('/api/heka/master/lookup?kind=city').then((r) => r.json()),
			fetch('/api/heka/master/lookup?kind=postalCode').then((r) =>
				r.json()
			),
			fetch(
				`/api/heka/auth/user?roleId=${RoleEnum.OWNER}&all=1`
			).then((r) => r.json())
		]);
		countries = countriesData;
		states = statesData;
		cities = citiesData;
		postalCodes = postalCodesData;
		owners = ownersRes as UserListRow[];
	}

	async function loadHospitalForEdit(id: string) {
		const r = await fetch(
			`/api/heka/hospital?id=${encodeURIComponent(id)}`
		);
		const h = (await r.json()) as Record<string, unknown> | null;
		if (!h || typeof h !== 'object') return;
		const loadedCountryId =
			h.countryId != null && h.countryId !== ''
				? String(h.countryId)
				: '';
		const loadedStateId =
			h.stateId != null && h.stateId !== ''
				? String(h.stateId)
				: '';
		const loadedCityId =
			h.cityId != null && h.cityId !== '' ? String(h.cityId) : '';
		const loadedPostalCodeId =
			h.postalCodeId != null && h.postalCodeId !== ''
				? String(h.postalCodeId)
				: '';
		// Set prev values first so cascade $effect won't clear child fields when we assign below
		prevCountryId = loadedCountryId;
		prevStateId = loadedStateId;
		prevCityId = loadedCityId;
		name = (h.name as string | null | undefined) ?? '';
		code = (h.code as string | null | undefined) ?? '';
		address = (h.address as string | null | undefined) ?? '';
		email = (h.email as string | null | undefined) ?? '';
		website = (h.website as string | null | undefined) ?? '';
		postalCodeId = loadedPostalCodeId;
		cityId = loadedCityId;
		stateId = loadedStateId;
		countryId = loadedCountryId;
		ownerId = isOwnerUser
			? currentUserId
			: String((h.ownerId as string | null | undefined) ?? '');
		logoUrl = (h.logoUrl as string | null | undefined) ?? '';
		description = (h.description as string | null | undefined) ?? '';
		establishedDate =
			(h.establishedDate as string | null | undefined) ?? '';
		const phoneCountryIdRaw = h.phoneCountryId as number | null | undefined;
		if (phoneCountryIdRaw != null) {
			phoneCountryId = String(phoneCountryIdRaw);
			const country = countries.find(
				(c) => c.id === phoneCountryIdRaw
			);
			const fullPhone = (h.phone as string | null | undefined) ?? '';
			phone =
				country?.countryCallingCode &&
				fullPhone.startsWith(country.countryCallingCode)
					? fullPhone.slice(country.countryCallingCode.length).trim()
					: fullPhone;
		} else {
			phoneCountryId = '';
			const fullPhone = (h.phone as string | null | undefined) ?? '';
			const match = countries.find(
				(c) =>
					c.countryCallingCode &&
					fullPhone.startsWith(c.countryCallingCode)
			);
			if (match?.countryCallingCode) {
				phoneCountryId = String(match.id);
				phone = fullPhone
					.slice(match.countryCallingCode.length)
					.trim();
			} else {
				phone = fullPhone;
			}
		}
	}

	function num(val: string): number | undefined {
		const n = parseInt(val, 10);
		return Number.isNaN(n) ? undefined : n;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (isSubmitting) return;
		const n = name.trim();
		if (!n) {
			toastService.addToast(
				'Name is required.',
				StatusColorEnum.ERROR
			);
			return;
		}

		// Build phone with country calling code (like LPatientRegistrationSecondColumn)
		let phoneWithCode: string | undefined;
		const phoneTrimmed = phone.trim();
		if (phoneCountryId && phoneTrimmed) {
			const country = countries.find(
				(c) => String(c.id) === phoneCountryId
			);
			phoneWithCode = country?.countryCallingCode
				? `${country.countryCallingCode}${phoneTrimmed}`
				: phoneTrimmed;
		} else if (phoneTrimmed) {
			phoneWithCode = phoneTrimmed;
		}

		const id = editId;
		const effectiveOwnerId = isOwnerUser
			? currentUserId
			: ownerId.trim() || undefined;
		isSubmitting = true;
		try {
			const body = {
				name: n,
				code: code.trim() || undefined,
				address: address.trim() || undefined,
				phone: phoneWithCode,
				phoneCountryId: num(phoneCountryId),
				email: email.trim() || undefined,
				website: website.trim() || undefined,
				ownerId: effectiveOwnerId,
				postalCodeId: num(postalCodeId),
				cityId: num(cityId),
				stateId: num(stateId),
				countryId: num(countryId),
				logoUrl: logoUrl.trim() || undefined,
				description: description.trim() || undefined,
				establishedDate: establishedDate.trim() || undefined
			};
			if (id != null) {
				const res = await fetch('/api/heka/hospital', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ id, ...body })
				});
				if (!res.ok) {
					const t = await res.text();
					throw new Error(t || 'Update failed');
				}
				toastSuccess(
					toastService,
					m.entity_hospital(),
					m.toast_action_updated()
				);
			} else {
				const res = await fetch('/api/heka/hospital', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
				if (!res.ok) {
					const t = await res.text();
					throw new Error(t || 'Create failed');
				}
				toastSuccess(
					toastService,
					m.entity_hospital(),
					m.toast_action_created()
				);
			}
			HospitalModalState.hospitalId = null;
			confirm();
		} catch (err) {
			const msg =
				err instanceof Error
					? err.message
					: id != null
						? 'Update failed'
						: 'Create failed';
			toastService.addToast(msg, StatusColorEnum.ERROR);
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		HospitalModalState.hospitalId = null;
		cancel();
	}

	lifeCycleUtil.onMount(() => {
		const id = HospitalModalState.hospitalId;
		editId = id;
		isLoading = true;
		loadOptions().then(async () => {
			if (id != null) {
				await loadHospitalForEdit(id);
			} else {
				name = '';
				code = '';
				ownerId = isOwnerUser ? currentUserId : '';
				address = '';
				phoneCountryId = '';
				phone = '';
				email = '';
				website = '';
				postalCodeId = '';
				cityId = '';
				stateId = '';
				countryId = '';
				prevCountryId = '';
				prevStateId = '';
				prevCityId = '';
				logoUrl = '';
				description = '';
				establishedDate = '';
			}
			isLoading = false;
		});
	});
</script>

{#if isLoading}
	<div class="flex items-center justify-center py-8">
		<span class="d-loading d-loading-lg d-loading-spinner"></span>
	</div>
{:else}
	<form onsubmit={handleSubmit} class="flex flex-col gap-4">
		<div class="max-h-[60vh] min-h-0 overflow-y-auto pr-1">
			<div class="flex flex-col gap-4">
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="hospital-name"
						className="shrink-0 sm:w-36 font-bold"
						>Name <span class="text-error">*</span></DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						<DaisyUiInputField
							id="hospital-name"
							bind:value={name}
							inputType="text"
							inputPlaceholderText="Hospital name"
							required
						/>
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="hospital-code"
						className="shrink-0 sm:w-36">Code</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						<DaisyUiInputField
							id="hospital-code"
							bind:value={code}
							inputType="text"
							inputPlaceholderText="e.g. H001"
						/>
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="hospital-owner"
						className="shrink-0 sm:w-36">Owner</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						{#if isOwnerUser}
							<p
								class="py-2 text-base-content/80"
								id="hospital-owner"
							>
								You (current user)
							</p>
							<!-- ownerId is set to currentUserId in logic -->
						{:else}
							<DaisyUiSelect
								bind:value={ownerId}
								optionHeader="Select owner ..."
							>
								{#each owners as o (o.id)}
									<option value={o.id}>{o.name ?? o.email}</option>
								{/each}
							</DaisyUiSelect>
						{/if}
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="hospital-country"
						className="shrink-0 sm:w-36">Country</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						<DaisyUiSelect
							bind:value={countryId}
							optionHeader="Select a country ..."
						>
							{#each countries as data (data.id)}
								<option value={String(data.id)}>{data.name}</option>
							{/each}
						</DaisyUiSelect>
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="hospital-state"
						className="shrink-0 sm:w-36">State</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						<DaisyUiSelect
							bind:value={stateId}
							optionHeader="Select a state ..."
							disabled={!countryId}
						>
							{#each filteredStates as data (data.id)}
								<option value={String(data.id)}>{data.name}</option>
							{/each}
						</DaisyUiSelect>
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="hospital-city"
						className="shrink-0 sm:w-36">City</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						<DaisyUiSelect
							bind:value={cityId}
							optionHeader="Select a city ..."
							disabled={!stateId}
						>
							{#each filteredCities as data (data.id)}
								<option value={String(data.id)}>{data.name}</option>
							{/each}
						</DaisyUiSelect>
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="hospital-postal"
						className="shrink-0 sm:w-36">Postal Code</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						<DaisyUiSelect
							bind:value={postalCodeId}
							optionHeader="Select a postal code ..."
							disabled={!cityId}
						>
							{#each filteredPostalCodes as data (data.id)}
								<option value={String(data.id)}
									>{String(data.value)}</option
								>
							{/each}
						</DaisyUiSelect>
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="hospital-phone"
						className="shrink-0 sm:w-36">Phone</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						<DaisyUiJoin>
							<DaisyUiSelect
								bind:value={phoneCountryId}
								optionHeader="Select country code ..."
								className="min-w-20 d-join-item"
							>
								{#each countries as data (data.id)}
									<option value={String(data.id)} class="gap-5"
										>{data.countryCallingCode} [{data.code.toUpperCase()}]</option
									>
								{/each}
							</DaisyUiSelect>
							<DaisyUiInputField
								id="hospital-phone"
								bind:value={phone}
								inputType="tel"
								inputPlaceholderText="Main phone"
								className="d-join-item"
							/>
						</DaisyUiJoin>
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="hospital-email"
						className="shrink-0 sm:w-36">Email</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						<DaisyUiInputField
							id="hospital-email"
							bind:value={email}
							inputType="email"
							inputPlaceholderText="mail@site.com"
						/>
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="hospital-website"
						className="shrink-0 sm:w-36">Website</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						<DaisyUiInputField
							id="hospital-website"
							bind:value={website}
							inputType="url"
							inputPlaceholderText="https://..."
						/>
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="hospital-established"
						className="shrink-0 sm:w-36"
						>Established date</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						<DaisyUiInputField
							id="hospital-established"
							bind:value={establishedDate}
							inputType="date"
						/>
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="hospital-logo"
						className="shrink-0 sm:w-36">Logo URL</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						<DaisyUiInputField
							id="hospital-logo"
							bind:value={logoUrl}
							inputType="url"
							inputPlaceholderText="https://..."
						/>
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
				>
					<DaisyUiLabel
						forText="hospital-address"
						className="shrink-0 sm:w-36 pt-2">Address</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						<DaisyUiTextarea
							id="hospital-address"
							bind:value={address}
							placeholder="Street, building, additional details"
						/>
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
				>
					<DaisyUiLabel
						forText="hospital-desc"
						className="shrink-0 sm:w-36 pt-2"
						>Description</DaisyUiLabel
					>
					<div class="max-w-80 flex-1">
						<DaisyUiTextarea
							id="hospital-desc"
							bind:value={description}
							placeholder="Short description"
						/>
					</div>
				</div>
			</div>
		</div>
		<div
			class="d-modal-action flex shrink-0 justify-end gap-2 border-t border-base-300 pt-4"
		>
			<DaisyUiButton
				type="button"
				className="d-btn-ghost"
				onClick={handleCancel}
			>
				{m.cancel()}
			</DaisyUiButton>
			<DaisyUiButton
				type="submit"
				className="d-btn-primary"
				loading={isSubmitting}
			>
				{editId != null ? m.update() : m.create()}
			</DaisyUiButton>
		</div>
	</form>
{/if}
