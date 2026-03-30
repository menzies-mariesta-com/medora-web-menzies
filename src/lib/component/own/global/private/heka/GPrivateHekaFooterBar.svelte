<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import DaisyUiFooter from '$lib/component/daisyui/footer/DaisyUiFooter.svelte';
	import LucideCopyright from '$lib/component/own/library/lucide/LucideCopyright.svelte';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { APP_VERSION } from '$lib/version';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';

	const dateTimeUtil = new DateTimeUtil();
	const lifeCycleUtil = new LifeCycleUtil();

	let time = $state('');
	let sessionLeft = $state('');
	let isExtending = $state(false);
	let extendError = $state<string | null>(null);
	/** Until `invalidateAll` finishes, keep button disabled after a successful extend. */
	let extendedLocally = $state(false);

	const sessionData = $derived(
		(page.data as
			| {
					sessionId?: string | null;
					sessionExpiresAt?: string | null;
					sessionExtendedOnce?: boolean;
			  }
			| null) ?? null
	);
	const sessionId = $derived(sessionData?.sessionId ?? null);
	const sessionExtendedOnce = $derived(!!sessionData?.sessionExtendedOnce);
	const sessionExpiresAtFromServer = $derived(sessionData?.sessionExpiresAt ?? null);
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
		extendError = null;
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

	async function extendSessionOnce() {
		if (!sessionId || extendDisabled) return;
		isExtending = true;
		extendError = null;
		try {
			const res = await fetch('/api/session/extend', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'content-type': 'application/json',
					'x-heka-ui-session-extend': '1'
				}
			});
			if (!res.ok) {
				const text = await res.text().catch(() => '');
				throw new Error(text || `Extend failed: ${res.status}`);
			}
			const data = (await res.json()) as {
				sessionExpiresAt?: string;
			};
			if (data.sessionExpiresAt) {
				sessionExpiresAtOverride = data.sessionExpiresAt;
				recomputeSessionLeft(data.sessionExpiresAt);
			}
			extendedLocally = true;
			await invalidateAll();
			sessionExpiresAtOverride = null;
		} catch (e) {
			extendError = e instanceof Error ? e.message : 'Failed to extend session';
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

<DaisyUiFooter
	className="bg-base-200  px-5 py-2 flex items-center justify-between"
>
	<div id="copyright" class="flex items-center gap-3">
		<div class="flex items-center">
			<LucideCopyright />
			{dateTimeUtil.getCurrentYear()}
			{m.heka()}. {m.all_rights_reserved()}
		</div>
	</div>

	<div id="time" class="flex flex-wrap items-center gap-x-12 gap-y-2">
		<div class="flex items-center gap-2">
			<span class="text-sm font-semibold text-base-content/70">
				Clock:
			</span>
			<span class="font-mono text-sm tabular-nums">{time}</span>
		</div>

		{#if sessionExpiresAtEffective}
			<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
				<span class="text-sm font-semibold text-base-content/70">
					Session left: <span class="font-mono tabular-nums">{sessionLeft || '—'}</span>
				</span>
				<DaisyUiButton
					className="d-btn d-btn-xs d-btn-outline"
					disabled={extendDisabled}
					onClick={() => void extendSessionOnce()}
				>
					{isExtending ? 'Extending...' : 'Extend +2h'}
				</DaisyUiButton>
				{#if extendError}
					<span class="text-xs text-error" role="alert">{extendError}</span>
				{/if}
			</div>
		{/if}
	</div>

	<div id="version" class="mr-12">{m.version()} v{APP_VERSION}</div>
</DaisyUiFooter>
