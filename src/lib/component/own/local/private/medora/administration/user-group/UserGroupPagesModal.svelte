<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import type {
		MedoraPageModuleRow,
		MedoraPageRow
	} from '$lib/model/type/medora/page.type';
	import { pageActionsFor } from '$lib/model/const/page-action-catalog.const';
	import {
		PageActionEnum,
		isPageAction
	} from '$lib/model/enum/page-action.enum';
	import { UserGroupPagesModalState } from '$lib/state/user-group-pages-modal.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();

	let allPages = $state<MedoraPageRow[]>([]);
	let allModules = $state<MedoraPageModuleRow[]>([]);
	/** pageId → granted actions. One row per page keeps the matrix simple. */
	let grants = $state<Record<number, PageActionEnum[]>>({});
	let isSaving = $state(false);
	let loaded = $state(false);
	let searchText = $state('');

	const group = $derived(UserGroupPagesModalState.group);

	const ACTIONS = Object.values(PageActionEnum);
	const ACTION_LABEL: Record<PageActionEnum, string> = {
		[PageActionEnum.VIEW]: 'View',
		[PageActionEnum.CREATE]: 'Create',
		[PageActionEnum.EDIT]: 'Edit',
		[PageActionEnum.DELETE]: 'Delete',
		[PageActionEnum.APPROVE]: 'Approve',
		[PageActionEnum.CANCEL]: 'Cancel',
		[PageActionEnum.ISSUE]: 'Issue',
		[PageActionEnum.RECEIVE]: 'Receive',
		[PageActionEnum.PRINT]: 'Print',
		[PageActionEnum.EXPORT]: 'Export',
		[PageActionEnum.UPLOAD]: 'Upload'
	};

	function apiUrl(hospitalId: string): string {
		return `/api/medora/hospital/${hospitalId}/home/administration/user-group`;
	}

	const moduleNameById = $derived.by(() => {
		const map = new Map<number, string>();
		for (const mod of allModules) {
			map.set(mod.id, mod.name ?? mod.moduleUrl ?? 'Module');
		}
		return map;
	});

	const pageById = $derived.by(() => {
		const map = new Map<number, MedoraPageRow>();
		for (const p of allPages) map.set(p.id, p);
		return map;
	});

	const depthByPageId = $derived.by(() => {
		const depthMap = new Map<number, number>();
		for (const p of allPages) {
			let depth = 0;
			let cursor = p.parentId;
			const guard = new Set<number>();
			while (cursor != null && !guard.has(cursor)) {
				guard.add(cursor);
				depth += 1;
				cursor = pageById.get(cursor)?.parentId ?? null;
			}
			depthMap.set(p.id, depth);
		}
		return depthMap;
	});

	const sortedPages = $derived.by(() =>
		[...allPages].sort((a, b) => {
			const moduleA = a.moduleId ?? Number.MAX_SAFE_INTEGER;
			const moduleB = b.moduleId ?? Number.MAX_SAFE_INTEGER;
			if (moduleA !== moduleB) return moduleA - moduleB;
			const rootA = a.parentId == null ? 0 : 1;
			const rootB = b.parentId == null ? 0 : 1;
			if (rootA !== rootB) return rootA - rootB;
			const seq = (a.sequenceNo ?? 0) - (b.sequenceNo ?? 0);
			if (seq !== 0) return seq;
			return a.id - b.id;
		})
	);

	/** Search keeps ancestors and descendants of a hit so the tree stays readable. */
	const filteredPages = $derived.by(() => {
		const term = searchText.trim().toLowerCase();
		if (!term) return sortedPages;

		const directMatches = new Set<number>();
		for (const p of allPages) {
			const name = (p.name ?? '').toLowerCase();
			const url = (p.pageUrl ?? '').toLowerCase();
			const parentName =
				p.parentId != null
					? (pageById.get(p.parentId)?.name ?? '').toLowerCase()
					: '';
			const moduleName =
				(p.moduleId != null
					? moduleNameById.get(p.moduleId)
					: 'Other'
				)?.toLowerCase() ?? '';
			if (
				name.includes(term) ||
				url.includes(term) ||
				moduleName.includes(term) ||
				parentName.includes(term)
			) {
				directMatches.add(p.id);
			}
		}

		const expanded = new Set<number>(directMatches);
		let changed = true;
		while (changed) {
			changed = false;
			for (const p of allPages) {
				if (
					expanded.has(p.id) &&
					p.parentId != null &&
					!expanded.has(p.parentId)
				) {
					expanded.add(p.parentId);
					changed = true;
				}
				if (
					p.parentId != null &&
					expanded.has(p.parentId) &&
					!expanded.has(p.id)
				) {
					expanded.add(p.id);
					changed = true;
				}
			}
		}

		return sortedPages.filter((p) => expanded.has(p.id));
	});

	const modulesForSelection = $derived.by(() => {
		const moduleIds = new Set<number | null>();
		for (const p of allPages) moduleIds.add(p.moduleId ?? null);
		const sequenceById = new Map(
			allModules.map((mod) => [mod.id, mod.sequenceNo ?? 0])
		);
		const result: { id: number | null; name: string }[] = [];
		for (const id of moduleIds) {
			result.push({
				id,
				name:
					id === null ? 'Other' : (moduleNameById.get(id) ?? 'Module')
			});
		}
		// Natural module-bar order; the null ("Other") bucket always last.
		return result.sort((a, b) => {
			if (a.id === null) return 1;
			if (b.id === null) return -1;
			return (
				(sequenceById.get(a.id) ?? 0) - (sequenceById.get(b.id) ?? 0)
			);
		});
	});

	/** Module picked in the left column; `undefined` until one is chosen. */
	let selectedModuleId = $state<number | null | undefined>(undefined);

	/** A search hides every module without a hit, so the list follows `filteredPages`. */
	const visibleModules = $derived.by(() => {
		const withHits = new Set(
			filteredPages.map((p) => p.moduleId ?? null)
		);
		return modulesForSelection.filter((m) => withHits.has(m.id));
	});

	/** Falls back to the first visible module when the selected one is filtered out. */
	const activeModuleId = $derived(
		selectedModuleId !== undefined &&
			visibleModules.some((m) => m.id === selectedModuleId)
			? selectedModuleId
			: visibleModules[0]?.id
	);

	const activeModulePages = $derived(
		filteredPages.filter(
			(p) => (p.moduleId ?? null) === activeModuleId
		)
	);

	$effect(() => {
		const g = group;
		if (!g) return;
		let cancelled = false;
		loaded = false;
		(async () => {
			const hospitalId = g.hospitalId;
			if (!hospitalId) throw new Error('Hospital context is missing');

			const url = new URL(apiUrl(hospitalId), window.location.origin);
			url.searchParams.set('mode', 'pages');
			url.searchParams.set('userGroupId', String(g.id));

			const res = await fetch(url.toString(), {
				method: 'GET',
				headers: { accept: 'application/json' },
				cache: 'no-store',
				credentials: 'include'
			});
			const text = await res.text().catch(() => '');
			if (!res.ok) {
				throw new Error(
					text || `Request failed: ${res.status} ${res.statusText}`
				);
			}
			const parsed = text.trim()
				? (JSON.parse(text) as {
						pages: MedoraPageRow[];
						modules: MedoraPageModuleRow[];
						grants: { pageId: number; actions: string[] }[];
					})
				: { pages: [], modules: [], grants: [] };

			if (cancelled) return;
			allPages = parsed.pages ?? [];
			allModules = parsed.modules ?? [];
			const next: Record<number, PageActionEnum[]> = {};
			for (const grant of parsed.grants ?? []) {
				if (!Number.isFinite(grant.pageId)) continue;
				next[grant.pageId] = grant.actions.filter(isPageAction);
			}
			grants = next;
			loaded = true;
		})();
		return () => {
			cancelled = true;
		};
	});

	/** Actions this page actually exposes (catalog allowlist). */
	function actionsOffered(page: MedoraPageRow): PageActionEnum[] {
		return page.pageUrl ? pageActionsFor(page.pageUrl) : [];
	}

	function isChecked(
		pageId: number,
		action: PageActionEnum
	): boolean {
		return (grants[pageId] ?? []).includes(action);
	}

	function setAction(
		pageId: number,
		action: PageActionEnum,
		checked: boolean
	) {
		const current = grants[pageId] ?? [];
		let next = checked
			? [...current, action]
			: current.filter((a) => a !== action);
		// Any action implies view; dropping view drops everything else.
		if (checked && action !== PageActionEnum.VIEW) {
			if (!next.includes(PageActionEnum.VIEW))
				next = [PageActionEnum.VIEW, ...next];
		}
		if (!checked && action === PageActionEnum.VIEW) next = [];
		grants = { ...grants, [pageId]: next };
	}

	/** Page row select-all: every action the page offers, or none. */
	function togglePage(page: MedoraPageRow) {
		const offered = actionsOffered(page);
		const allOn = offered.every((a) => isChecked(page.id, a));
		setGrantForPages([page.id], offered, !allOn);
	}

	function setGrantForPages(
		pageIds: number[],
		actions: PageActionEnum[],
		checked: boolean
	) {
		const next = { ...grants };
		for (const pageId of pageIds) {
			next[pageId] = checked ? [...actions] : [];
		}
		grants = next;
	}

	function pagesInModule(moduleId: number | null): MedoraPageRow[] {
		return allPages.filter((p) => (p.moduleId ?? null) === moduleId);
	}

	function moduleState(moduleId: number | null) {
		const pages = pagesInModule(moduleId);
		const on = pages.filter(
			(p) => (grants[p.id]?.length ?? 0) > 0
		).length;
		return {
			total: pages.length,
			on,
			all: pages.length > 0 && on === pages.length
		};
	}

	function toggleModule(moduleId: number | null) {
		const pages = pagesInModule(moduleId);
		const state = moduleState(moduleId);
		const next = { ...grants };
		for (const page of pages) {
			next[page.id] = state.all ? [] : [...actionsOffered(page)];
		}
		grants = next;
	}

	/** Module header checkbox for one action: applies to every page offering it. */
	function moduleActionState(
		moduleId: number | null,
		action: PageActionEnum
	) {
		const pages = pagesInModule(moduleId).filter((p) =>
			actionsOffered(p).includes(action)
		);
		const on = pages.filter((p) => isChecked(p.id, action)).length;
		return {
			total: pages.length,
			on,
			all: pages.length > 0 && on === pages.length
		};
	}

	function toggleModuleAction(
		moduleId: number | null,
		action: PageActionEnum
	) {
		const pages = pagesInModule(moduleId).filter((p) =>
			actionsOffered(p).includes(action)
		);
		const state = moduleActionState(moduleId, action);
		const next = { ...grants };
		for (const page of pages) {
			const current = next[page.id] ?? [];
			let actions = state.all
				? current.filter((a) => a !== action)
				: current.includes(action)
					? current
					: [...current, action];
			if (!state.all && action !== PageActionEnum.VIEW) {
				if (!actions.includes(PageActionEnum.VIEW))
					actions = [PageActionEnum.VIEW, ...actions];
			}
			if (state.all && action === PageActionEnum.VIEW) actions = [];
			next[page.id] = actions;
		}
		grants = next;
	}

	async function handleSave() {
		const g = group;
		if (!g) return;
		isSaving = true;
		try {
			const hospitalId = g.hospitalId;
			if (!hospitalId) throw new Error('Hospital context is missing');

			const payload = Object.entries(grants)
				.filter(([, actions]) => actions.length > 0)
				.map(([pageId, actions]) => ({
					pageId: Number(pageId),
					actions
				}));
			const url = new URL(apiUrl(hospitalId), window.location.origin);
			url.searchParams.set('mode', 'pages');

			const res = await fetch(url.toString(), {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				cache: 'no-store',
				credentials: 'include',
				body: JSON.stringify({ userGroupId: g.id, grants: payload })
			});
			const text = await res.text().catch(() => '');
			if (!res.ok) {
				throw new Error(
					text || `Request failed: ${res.status} ${res.statusText}`
				);
			}
			toastSuccess(
				toastService,
				m.entity_user_group_page_access(),
				m.toast_action_updated()
			);
			confirm();
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : 'Failed to save';
			toastService.addToast(msg, StatusColorEnum.ERROR);
		} finally {
			isSaving = false;
		}
	}
