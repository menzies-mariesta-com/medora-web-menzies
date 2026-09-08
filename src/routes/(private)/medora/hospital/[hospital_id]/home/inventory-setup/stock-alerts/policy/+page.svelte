<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';

	type SettingsDto = {
		hospitalId: string;
		defaultExpiringSoonDays: number;
		emailLowStock: boolean;
		emailExpired: boolean;
		emailExpiringSoon: boolean;
		emailMinGapMinutes: number;
		inAppMinGapMinutes: number;
	};

	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	let bundleLoading = $state(false);
	let bundleError = $state<string | null>(null);

	let defaultExpiringSoonDaysStr = $state('30');
	let emailLowStock = $state(false);
	let emailExpired = $state(false);
	let emailExpiringSoon = $state(false);
	let emailMinGapStr = $state('360');
	let inAppMinGapStr = $state('360');
	let savingAll = $state(false);

	function apiBase() {
		return `/api/medora/hospital/${hospitalId}/home/inventory-setup/stock-alerts`;
	}

	function syncFormFromSettings(s: SettingsDto) {
		defaultExpiringSoonDaysStr = String(s.defaultExpiringSoonDays);
		emailLowStock = s.emailLowStock;
		emailExpired = s.emailExpired;
		emailExpiringSoon = s.emailExpiringSoon;
		emailMinGapStr = String(s.emailMinGapMinutes);
		inAppMinGapStr = String(s.inAppMinGapMinutes);
	}

	async function loadBundle() {
		if (!hospitalId) return;
		bundleLoading = true;
		bundleError = null;
		try {
			const res = await fetch(apiBase(), {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Load failed (${res.status})`);
			}
			const b = (await res.json()) as { settings: SettingsDto };
			syncFormFromSettings(b.settings);
		} catch (e) {
			bundleError = e instanceof Error ? e.message : 'Load failed';
		} finally {
			bundleLoading = false;
		}
	}

	async function saveSettingsOnly() {
		if (!hospitalId || savingAll) return;
		const days = Number(defaultExpiringSoonDaysStr);
		const em = Number(emailMinGapStr);
		const ia = Number(inAppMinGapStr);
		if (!Number.isFinite(days) || days < 1 || days > 365) {
			toastService.addToast(
				m.inv_stock_alert_invalid_days(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (
			!Number.isFinite(em) ||
			em < 1 ||
			!Number.isFinite(ia) ||
			ia < 1
		) {
			toastService.addToast(
				m.inv_stock_alert_invalid_gap(),
				StatusColorEnum.ERROR
			);
			return;
		}
		savingAll = true;
		try {
			const res = await fetch(apiBase(), {
				method: 'PUT',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					settings: {
						defaultExpiringSoonDays: Math.floor(days),
						emailLowStock,
						emailExpired,
						emailExpiringSoon,
						emailMinGapMinutes: Math.floor(em),
						inAppMinGapMinutes: Math.floor(ia)
					}
				})
			});
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Save failed (${res.status})`);
			}
			const b = (await res.json()) as { settings: SettingsDto };
			syncFormFromSettings(b.settings);
			toastService.addToast(
				m.inv_stock_alert_saved(),
				StatusColorEnum.SUCCESS
			);
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Save failed',
				StatusColorEnum.ERROR
			);
		} finally {
			savingAll = false;
		}
	}

	$effect(() => {
		void hospitalId;
		void loadBundle();
	});
</script>

<div class="space-y-6">
	<div class="space-y-1">
		<h1 class="text-lg font-semibold">{m.inv_stock_alert_title()}</h1>
		<p class="text-sm opacity-70">{m.inv_stock_alert_subtitle()}</p>
	</div>

	{#if bundleError}
		<div class="alert alert-error">
			<span>{bundleError}</span>
		</div>
	{/if}

	<WashCard>
		<WashCardBody className="space-y-4">
			<h2 class="text-base font-semibold">
				{m.inv_stock_alert_section_policy()}
			</h2>
			<p class="text-xs opacity-70">
				{m.inv_stock_alert_policy_hint()}
			</p>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<div class="space-y-1">
					<label for="sa-days" class="font-semibold">
						{m.inv_stock_alert_default_expiring_days()}
					</label>
					<WashInputField
						id="sa-days"
						bind:value={defaultExpiringSoonDaysStr}
						inputType="number"
						inputPlaceholderText="30"
						disabled={bundleLoading || savingAll}
					/>
				</div>
				<div class="space-y-1">
					<label for="sa-ingap" class="font-semibold">
						{m.inv_stock_alert_in_app_gap()}
					</label>
					<WashInputField
						id="sa-ingap"
						bind:value={inAppMinGapStr}
						inputType="number"
						inputPlaceholderText="360"
						disabled={bundleLoading || savingAll}
					/>
				</div>
				<div class="space-y-1">
					<label for="sa-emgap" class="font-semibold">
						{m.inv_stock_alert_email_gap()}
					</label>
					<WashInputField
						id="sa-emgap"
						bind:value={emailMinGapStr}
						inputType="number"
						inputPlaceholderText="360"
						disabled={bundleLoading || savingAll}
					/>
				</div>
			</div>
			<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
				<label class="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						class="checkbox checkbox-sm"
						bind:checked={emailLowStock}
						disabled={bundleLoading || savingAll}
					/>
					<span class="text-sm">{m.inv_stock_alert_email_low()}</span>
				</label>
				<label class="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						class="checkbox checkbox-sm"
						bind:checked={emailExpired}
						disabled={bundleLoading || savingAll}
					/>
					<span class="text-sm"
						>{m.inv_stock_alert_email_expired()}</span
					>
				</label>
				<label class="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						class="checkbox checkbox-sm"
						bind:checked={emailExpiringSoon}
						disabled={bundleLoading || savingAll}
					/>
					<span class="text-sm">{m.inv_stock_alert_email_soon()}</span
					>
				</label>
			</div>
			<p class="text-xs text-warning/90">
				{m.inv_stock_alert_policy_email_channels()}
			</p>
			<WashButton
				type="button"
				className="btn-primary btn-sm"
				disabled={bundleLoading || savingAll}
				loading={savingAll}
				onClick={() => void saveSettingsOnly()}
			>
				{m.inv_stock_alert_save_policy()}
			</WashButton>
		</WashCardBody>
	</WashCard>
</div>
