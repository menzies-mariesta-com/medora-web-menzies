<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiFileInput from '$lib/component/daisyui/fileinput/DaisyUiFileInput.svelte';
	import DaisyUiModal from '$lib/component/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiModalBox from '$lib/component/daisyui/modal/box/DaisyUiModalBox.svelte';
	import DaisyUiSkeleton from '$lib/component/daisyui/skeleton/DaisyUiSkeleton.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';

	let {
		open = $bindable(false),
		licenseNo = $bindable(''),
		licenseExpiryDate = $bindable(''),
		signatureFile = $bindable(null as File | null),
		signatureText = $bindable(''),
		viewOnly = false,
		initialSignatureImageUrl
	} = $props<{
		open?: boolean;
		licenseNo?: string;
		licenseExpiryDate?: string;
		signatureFile?: File | null;
		signatureText?: string;
		viewOnly?: boolean;
		initialSignatureImageUrl?: string;
	}>();

	const toastService = new ToastService();
	let signaturePreviewUrl = $state('');
	let signatureInputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (
			!signatureFile &&
			signaturePreviewUrl &&
			!initialSignatureImageUrl
		) {
			URL.revokeObjectURL(signaturePreviewUrl);
			signaturePreviewUrl = '';
		}
		if (
			open &&
			!signatureFile &&
			initialSignatureImageUrl &&
			!signaturePreviewUrl
		) {
			signaturePreviewUrl = initialSignatureImageUrl;
		}
	});

	function handleClose() {
		open = false;
	}

	function handleSignatureChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const allowed = [
			'image/jpeg',
			'image/png',
			'image/webp',
			'image/gif'
		];
		if (!allowed.includes(file.type)) {
			toastService.addToast(
				'Please choose a JPEG, PNG, WebP or GIF image.',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			toastService.addToast(
				'Image must be 5MB or smaller.',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (signaturePreviewUrl) URL.revokeObjectURL(signaturePreviewUrl);
		signaturePreviewUrl = URL.createObjectURL(file);
		signatureFile = file;
		input.value = '';
	}

	function handleRemoveSignature() {
		if (signaturePreviewUrl) URL.revokeObjectURL(signaturePreviewUrl);
		signaturePreviewUrl = '';
		signatureFile = null;
		if (signatureInputEl) signatureInputEl.value = '';
	}
</script>

{#if open}
	<DaisyUiModal
		groupName="staff-registration-more-info-modal"
		{open}
		onClose={handleClose}
	>
		<DaisyUiModalBox onClose={handleClose}>
			<h3 class="mb-4 text-lg font-bold">License &amp; Signature</h3>
			<fieldset disabled={viewOnly} class="m-0 min-w-0 border-0 p-0">
				<div class="flex flex-col gap-4">
					<div class="flex flex-col gap-2">
						<DaisyUiLabel forText="license-no"
							>License No</DaisyUiLabel
						>
						<DaisyUiInputField
							id="license-no"
							bind:value={licenseNo}
							inputType="text"
							className="w-full"
						/>
					</div>
					<div class="flex flex-col gap-2">
						<DaisyUiLabel forText="license-expiry-date"
							>License expiry date</DaisyUiLabel
						>
						<DaisyUiInputField
							id="license-expiry-date"
							bind:value={licenseExpiryDate}
							inputType="date"
							className="w-full"
						/>
					</div>
					<div class="flex flex-col gap-2">
						<DaisyUiLabel forText="signature-image"
							>Signature image</DaisyUiLabel
						>
						<DaisyUiFileInput
							accept="image/jpeg,image/png,image/webp,image/gif"
							className="hidden"
							bind:inputEl={signatureInputEl}
							onchange={handleSignatureChange}
						/>
						<div
							class="flex flex-wrap items-center justify-center gap-5 rounded-lg border border-base-300 bg-base-200/50 p-3"
						>
							<button
								type="button"
								class="flex size-32 shrink-0 items-center justify-center overflow-hidden rounded border border-base-300 bg-base-300 text-base-content/50 focus:ring-2 focus:ring-primary focus:outline-none sm:size-40"
								onclick={() => signatureInputEl?.click()}
								title="Choose signature image (uploaded when you save)"
							>
								{#if signaturePreviewUrl}
									<img
										src={signaturePreviewUrl}
										alt="Signature"
										class="size-full object-contain"
									/>
								{:else}
									<DaisyUiSkeleton className="size-full rounded" />
								{/if}
							</button>
							<div class="flex flex-col gap-2">
								<DaisyUiButton
									type="button"
									className="d-btn-primary d-btn-sm"
									onClick={() => signatureInputEl?.click()}
								>
									{signatureFile ? 'Change image' : 'Choose image'}
								</DaisyUiButton>
								<DaisyUiButton
									type="button"
									className="d-btn-error d-btn-sm"
									onClick={handleRemoveSignature}
									disabled={!signatureFile}
								>
									Remove
								</DaisyUiButton>
							</div>
						</div>
					</div>
					<div class="flex flex-col gap-2">
						<DaisyUiLabel forText="signature-text"
							>Signature text</DaisyUiLabel
						>
						<DaisyUiTextarea
							id="signature-text"
							bind:value={signatureText}
							className="w-full min-h-20 resize-y"
						/>
					</div>
				</div>
			</fieldset>
			<div class="d-modal-action mt-5">
				<DaisyUiButton
					type="button"
					className="d-btn d-btn-primary"
					onClick={handleClose}
				>
					Done
				</DaisyUiButton>
			</div>
		</DaisyUiModalBox>
	</DaisyUiModal>
{/if}
