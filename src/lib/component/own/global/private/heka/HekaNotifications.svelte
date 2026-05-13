<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	import DaisyUiModal from '$lib/component/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiModalBox from '$lib/component/daisyui/modal/box/DaisyUiModalBox.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiAlert from '$lib/component/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiIndicator from '$lib/component/daisyui/indicator/DaisyUiIndicator.svelte';
	import DaisyUiIndicatorItem from '$lib/component/daisyui/indicator/item/DaisyUiIndicatorItem.svelte';

	import LucideBell from '$lib/component/own/library/lucide/LucideBell.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';

	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';

	import { StatusColorEnum } from '$lib/model/enum/color.enum';

	type NotificationListItem = {
		id: number;
		eventType: string;
		severity: string;
		title: string | null;
		message: string;
		createdAt: string;
		readAt: string | null;
		hospitalId: string | null;
		visitId: number | null;
		referHistoryId: number | null;
		link: string | null;
	};

	let {
		hospitalId: hospitalIdProp = undefined,
		triggerClassName = ''
	}: { hospitalId?: string | null; triggerClassName?: string } =
		$props();

	const routeHospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? (page.params.hospital_id as string)
			: null
	);
	const effectiveHospitalId = $derived(
		hospitalIdProp !== undefined ? hospitalIdProp : routeHospitalId
	);

	const lifeCycleUtil = new LifeCycleUtil();
	const routerUtil = new RouterUtil();

	let unreadCount = $state(0);

	let modalOpen = $state(false);
	let modalLoading = $state(false);
	let modalPage = $state(1);
	let modalPageSize = $state(10);
	let modalTotalPages = $state(1);
	let modalItems = $state<NotificationListItem[]>([]);
	let prevHospitalId: string | null = $state(null);

	/** Poll unread count so the badge updates without full page reload. */
	const UNREAD_POLL_MS = 30_000;

	const severityToBadgeClass: Record<string, string> = {
		success: 'd-badge-success',
		info: 'd-badge-info',
		warning: 'd-badge-warning',
		error: 'd-badge-error'
	};

	function clampCount(n: number) {
		return n > 99 ? '99+' : String(n);
	}

	async function refreshUnreadCount() {
		try {
			const r = await fetch(
				'/api/heka/notification?mode=unreadCount'
			);
			if (!r.ok) throw new Error('unread count failed');
			const j = (await r.json()) as { count?: number };
			unreadCount = j.count ?? 0;
		} catch {
			unreadCount = 0;
		}
	}

	/** Badge + open modal list stay in sync when new notifications arrive. */
	async function refreshUnreadAndMaybeModal() {
		await refreshUnreadCount();
		if (modalOpen) {
			await loadModalPage(modalPage);
		}
	}

	async function openModalAndLoad() {
		modalOpen = true;
		modalPage = 1;
		await loadModalPage(1);
	}

	async function loadModalPage(pageNumber: number) {
		modalLoading = true;
		try {
			const qs = new URLSearchParams({
				mode: 'list',
				page: String(pageNumber),
				pageSize: String(modalPageSize),
				read: 'all'
			});
			const r = await fetch(`/api/heka/notification?${qs}`);
			if (!r.ok) throw new Error('list failed');
			const res = (await r.json()) as {
				data: NotificationListItem[];
				totalPages: number;
			};
			modalItems = res.data;
			modalTotalPages = res.totalPages;
			modalPage = pageNumber;
		} catch {
			modalItems = [];
			modalTotalPages = 1;
			modalPage = pageNumber;
		} finally {
			modalLoading = false;
		}
	}

	function getSeverityBadgeClass(severity: string) {
		return severityToBadgeClass[severity] ?? 'd-badge-info';
	}

	/** Locale-aware date + time from API ISO string. */
	function formatNotificationDateTime(iso: string): string {
		const t = Date.parse(iso);
		if (!Number.isFinite(t)) return '';
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(t));
	}

	async function handleNotificationClick(item: NotificationListItem) {
		try {
			await fetch('/api/heka/notification', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mode: 'markRead', id: item.id })
			});
		} catch {
			// ignore; we still refresh best-effort
		}

		await refreshUnreadCount();

		if (modalOpen) {
			await loadModalPage(modalPage);
		}

		// Route known refer notifications
		let finalLink = item.link;
		if (item.visitId != null) {
			if (finalLink) {
				const url = new URL(finalLink, window.location.origin);
				url.searchParams.set('visitId', String(item.visitId));
				finalLink = url.pathname + url.search;
			} else if (item.eventType.startsWith('REFER_')) {
				VisitState.visitId = String(item.visitId);
			}
		}

		if (!finalLink) return;
		closeNotificationsModal();
		routerUtil.goToRoute(finalLink);
	}

	async function handleMarkAllRead() {
		try {
			await fetch('/api/heka/notification', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mode: 'markAllRead' })
			});
		} finally {
			await refreshUnreadCount();
			if (modalOpen) await loadModalPage(modalPage);
		}
	}

	function closeNotificationsModal() {
		modalOpen = false;
	}

	// Initial load + polling + tab visibility (badge stays fresh without WebSockets)
	let mounted = $state(false);
	let pollIntervalId: ReturnType<typeof setInterval> | null = null;

	function onDocumentVisibilityChange() {
		if (typeof document === 'undefined') return;
		if (document.visibilityState === 'visible') {
			void refreshUnreadAndMaybeModal();
		}
	}

	lifeCycleUtil.onMount(() => {
		mounted = true;
		prevHospitalId = effectiveHospitalId ?? null;
		void refreshUnreadCount();

		pollIntervalId = setInterval(() => {
			if (typeof document === 'undefined') return;
			if (document.visibilityState !== 'visible') return;
			void refreshUnreadAndMaybeModal();
		}, UNREAD_POLL_MS);

		document.addEventListener(
			'visibilitychange',
			onDocumentVisibilityChange
		);
	});

	lifeCycleUtil.onDestroy(() => {
		if (pollIntervalId != null) {
			clearInterval(pollIntervalId);
			pollIntervalId = null;
		}
		if (typeof document !== 'undefined') {
			document.removeEventListener(
				'visibilitychange',
				onDocumentVisibilityChange
			);
		}
	});

	afterNavigate(() => {
		void refreshUnreadAndMaybeModal();
	});

	$effect(() => {
		if (!mounted) return;
		const hid = effectiveHospitalId ?? null;
		if (hid === prevHospitalId) return;
		prevHospitalId = hid;
		void refreshUnreadCount();
	});
