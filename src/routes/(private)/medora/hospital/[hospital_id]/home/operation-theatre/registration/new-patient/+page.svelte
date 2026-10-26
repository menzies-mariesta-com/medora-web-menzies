<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import OtPageHeader from '$lib/component/own/local/private/medora/operation-theatre/OtPageHeader.svelte';
	import type { OtOptions } from '$lib/model/type/medora/operation-theatre.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';

	type CreatedResult = {
		patient: { id: string; code: string | null };
		visit: { id: string; visitNo: string | null };
		otRequest: { id: number } | null;
	};

	const toast = new ToastService();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/operation-theatre`
			: ''
	);
	const today = new Date().toISOString().slice(0, 10);

	let options = $state<OtOptions | null>(null);
	let submitting = $state(false);
	let result = $state<CreatedResult | null>(null);

	let form = $state({
		branchId: '',
		firstName: '',
		middleName: '',
		lastName: '',
		phonePrimary: '',
		email: '',
		dateOfBirth: '',
		genderId: '',
		address: '',
		procedureName: '',
		otRequestDate: today,
		priority: 'elective'
	});

	const branchOptions = $derived([
		{ value: '', label: 'Select facility' },
		...(options?.branches ?? []).map((branch) => ({
			value: branch.id,
			label: branch.name
		}))
	]);
	const genderOptions = $derived([
		{ value: '', label: 'Select gender' },
		...(options?.genders ?? []).map((gender) => ({
			value: String(gender.id),
			label: gender.name
		}))
	]);
	const priorityOptions = [
		{ value: 'elective', label: 'Elective' },
		{ value: 'urgent', label: 'Urgent' },
		{ value: 'emergency', label: 'Emergency' }
	];

	async function loadOptions() {
		if (!apiBase) return;
		const res = await fetch(`${apiBase}/options`);
		if (!res.ok) await throwUserFacingHttpError(res);
		options = (await res.json()) as OtOptions;
		form.branchId = options.branches[0]?.id ?? '';
	}

	async function register() {
		if (!apiBase) return;
		if (
			!form.branchId ||
			!form.firstName.trim() ||
			!form.lastName.trim()
		) {
			toast.addWarningToast(
				'Facility, first name and last name are required.'
			);
			return;
		}
		submitting = true;
		try {
			const res = await fetch(`${apiBase}/registration`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					branchId: form.branchId,
					firstName: form.firstName,
					middleName: form.middleName,
					lastName: form.lastName,
					phonePrimary: form.phonePrimary,
					email: form.email,
					dateOfBirth: form.dateOfBirth,
					genderId: form.genderId || null,
					address: form.address,
					procedureName: form.procedureName,
					otRequestDate: form.otRequestDate,
					priority: form.priority
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			result = (await res.json()) as CreatedResult;
			toast.addSuccessToast(
				'Patient registered and encounter opened.'
			);
			form = {
				...form,
				firstName: '',
				middleName: '',
				lastName: '',
				phonePrimary: '',
				email: '',
				dateOfBirth: '',
				genderId: '',
				address: '',
				procedureName: ''
			};
		} catch (err) {
			toast.addErrorToast('Could not register the patient', err);
		} finally {
			submitting = false;
		}
	}

	onMount(() => {
		void loadOptions();
	});
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
	<OtPageHeader
		title="New Patient"
		description="Register a new patient, open an OPD encounter and optionally raise an OT request."
		onRefresh={loadOptions}
	/>

	{#if result}
		<div class="alert alert-success items-start text-sm">
			<div>
				<p class="font-semibold">Patient registered.</p>
				<p>
					HRN: {result.patient.code ?? '—'} · Visit: {result.visit
						.visitNo ?? '—'}
				</p>
				{#if result.otRequest}
					<p>OT request #{result.otRequest.id} created.</p>
				{/if}
				<div class="mt-2 flex gap-2">
					<a
						class="btn btn-sm btn-ghost"
						href={resolve(
							`/medora/hospital/${hospitalId}/home/operation-theatre/registration/list` as never
						)}>Registration list</a
					>
					<a
						class="btn btn-sm btn-primary"
						href={resolve(
							`/medora/hospital/${hospitalId}/home/operation-theatre/registration/ot-patient` as never
						)}>Raise another OT request</a
					>
				</div>
			</div>
		</div>
	{/if}

	<form
		class="grid gap-3 lg:grid-cols-2"
		onsubmit={(e) => {
			e.preventDefault();
			void register();
		}}
	>
		<WashCard>
			<WashCardBody className="gap-3">
				<WashCardBodyTitle className="text-secondary"
					>Patient details</WashCardBodyTitle
				>
			<div class="grid gap-3 sm:grid-cols-2">
				<label class="form-control min-w-0 sm:col-span-2">
					<span class="label-text text-xs">Facility *</span>
					<WashSelect
						className="select-sm"
						bind:value={form.branchId}
						options={branchOptions}
					/>
				</label>
				<label class="form-control">
					<span class="label-text text-xs">First name *</span>
					<input
						class="input input-sm w-full"
						bind:value={form.firstName}
						required
					/>
				</label>
				<label class="form-control">
					<span class="label-text text-xs">Middle name</span>
					<input
						class="input input-sm w-full"
						bind:value={form.middleName}
					/>
				</label>
				<label class="form-control">
					<span class="label-text text-xs">Last name *</span>
					<input
						class="input input-sm w-full"
						bind:value={form.lastName}
						required
					/>
				</label>
				<label class="form-control">
					<span class="label-text text-xs">Mobile number</span>
					<input
						class="input input-sm w-full"
						bind:value={form.phonePrimary}
						inputmode="tel"
					/>
				</label>
				<label class="form-control">
					<span class="label-text text-xs">Email (optional)</span>
					<input
						class="input input-sm w-full"
						type="email"
						bind:value={form.email}
					/>
				</label>
				<label class="form-control">
					<span class="label-text text-xs">Date of birth</span>
					<WashInputField
						inputType="date"
						className="input-sm w-full"
						bind:value={form.dateOfBirth}
					/>
				</label>
				<label class="form-control min-w-0">
					<span class="label-text text-xs">Gender</span>
					<WashSelect
						className="select-sm"
						bind:value={form.genderId}
						options={genderOptions}
					/>
				</label>
				<label class="form-control sm:col-span-2">
					<span class="label-text text-xs">Address</span>
					<textarea
						class="textarea textarea-sm w-full"
						rows="2"
						bind:value={form.address}
					></textarea>
				</label>
			</div>
			</WashCardBody>
		</WashCard>

		<WashCard>
			<WashCardBody className="gap-3">
				<WashCardBodyTitle className="text-secondary"
					>OT request (optional)</WashCardBodyTitle
				>
			<div class="grid gap-3 sm:grid-cols-2">
				<label class="form-control sm:col-span-2">
					<span class="label-text text-xs">Planned procedure</span>
					<input
						class="input input-sm w-full"
						bind:value={form.procedureName}
						placeholder="Leave blank to register only"
					/>
				</label>
				<label class="form-control">
					<span class="label-text text-xs">OT request date</span>
					<WashInputField
						inputType="date"
						className="input-sm w-full"
						bind:value={form.otRequestDate}
					/>
				</label>
				<label class="form-control min-w-0">
					<span class="label-text text-xs">Priority</span>
					<WashSelect
						className="select-sm"
						bind:value={form.priority}
						options={priorityOptions}
					/>
				</label>
			</div>
			<div class="mt-3 flex gap-2">
				<WashButton
					type="submit"
					variant="primary"
					size="sm"
					className="cursor-pointer"
					loading={submitting}
					disabled={submitting}
				>
					Register patient
				</WashButton>
				<WashButton
					variant="ghost"
					size="sm"
					className="cursor-pointer"
					onClick={() => {
						result = null;
						form.branchId = options?.branches[0]?.id ?? '';
					}}>Reset</WashButton
				>
			</div>
			</WashCardBody>
		</WashCard>
	</form>
</div>
