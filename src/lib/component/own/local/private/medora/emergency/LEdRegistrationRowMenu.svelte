<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import LucideMenu from '$lib/component/own/library/lucide/LucideMenu.svelte';
	import LEdAdmissionBedDialogContent from '$lib/component/own/local/private/medora/emergency/LEdAdmissionBedDialogContent.svelte';
	import LEdBillClearanceDialogContent from '$lib/component/own/local/private/medora/emergency/LEdBillClearanceDialogContent.svelte';
	import LEdDischargeDialogContent from '$lib/component/own/local/private/medora/emergency/LEdDischargeDialogContent.svelte';
	import LEdEditRegistrationDialogContent from '$lib/component/own/local/private/medora/emergency/LEdEditRegistrationDialogContent.svelte';
	import LEdMlcDocumentationDialogContent from '$lib/component/own/local/private/medora/emergency/LEdMlcDocumentationDialogContent.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import {
		medoraHospitalPageUrl,
		WebRoutesEnum
	} from '$lib/model/enum/routes.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { EdRegistrationListRow } from '$lib/model/type/medora/ed-admission.type';
	import { m } from '$lib/paraglide/messages';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { measureDropdownPlacement } from '@menzies-mariesta-com/menzies-design-wash-ui/core';

	const msg = m as Record<string, (inputs?: object) => string>;

	type Props = {
		row: EdRegistrationListRow;
		onRefresh?: () => void | Promise<void>;
	};

	let { row, onRefresh }: Props = $props();

	const routerUtil = new RouterUtil();
	const toastService = new ToastService();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const MENU_PANEL_WIDTH = 224;
	const MENU_PANEL_HEIGHT = 360;

	let menuOpen = $state(false);
	let rootEl = $state<HTMLDivElement | null>(null);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let panelEl = $state<HTMLDivElement | null>(null);
	let fixedPanelStyle = $state('');

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	}

	function updatePanelPosition() {
		const el = triggerEl;
		if (!el || typeof window === 'undefined') return;
		const placement = measureDropdownPlacement(el, {
			panelWidth: MENU_PANEL_WIDTH,
			panelHeight: MENU_PANEL_HEIGHT
		});
		const rect = el.getBoundingClientRect();
		const gap = 4;
		const maxH = Math.max(
			120,
			Math.min(MENU_PANEL_HEIGHT, Math.round(placement.maxHeight))
		);
		const parts: string[] = [
			`width:${MENU_PANEL_WIDTH}px`,
			`min-width:${MENU_PANEL_WIDTH}px`,
			`max-width:${MENU_PANEL_WIDTH}px`,
			`max-height:${maxH}px`
		];
		if (placement.top) {
			parts.push(`bottom:${window.innerHeight - rect.top + gap}px`);
			parts.push('top:auto');
		} else {
			parts.push(`top:${rect.bottom + gap}px`);
			parts.push('bottom:auto');
		}
		if (placement.end) {
			parts.push(`right:${window.innerWidth - rect.right}px`);
			parts.push('left:auto');
		} else {
			parts.push(`left:${rect.left}px`);
			parts.push('right:auto');
		}
		fixedPanelStyle = parts.join(';');
	}

	function openMenu() {
		menuOpen = true;
		queueMicrotask(() => updatePanelPosition());
	}

	function closeMenu() {
		menuOpen = false;
	}

	function toggleMenu() {
		if (menuOpen) closeMenu();
		else openMenu();
	}

	$effect(() => {
		if (!menuOpen) return;
		const onScroll = () => updatePanelPosition();
		const onResize = () => updatePanelPosition();
		const onDoc = (e: MouseEvent) => {
			const t = e.target as Node;
			if (rootEl?.contains(t) || panelEl?.contains(t)) return;
			closeMenu();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeMenu();
		};
		window.addEventListener('scroll', onScroll, true);
		window.addEventListener('resize', onResize);
		document.addEventListener('mousedown', onDoc, true);
		document.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('scroll', onScroll, true);
			window.removeEventListener('resize', onResize);
			document.removeEventListener('mousedown', onDoc, true);
			document.removeEventListener('keydown', onKey);
		};
	});

	async function runItem(run: () => void | Promise<void>) {
		closeMenu();
		await run();
	}

	function openTriage() {
		if (!hospitalId) return;
		routerUtil.goToRoute(
			`${medoraHospitalPageUrl(
				hospitalId,
				WebRoutesEnum.MEDORA_HOME_NURSING_WORKBENCH_TRIAGE
			)}?visitId=${encodeURIComponent(row.visitId)}`
		);
	}

	async function openAssignBed() {
		await dialogService.open({
			title: msg.ed_reg_menu_assign_bed?.() ?? 'Assign ER bed',
			component: LEdAdmissionBedDialogContent,
			props: {
				visitId: row.visitId,
				mode: 'assign',
				currentErBedId: row.erBedId,
				onDone: onRefresh
			}
		});
	}

	async function openTransferBed() {
		await dialogService.open({
			title: msg.ed_reg_menu_transfer_bed?.() ?? 'Transfer ER bed',
			component: LEdAdmissionBedDialogContent,
			props: {
				visitId: row.visitId,
				mode: 'transfer',
				currentErBedId: row.erBedId,
				onDone: onRefresh
			}
		});
	}

	async function openBillClearance() {
		await dialogService.open({
			title: msg.ed_reg_menu_bill_clearance?.() ?? 'Bill clearance',
			component: LEdBillClearanceDialogContent,
			props: {
				visitId: row.visitId,
				onClosed: onRefresh
			}
		});
	}

	async function openEditDetails() {
		const result = await dialogService.open({
			title: msg.ed_reg_menu_edit?.() ?? 'Edit registration',
			component: LEdEditRegistrationDialogContent,
			props: { visitId: row.visitId, onSaved: onRefresh }
		});
		if (result.confirmed) await onRefresh?.();
	}

	async function openMlcDocs() {
		await dialogService.open({
			title: msg.ed_reg_mlc_dialog_title?.() ?? 'MLC documentation',
			component: LEdMlcDocumentationDialogContent,
			props: { visitId: row.visitId }
		});
	}

	function openPurchaseItem() {
		if (!hospitalId) return;
		void goto(
			`${medoraHospitalPageUrl(
				hospitalId,
				WebRoutesEnum.MEDORA_HOME_EMERGENCY_PURCHASE_ITEM
			)}?visitId=${encodeURIComponent(row.visitId)}`
		);
	}

	function openConsumableOrder() {
		openPurchaseItem();
	}

	function openConsumableReturn() {
		if (!hospitalId) return;
		void goto(
			`${medoraHospitalPageUrl(
				hospitalId,
				'/medora/home/inventory/department-consumption/return/new' as const
			)}?visitId=${encodeURIComponent(row.visitId)}`
		);
	}

	async function openDischarge() {
		await dialogService.open({
			title: msg.ed_reg_discharge_title?.() ?? 'Discharge from ED',
			component: LEdDischargeDialogContent,
			props: {
				visitId: row.visitId,
				visitNo: row.visitNo,
				patientName: row.patientName,
				erBedLabel: row.erBedLabel,
				onDone: onRefresh
			}
		});
	}

	type MenuItem = {
		id: string;
		label: string;
		run: () => void | Promise<void>;
	};

	const items: MenuItem[] = $derived([
		{
			id: 'assign',
			label: msg.ed_reg_menu_assign_bed?.() ?? 'Admission / Assign bed',
			run: openAssignBed
		},
		{
			id: 'triage',
			label: msg.ed_admission_action_triage?.() ?? 'Triage',
			run: openTriage
		},
		{
			id: 'transfer',
			label: msg.ed_reg_menu_transfer_bed?.() ?? 'Bed transfer',
			run: openTransferBed
		},
		{
			id: 'bill',
			label: msg.ed_reg_menu_bill_clearance?.() ?? 'Bill clearance',
			run: openBillClearance
		},
		{
			id: 'discharge',
			label: msg.ed_reg_menu_discharge?.() ?? 'Discharge',
			run: openDischarge
		},
		{
			id: 'purchase',
			label: msg.ed_reg_menu_purchase_item?.() ?? 'Purchase item',
			run: openPurchaseItem
		},
		{
			id: 'consumable',
			label: msg.ed_reg_menu_consumable_order?.() ?? 'Drug consumable order',
			run: openConsumableOrder
		},
		{
			id: 'return',
			label: msg.ed_reg_menu_consumable_return?.() ?? 'Drug consumable return',
			run: openConsumableReturn
		},
		{
			id: 'edit',
			label: msg.ed_reg_menu_edit?.() ?? 'Edit details',
			run: openEditDetails
		},
		{
			id: 'mlc',
			label: msg.ed_reg_menu_mlc_docs?.() ?? 'MLC documentation',
			run: openMlcDocs
		}
	]);

	const menuLabel = $derived(msg.ed_reg_row_menu?.() ?? 'More actions');
</script>

<div
	class="menzies-table-icon-action-tip"
	data-tone="secondary"
	bind:this={rootEl}
>
	<button
		bind:this={triggerEl}
		type="button"
		class="btn btn-ghost btn-square btn-secondary btn-xs menzies-table-icon-action cursor-pointer"
		aria-label={menuLabel}
		aria-expanded={menuOpen}
		aria-haspopup="menu"
		onclick={() => toggleMenu()}
	>
		<span class="menzies-table-icon-action__glyph" aria-hidden="true">
			<LucideMenu className="size-3.5" />
		</span>
	</button>
	<span class="menzies-table-icon-action-tip__label" role="tooltip">
		{menuLabel}
	</span>
</div>

{#if menuOpen}
	<div
		use:portal
		bind:this={panelEl}
		class="menu fixed z-[10050] overflow-y-auto overscroll-contain rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
		style={fixedPanelStyle}
		role="menu"
	>
		<ul class="w-full p-0">
			{#each items as item (item.id)}
				<li>
					<button
						type="button"
						class="cursor-pointer"
						role="menuitem"
						onclick={() => void runItem(item.run)}
					>
						{item.label}
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}
