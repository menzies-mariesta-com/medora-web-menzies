<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import type {
		HekaPageModuleRow,
		HekaPageRow
	} from '$lib/model/type/heka/page.type';
	import { UserGroupPagesModalState } from '$lib/state/user-group-pages-modal.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();

	let allPages = $state<HekaPageRow[]>([]);
	let allModules = $state<HekaPageModuleRow[]>([]);
	let pageSelected = $state<Record<number, boolean>>({});
	let isSaving = $state(false);
	let loaded = $state(false);
	let searchText = $state('');

	const group = $derived(UserGroupPagesModalState.group);

	function apiUrl(hospitalId: string): string {
		return `/api/heka/hospital/${hospitalId}/home/administration/user-group`;
	}

	/** Map module id -> display name for quick lookup. */
	const moduleNameById = $derived.by(() => {
		const map = new Map<number, string>();
		for (const m of allModules) {
			map.set(m.id, m.name ?? m.moduleUrl ?? 'Module');
		}
		return map;
	});

	/** Flat list of pages, filtered by search term, preserving natural order. */
	const pageById = $derived.by(() => {
		const map = new Map<number, HekaPageRow>();
		for (const p of allPages) {
			map.set(p.id, p);
		}
		return map;
	});

	const childrenByParentId = $derived.by(() => {
		const map = new Map<number, HekaPageRow[]>();
		for (const p of allPages) {
			if (p.parentId == null) continue;
			if (!map.has(p.parentId)) map.set(p.parentId, []);
			map.get(p.parentId)!.push(p);
		}
		for (const [_key, list] of map) {
			list.sort(
				(a, b) =>
					(a.sequenceNo ?? 0) - (b.sequenceNo ?? 0) || a.id - b.id
			);
		}
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

	const sortedPages = $derived.by(() => {
		return [...allPages].sort((a, b) => {
			const moduleA = a.moduleId ?? Number.MAX_SAFE_INTEGER;
			const moduleB = b.moduleId ?? Number.MAX_SAFE_INTEGER;
			if (moduleA !== moduleB) return moduleA - moduleB;
			const rootA = a.parentId == null ? 0 : 1;
			const rootB = b.parentId == null ? 0 : 1;
			if (rootA !== rootB) return rootA - rootB;
			const seq = (a.sequenceNo ?? 0) - (b.sequenceNo ?? 0);
			if (seq !== 0) return seq;
			return a.id - b.id;
		});
	});

	/** Search with hierarchy support: if a page matches, include ancestors and descendants. */
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
				// include ancestors
				if (
					expanded.has(p.id) &&
					p.parentId != null &&
					!expanded.has(p.parentId)
				) {
					expanded.add(p.parentId);
					changed = true;
				}
				// include descendants
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

	/** Modules available for select-all; includes an "Other" bucket (null). */
	const modulesForSelection = $derived.by(() => {
		const moduleIds = new Set<number | null>();
		for (const p of allPages) {
			moduleIds.add(p.moduleId ?? null);
		}
		const result: { id: number | null; name: string }[] = [];
		for (const id of moduleIds) {
			if (id === null) {
				result.push({ id: null, name: 'Other' });
			} else {
				const name = moduleNameById.get(id) ?? 'Module';
				result.push({ id, name });
			}
		}
		return result;
	});

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
						pages: HekaPageRow[];
						modules: HekaPageModuleRow[];
						assignedPageIds: number[];
					})
				: { pages: [], modules: [], assignedPageIds: [] };

			const pages = parsed.pages ?? [];
			const modules = parsed.modules ?? [];
			if (cancelled) return;
			allPages = pages;
			allModules = modules;
			const assignedIds = new Set<number>(
				(parsed.assignedPageIds ?? []).filter((n) =>
					Number.isFinite(n)
				)
			);
			pageSelected = Object.fromEntries(
				pages.map((p) => [p.id, assignedIds.has(p.id)])
			);
			loaded = true;
		})();
		return () => {
			cancelled = true;
		};
	});

	function setModuleSelection(
		moduleId: number | null,
		pages: HekaPageRow[],
		checked: boolean
	) {
		const next = { ...pageSelected };
		for (const p of pages) {
			next[p.id] = checked;
		}
		pageSelected = next;
	}

	function togglePage(pageId: number) {
		const shouldCheck = !(pageSelected[pageId] ?? false);
		const descendants: number[] = [];
		const queue = [pageId];
		const visited = new Set<number>(queue);
		while (queue.length > 0) {
			const current = queue.shift()!;
			const children = childrenByParentId.get(current) ?? [];
			for (const child of children) {
				if (visited.has(child.id)) continue;
				visited.add(child.id);
				descendants.push(child.id);
				queue.push(child.id);
			}
		}

		const next = { ...pageSelected, [pageId]: shouldCheck };
		for (const id of descendants) {
			next[id] = shouldCheck;
		}
		pageSelected = next;
	}

	async function handleSave() {
		const g = group;
		if (!g) return;
		isSaving = true;
		try {
			const hospitalId = g.hospitalId;
			if (!hospitalId) throw new Error('Hospital context is missing');

			const pageIds = allPages
				.filter((p) => pageSelected[p.id])
				.map((p) => p.id);
			const url = new URL(apiUrl(hospitalId), window.location.origin);
			url.searchParams.set('mode', 'pages');

			const res = await fetch(url.toString(), {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				cache: 'no-store',
				credentials: 'include',
				body: JSON.stringify({ userGroupId: g.id, pageIds })
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
		<DaisyUiCard
			className="min-h-0 min-w-0 w-full max-w-6xl flex-1 flex flex-col overflow-hidden bg-base-200 shadow-sm"
		>
			<DaisyUiCardBody className="gap-3 overflow-hidden p-4 min-w-0">
				<div class="flex flex-col gap-3">
					<div
						class="flex flex-wrap items-center justify-between gap-3"
					>
						<p
							class="min-w-0 text-sm break-words text-base-content/70"
						>
							Select by module: allow all pages in a module or
							customize which pages in <strong
								>{group?.name ?? '—'}</strong
							> can be accessed.
						</p>
						<div class="w-full sm:w-72">
							<DaisyUiInputField
								inputType="text"
								inputPlaceholderText="Search pages by name or URL…"
								bind:value={searchText}
								className="w-full"
							/>
						</div>
					</div>
					{#if modulesForSelection.length > 0}
						<div class="flex flex-wrap items-center gap-2 text-sm">
							<span class="mr-1 font-semibold text-base-content/70">
								Modules:
							</span>
							{#each modulesForSelection as mod (mod.id ?? 'other')}
								{@const pagesInModule = allPages.filter(
									(p) => (p.moduleId ?? null) === mod.id
								)}
								{@const allChecked =
									pagesInModule.length > 0 &&
									pagesInModule.every(
										(p) => pageSelected[p.id] ?? false
									)}
								{@const someChecked = pagesInModule.some(
									(p) => pageSelected[p.id] ?? false
								)}
								<button
									type="button"
									class={`flex items-center gap-1 rounded-full border px-3 py-1 ${someChecked ? 'border-primary bg-primary/10' : ''}`}
									onclick={() =>
										setModuleSelection(
											mod.id,
											pagesInModule,
											!allChecked
										)}
								>
									<input
										type="checkbox"
										class="d-checkbox d-checkbox-xs"
										checked={allChecked}
										indeterminate={someChecked && !allChecked}
										readOnly
									/>
									<span class="whitespace-nowrap">
										{mod.name}
										<span class="opacity-60">
											({pagesInModule.length})
										</span>
									</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
				<div
					class="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
				>
					<ul
						class="d-menu grid w-full max-w-full min-w-0 grid-cols-1 gap-3 rounded-box border border-base-300 bg-base-100 p-3 md:grid-cols-2"
					>
						{#each filteredPages as p (p.id)}
							{@const isChecked = pageSelected[p.id] ?? false}
							{@const moduleName =
								p.moduleId != null
									? (moduleNameById.get(p.moduleId) ?? 'Other')
									: 'Other'}
							{@const parentPage =
								p.parentId != null ? pageById.get(p.parentId) : null}
							{@const depth = depthByPageId.get(p.id) ?? 0}
							<li class="min-w-0">
								<label
									class="flex min-w-0 cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-base-200 active:bg-base-300"
									style={`padding-left: ${0.5 + Math.min(depth, 6) * 0.75}rem`}
								>
									<input
										type="checkbox"
										class="d-checkbox shrink-0 d-checkbox-sm"
										checked={isChecked}
										onchange={() => togglePage(p.id)}
									/>
									<span class="min-w-0 flex-1 break-words">
										<span
											class="block text-xs font-semibold text-base-content/70"
										>
											{moduleName}
										</span>
										<span class="block">
											{p.name ?? '—'}
											<span
												class="ml-1 break-all text-base-content/50"
												>({p.pageUrl ?? ''})</span
											>
										</span>
										{#if parentPage}
											<span
												class="block text-xs text-base-content/60"
											>
												Sub-page of: {parentPage.name ?? '—'}
											</span>
										{/if}
									</span>
								</label>
							</li>
						{:else}
							<li
								class="text-base-content/60 text-sm px-3 py-2 col-span-full"
							>
								No pages defined.
							</li>
						{/each}
					</ul>
				</div>
			</DaisyUiCardBody>
		</DaisyUiCard>
		<div
			class="d-modal-action flex shrink-0 !justify-end gap-2 border-t border-base-300 pt-4"
		>
			<DaisyUiButton
				type="button"
				className="d-btn-ghost"
				onClick={() => cancel()}
				disabled={isSaving}
			>
				Cancel
			</DaisyUiButton>
			<DaisyUiButton
				type="button"
				className="d-btn-primary"
				onClick={handleSave}
				disabled={isSaving}
			>
				{isSaving ? 'Saving…' : 'Save'}
			</DaisyUiButton>
		</div>
	{/if}
</div>