</script>

<div
	class="flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-center overflow-hidden"
>
	{#if !loaded}
		<p class="py-4 text-base-content/70">Loading…</p>
	{:else}
		<WashCard
			className="min-h-0 min-w-0 w-full flex-1 flex flex-col overflow-hidden bg-base-200 shadow-sm"
		>
			<WashCardBody
				className="min-h-0 min-w-0 flex-1 gap-3 overflow-hidden p-4"
			>
				<div class="shrink-0">
					<WashInputField
						inputType="text"
						inputPlaceholderText="Search pages by name or URL…"
						bind:value={searchText}
						className="w-full"
					/>
				</div>

				{#if visibleModules.length === 0}
					<p class="py-6 text-center text-sm text-base-content/60">
						No page matches “{searchText.trim()}”.
					</p>
				{:else}
					<div
						class="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)]"
					>
						<nav
							class="rounded-box min-h-0 overflow-auto border border-base-300 bg-base-100"
							aria-label="Modules"
						>
							<ul class="w-full p-1">
								{#each visibleModules as mod (mod.id ?? 'other')}
									{@const state = moduleState(mod.id)}
									{@const active = mod.id === activeModuleId}
									<li
										class="rounded-box flex items-center gap-1 {active
											? 'bg-primary/10'
											: ''}"
									>
										<input
											type="checkbox"
											class="checkbox checkbox-sm ml-2 shrink-0"
											checked={state.all}
											indeterminate={state.on > 0 && !state.all}
											onchange={() => toggleModule(mod.id)}
											aria-label={`Toggle all pages in ${mod.name}`}
										/>
										<button
											type="button"
											class="rounded-box flex min-w-0 flex-1 items-center justify-between gap-2 px-2 py-2 text-left text-sm hover:bg-base-200 {active
												? 'font-semibold'
												: ''}"
											aria-current={active ? 'true' : undefined}
											onclick={() => (selectedModuleId = mod.id)}
										>
											<span class="truncate">{mod.name}</span>
											<span
												class="shrink-0 text-xs text-base-content/50"
											>
												{state.on}/{state.total}
											</span>
										</button>
									</li>
								{/each}
							</ul>
						</nav>

						<div class="min-h-0 min-w-0 overflow-auto">
							<table class="table-sm table w-full">
								<thead class="sticky top-0 z-10 bg-base-100">
									<tr>
										<th class="min-w-56">Page</th>
										{#each ACTIONS as action (action)}
											<th
												class="w-20 text-center text-xs font-semibold"
											>
												{ACTION_LABEL[action]}
											</th>
										{/each}
									</tr>
								</thead>
								<tbody>
									{#if activeModulePages.length > 1}
										<tr class="bg-base-200">
											<th scope="row" class="font-semibold">
												All pages in this module
											</th>
											{#each ACTIONS as action (action)}
												{@const offered = activeModulePages.some(
													(p) => actionsOffered(p).includes(action)
												)}
												{@const actionState = moduleActionState(
													activeModuleId ?? null,
													action
												)}
												<td class="text-center">
													{#if offered}
														<input
															type="checkbox"
															class="checkbox checkbox-sm"
															checked={actionState.all}
															indeterminate={actionState.on > 0 &&
																!actionState.all}
															onchange={() =>
																toggleModuleAction(
																	activeModuleId ?? null,
																	action
																)}
															aria-label={`${ACTION_LABEL[action]} for every page in this module`}
														/>
													{:else}
														<span class="text-base-content/30">—</span
														>
													{/if}
												</td>
											{/each}
										</tr>
									{/if}
									{#each activeModulePages as p (p.id)}
										{@const offered = actionsOffered(p)}
										{@const depth = depthByPageId.get(p.id) ?? 0}
										{@const pageOn = (grants[p.id]?.length ?? 0) > 0}
										<tr>
											<td>
												<div
													class="flex min-w-0 items-start gap-2"
													style={`padding-left: ${Math.min(depth, 6) * 0.9}rem`}
												>
													<input
														type="checkbox"
														class="checkbox checkbox-sm mt-0.5 shrink-0"
														checked={pageOn}
														onchange={() => togglePage(p)}
														aria-label={`Toggle all actions for ${p.name ?? 'page'}`}
													/>
													<span class="min-w-0">
														<span class="block break-words">
															{p.name ?? '—'}
														</span>
														<span
															class="block text-xs break-all text-base-content/50"
														>
															{p.pageUrl ?? ''}
														</span>
													</span>
												</div>
											</td>
											{#each ACTIONS as action (action)}
												<td class="text-center">
													{#if offered.includes(action)}
														<input
															type="checkbox"
															class="checkbox checkbox-sm"
															checked={isChecked(p.id, action)}
															onchange={(e) =>
																setAction(
																	p.id,
																	action,
																	(
																		e.currentTarget as HTMLInputElement
																	).checked
																)}
															aria-label={`${ACTION_LABEL[action]} on ${p.name ?? 'page'}`}
														/>
													{:else}
														<span class="text-base-content/30">—</span
														>
													{/if}
												</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			</WashCardBody>
		</WashCard>
		<WashDialogFooter className="gap-2">
			<WashButton
				type="button"
				className="btn-ghost"
				onClick={() => cancel()}
				disabled={isSaving}
			>
				Cancel
			</WashButton>
			<WashButton
				type="button"
				className="btn-primary"
				onClick={handleSave}
				disabled={isSaving}
			>
				{isSaving ? 'Saving…' : 'Save'}
			</WashButton>
		</WashDialogFooter>
	{/if}
</div>
