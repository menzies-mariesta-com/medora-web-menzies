<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import WashFooter from '$lib/component/wash/footer/WashFooter.svelte';
	import LucideCopyright from '$lib/component/own/library/lucide/LucideCopyright.svelte';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { APP_VERSION } from '$lib/version';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import SessionExtendPasswordDialogContent, {
		type SessionExtendDialogResult
	} from '$lib/component/own/snippet/modal/SessionExtendPasswordDialogContent.svelte';

	const msg = m as Record<string, (inputs?: object) => string>;
	const dateTimeUtil = new DateTimeUtil();
	const lifeCycleUtil = new LifeCycleUtil();

	let time = $state('');
	let sessionLeft = $state('');
	let isExtending = $state(false);
	/** Until `invalidateAll` finishes, keep button disabled after a successful extend. */
	let extendedLocally = $state(false);

	const sessionData = $derived(
		(page.data as {
			sessionId?: string | null;
			sessionExpiresAt?: string | null;
			sessionExtendedOnce?: boolean;
		} | null) ?? null
	);
	const sessionId = $derived(sessionData?.sessionId ?? null);
	const sessionExtendedOnce = $derived(
		!!sessionData?.sessionExtendedOnce
	);
	const sessionExpiresAtFromServer = $derived(
		sessionData?.sessionExpiresAt ?? null
	);
	/** Client-side expiry after a successful extend (until next full load sync). */
	let sessionExpiresAtOverride = $state<string | null>(null);
	const sessionExpiresAtEffective = $derived(
		sessionExpiresAtOverride ?? sessionExpiresAtFromServer ?? null
	);

	const extendDisabled = $derived(
		isExtending || sessionExtendedOnce || extendedLocally
	);

	$effect(() => {
		void sessionId;
		sessionExpiresAtOverride = null;
		extendedLocally = false;
	});

	function updateTime() {
		const now = new Date();

		const h = String(now.getHours()).padStart(2, '0');
		const mins = String(now.getMinutes()).padStart(2, '0');
		const s = String(now.getSeconds()).padStart(2, '0');

		time = `${h}:${mins}:${s}`;
	}

	function recomputeSessionLeft(expIso: string | null) {
		if (!expIso) {
			sessionLeft = '';
			return;
		}
		const expMs = new Date(expIso).getTime();
		if (Number.isNaN(expMs)) {
			sessionLeft = '';
			return;
		}
		const ms = Math.max(0, expMs - Date.now());
		const totalSeconds = Math.floor(ms / 1000);
		const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
		const ss = String(totalSeconds % 60).padStart(2, '0');
		sessionLeft = `${mm}:${ss}`;
	}

	$effect(() => {
		const expIso = sessionExpiresAtEffective;
		if (!expIso) {
			sessionLeft = '';
			return;
		}
		recomputeSessionLeft(expIso);
		const id = setInterval(() => recomputeSessionLeft(expIso), 1000);
		return () => clearInterval(id);
	});

	async function openExtendDialog() {
		if (!sessionId || extendDisabled) return;
		isExtending = true;
		try {
			const result = await dialogService.open<SessionExtendDialogResult>({
				title: msg.session_extend_title(),
				description: msg.session_extend_description(),
				component: SessionExtendPasswordDialogContent,
				modalClassName: 'max-w-md w-[95vw]'
			});
			if (!result.confirmed || !result.data?.sessionExpiresAt) return;

			sessionExpiresAtOverride = result.data.sessionExpiresAt;
			recomputeSessionLeft(result.data.sessionExpiresAt);
			extendedLocally = true;
			await invalidateAll();
			sessionExpiresAtOverride = null;
		} finally {
			isExtending = false;
		}
	}

	let interval: ReturnType<typeof setInterval> | undefined;

	lifeCycleUtil.onMount(() => {
		updateTime();
		interval = setInterval(() => {
			updateTime();
		}, 1000);
	});

	lifeCycleUtil.onDestroy(() => {
		if (interval) clearInterval(interval);
	});
</script>

<WashFooter
	className="border-t border-base-300/80 bg-base-200/90 px-5 py-2 flex items-center justify-between backdrop-blur-sm"
>
	<div id="copyright" class="flex items-center gap-3">
		<div class="flex items-center">
			<LucideCopyright />
			{dateTimeUtil.getCurrentYear()}
			{m.menzies_medora()}. {msg.brand_care_software_by_menzies()}
		</div>
	</div>

	<div id="time" class="flex flex-wrap items-center gap-x-12 gap-y-2">
		<div class="flex items-center gap-2">
			<span class="text-sm font-semibold text-base-content/70">
				{msg.session_extend_clock_label()}:
			</span>
			<span class="font-mono text-sm tabular-nums">{time}</span>
		</div>

		{#if sessionExpiresAtEffective}
			<div
				class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2"
			>
				<span class="text-sm font-semibold text-base-content/70">
					{msg.session_extend_left_label()}:
					<span class="font-mono tabular-nums"
						>{sessionLeft || '-'}</span
					>
				</span>
				<WashButton
					className="btn btn-xs btn-outline cursor-pointer"
					disabled={extendDisabled}
					loading={isExtending}
					onClick={() => void openExtendDialog()}
				>
					{msg.session_extend_button()}
				</WashButton>
			</div>
		{/if}
	</div>

	<div id="version" class="mr-12">{m.version()} v{APP_VERSION}</div>
</WashFooter>
