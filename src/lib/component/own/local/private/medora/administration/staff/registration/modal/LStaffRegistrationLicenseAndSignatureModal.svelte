<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashFileInput from '$lib/component/wash/fileinput/WashFileInput.svelte';
	import WashModal from '$lib/component/wash/modal/WashModal.svelte';
	import WashModalBox from '$lib/component/wash/modal/box/WashModalBox.svelte';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
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
	<WashModal
		groupName="staff-registration-more-info-modal"
		{open}
		onClose={handleClose}
	>
		<WashModalBox onClose={handleClose}>
			<h3 class="mb-4 text-lg font-bold">License &amp; Signature</h3>
			<fieldset disabled={viewOnly} class="m-0 min-w-0 border-0 p-0">
				<div class="flex flex-col gap-4">
					<div class="flex flex-col gap-2">
						<label for="license-no">License No</label>
						<WashInputField
							id="license-no"
							bind:value={licenseNo}
							inputType="text"
							className="w-full"
						/>
					</div>
					<div class="flex flex-col gap-2">
						<label for="license-expiry-date">License expiry date</label>
						<WashInputField
							id="license-expiry-date"
							bind:value={licenseExpiryDate}
							inputType="date"
							className="w-full"
						/>
					</div>
					<div class="flex flex-col gap-2">
						<label for="signature-image">Signature image</label>
						<WashFileInput
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
									<div class="skeleton size-full rounded"></div>
								{/if}
							</button>
							<div class="flex flex-col gap-2">
								<WashButton
									type="button"
									className="btn-primary btn-sm"
									onClick={() => signatureInputEl?.click()}
								>
									{signatureFile ? 'Change image' : 'Choose image'}
								</WashButton>
								<WashButton
									type="button"
									className="btn-error btn-sm"
									onClick={handleRemoveSignature}
									disabled={!signatureFile}
								>
									Remove
								</WashButton>
							</div>
						</div>
					</div>
					<div class="flex flex-col gap-2">
						<label for="signature-text">Signature text</label>
						<WashTextarea
							id="signature-text"
							bind:value={signatureText}
							className="w-full min-h-20 resize-y"
						/>
					</div>
				</div>
			</fieldset>
			<div class="modal-action mt-5">
				<WashButton
					type="button"
					className="btn btn-primary"
					onClick={handleClose}
				>
					Done
				</WashButton>
			</div>
		</WashModalBox>
	</WashModal>
{/if}
