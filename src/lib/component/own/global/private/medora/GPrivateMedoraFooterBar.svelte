<script lang="ts">
	import { afterNavigate, invalidate, invalidateAll } from '$app/navigation';
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
	import SessionExpiryWarningDialogContent from '$lib/component/own/snippet/modal/SessionExpiryWarningDialogContent.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { sessionExtendMessageParams } from '$lib/util/session-extend-message.util';

	const msg = m as Record<string, (inputs?: object) => string>;
	const dateTimeUtil = new DateTimeUtil();
	const lifeCycleUtil = new LifeCycleUtil();
	const sessionExtendMsg = sessionExtendMessageParams();

	const SESSION_KEEPALIVE_MS = 5 * 60 * 1000;

	function expiryMs(iso: string | null | undefined): number {
		if (!iso) return Number.NaN;
		const ms = new Date(iso).getTime();
		return Number.isNaN(ms) ? Number.NaN : ms;
	}

	function applyExpiryFromServer(iso: string | null | undefined) {
		if (!iso) return;
		const nextMs = expiryMs(iso);
		if (Number.isNaN(nextMs)) return;
		const curMs = expiryMs(sessionExpiresAtLocal);
		if (Number.isNaN(curMs) || nextMs > curMs) {
			sessionExpiresAtLocal = iso;
		}
	}

	let time = $state('');
	let sessionLeft = $state('');
	let isExtending = $state(false);
	let expiryWarnDialogOpen = $state(false);

	const sessionData = $derived(
		(page.data as {
			sessionId?: string | null;
			sessionExpiresAt?: string | null;
		} | null) ?? null
	);
	const sessionId = $derived(sessionData?.sessionId ?? null);
	const sessionExpiresAtFromServer = $derived(
		sessionData?.sessionExpiresAt ?? null
	);
	let sessionExpiresAtLocal = $state<string | null>(null);
	const sessionExpiresAtEffective = $derived.by(() => {
		const a = sessionExpiresAtLocal;
		const b = sessionExpiresAtFromServer;
		const aMs = expiryMs(a);
		const bMs = expiryMs(b);
		if (Number.isNaN(aMs) && Number.isNaN(bMs)) return null;
		if (Number.isNaN(aMs)) return b;
		if (Number.isNaN(bMs)) return a;
		return aMs >= bMs ? a : b;
	});

	const extendDisabled = $derived(isExtending);

	$effect(() => {
		void sessionId;
		sessionExpiresAtLocal = null;
	});

	function sessionWarnStorageKey(sid: string) {
		return `medora_session_warn_${sid}`;
	}

	function clearSessionWarnFlags(sid: string) {
		try {
			sessionStorage.removeItem(sessionWarnStorageKey(sid));
		} catch {
			/* private mode */
		}
	}

	function updateTime() {
		const now = new Date();

		const h = String(now.getHours()).padStart(2, '0');
		const mins = String(now.getMinutes()).padStart(2, '0');
		const s = String(now.getSeconds()).padStart(2, '0');

		time = `${h}:${mins}:${s}`;
	}

	async function pingSessionKeepalive() {
		if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
			return;
		}
		if (!sessionId) return;
		try {
			const res = await fetch('/api/session/status', {
				credentials: 'include'
			});
			if (!res.ok) return;
			const data = (await res.json()) as { expiresAt?: string | null };
			if (data.expiresAt) {
				applyExpiryFromServer(data.expiresAt);
				await invalidate('app:session-expiry');
			}
		} catch {
			/* network */
		}
	}

	async function maybeShowExpiryWarning(totalSeconds: number) {
		const sid = sessionId;
		if (!sid || isExtending || expiryWarnDialogOpen) return;
		if (totalSeconds > AppEnum.SESSION_EXPIRY_WARN_SECONDS) return;

		try {
			if (sessionStorage.getItem(sessionWarnStorageKey(sid))) return;
			sessionStorage.setItem(sessionWarnStorageKey(sid), '1');
		} catch {
			return;
		}

		expiryWarnDialogOpen = true;
		try {
			const result = await dialogService.open<{ action?: string }>({
				title: msg.session_expire_warn_title(),
				variant: DialogVariantEnum.CONFIRM,
				tone: 'secondary',
				component: SessionExpiryWarningDialogContent,
				modalClassName: 'max-w-md w-[95vw]'
			});
			if (result.confirmed && result.data?.action === 'extend') {
				await openExtendDialog();
			}
		} finally {
			expiryWarnDialogOpen = false;
		}
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
		void maybeShowExpiryWarning(totalSeconds);
	}

	$effect(() => {
		const expIso = sessionExpiresAtEffective;
		if (!expIso) {
			sessionLeft = '';
			return;
		}
		recomputeSessionLeft(expIso);
		const id = setInterval(() => {
			recomputeSessionLeft(sessionExpiresAtEffective);
		}, 1000);
		return () => clearInterval(id);
	});

	async function openExtendDialog() {
		if (!sessionId || isExtending) return;
		isExtending = true;
		try {
			const result = await dialogService.open<SessionExtendDialogResult>({
				title: msg.session_extend_title(),
				description: msg.session_extend_description(sessionExtendMsg),
				component: SessionExtendPasswordDialogContent,
				modalClassName: 'max-w-md w-[95vw]'
			});
			if (!result.confirmed || !result.data?.sessionExpiresAt) return;

			sessionExpiresAtLocal = result.data.sessionExpiresAt;
			recomputeSessionLeft(result.data.sessionExpiresAt);
			clearSessionWarnFlags(sessionId);
			await invalidate('app:session-expiry');
			await invalidateAll();
		} finally {
			isExtending = false;
		}
	}

	let clockInterval: ReturnType<typeof setInterval> | undefined;
	let keepaliveInterval: ReturnType<typeof setInterval> | undefined;

	function onVisibilityChange() {
		if (document.visibilityState === 'visible') {
			void pingSessionKeepalive();
		}
	}

	lifeCycleUtil.onMount(() => {
		updateTime();
		clockInterval = setInterval(updateTime, 1000);
		void pingSessionKeepalive();
		keepaliveInterval = setInterval(
			() => void pingSessionKeepalive(),
			SESSION_KEEPALIVE_MS
		);
		document.addEventListener('visibilitychange', onVisibilityChange);
	});

	afterNavigate(() => {
		void pingSessionKeepalive();
	});

	lifeCycleUtil.onDestroy(() => {
		if (clockInterval) clearInterval(clockInterval);
		if (keepaliveInterval) clearInterval(keepaliveInterval);
		document.removeEventListener('visibilitychange', onVisibilityChange);
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
					{msg.session_extend_button(sessionExtendMsg)}
				</WashButton>
			</div>
		{/if}
	</div>

	<div id="version" class="mr-12">{m.version()} v{APP_VERSION}</div>
</WashFooter>