</script>

<div class="z-50 overflow-visible">
	<!-- indicator-item must come first (DaisyUI); overflow-visible avoids clipping the badge on d-btn-circle -->
	<DaisyUiButton
		className={`d-btn-circle overflow-visible ${triggerClassName}`.trim()}
		onClick={() => void openModalAndLoad()}
	>
		<DaisyUiIndicator className="relative overflow-visible">
			{#if unreadCount > 0}
				<DaisyUiIndicatorItem
					className="d-badge d-badge-sm d-badge-error border-0 text-[10px] leading-none"
				>
					{clampCount(unreadCount)}
				</DaisyUiIndicatorItem>
			{/if}
			<LucideBell className="size-6" />
		</DaisyUiIndicator>
	</DaisyUiButton>
</div>

<DaisyUiModal
	groupName="heka-notifications-modal"
	className="d-modal-middle"
	open={modalOpen}
	onClose={closeNotificationsModal}
>
	<DaisyUiModalBox className="max-w-2xl" showCloseButton={false}>
		<div
			class="flex items-center justify-between gap-3 border-b border-base-300 pb-3"
		>
			<div class="min-w-0 flex-1 pe-2">
				<h3 class="text-lg leading-tight font-semibold">
					Notifications
				</h3>
				<p class="mt-0.5 text-sm leading-snug text-base-content/60">
					{modalItems.length} items
				</p>
			</div>

			<div class="flex shrink-0 items-center gap-1 sm:gap-2">
				<DaisyUiButton
					className="d-btn-ghost d-btn-sm whitespace-nowrap"
					disabled={modalLoading || unreadCount === 0}
					onClick={handleMarkAllRead}
				>
					Mark all as read
				</DaisyUiButton>
				<DaisyUiButton
					className="d-btn-ghost d-btn-sm d-btn-square shrink-0"
					onClick={closeNotificationsModal}
					type="button"
				>
					<span class="sr-only">Close notifications</span>
					<LucideX className="size-5" />
				</DaisyUiButton>
			</div>
		</div>

		<div class="mt-4 flex flex-col gap-3">
			{#if modalLoading}
				<div class="text-sm text-base-content/60">Loading...</div>
			{:else if modalItems.length === 0}
				<DaisyUiAlert
					type={StatusColorEnum.INFO}
					message="No notifications."
				/>
			{:else}
				<div class="flex flex-col gap-2">
					{#each modalItems as item (item.id)}
						{@const createdLabel = formatNotificationDateTime(
							item.createdAt
						)}
						<DaisyUiButton
							className="d-btn-ghost d-btn-sm h-auto justify-start gap-3 whitespace-normal py-2 px-3"
							onClick={() => handleNotificationClick(item)}
						>
							<span
								class={`d-badge d-badge-sm ${getSeverityBadgeClass(
									item.severity
								)}`}
							></span>
							<div
								class="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
							>
								<span class="font-medium">
									{item.title ?? 'Notification'}
								</span>
								<span class="text-xs opacity-70">
									{item.message}
								</span>
								{#if createdLabel}
									<span
										class="text-xs text-base-content/50 tabular-nums"
									>
										{createdLabel}
									</span>
								{/if}
							</div>
							{#if item.readAt == null}
								<span class="ms-auto h-2 w-2 rounded-full bg-error"
								></span>
							{/if}
						</DaisyUiButton>
					{/each}
				</div>
			{/if}

			{#if modalTotalPages > 1}
				<div class="flex items-center justify-between pt-2">
					<DaisyUiButton
						className="d-btn-ghost d-btn-sm"
						disabled={modalPage <= 1 || modalLoading}
						onClick={() => loadModalPage(modalPage - 1)}
					>
						Prev
					</DaisyUiButton>
					<span class="text-sm text-base-content/60">
						Page {modalPage} / {modalTotalPages}
					</span>
					<DaisyUiButton
						className="d-btn-ghost d-btn-sm"
						disabled={modalPage >= modalTotalPages || modalLoading}
						onClick={() => loadModalPage(modalPage + 1)}
					>
						Next
					</DaisyUiButton>
				</div>
			{/if}
		</div>
	</DaisyUiModalBox>
</DaisyUiModal>
