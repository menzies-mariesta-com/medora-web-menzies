<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import { getModule } from '$lib/remote/table/information-table/module.remote';
	import { getPage } from '$lib/remote/table/information-table/page.remote';
	import {
		getByUserGroupId,
		setPagesForUserGroup
	} from '$lib/remote/table/information-table/user-group-page.remote';
	import type {
		ModuleSchema,
		PageSchema
	} from '$lib/server/db/schema-type';
	import { UserGroupPagesModalState } from '$lib/state/user-group-pages-modal.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();

	let allPages = $state<PageSchema[]>([]);
let allModules = $state<ModuleSchema[]>([]);
let pageSelected = $state<Record<number, boolean>>({});
let isSaving = $state(false);
let loaded = $state(false);
let searchText = $state('');

	const group = $derived(UserGroupPagesModalState.group);

	/** Map module id -> display name for quick lookup. */
	const moduleNameById = $derived.by(() => {
		const map = new Map<number, string>();
		for (const m of allModules) {
			map.set(m.id, m.name ?? m.moduleUrl ?? 'Module');
		}
		return map;
	});

	/** Flat list of pages, filtered by search term, preserving natural order. */
	const filteredPages = $derived.by(() => {
		const term = searchText.trim().toLowerCase();
		if (!term) return allPages;
		return allPages.filter((p) => {
			const name = (p.name ?? '').toLowerCase();
			const url = (p.pageUrl ?? '').toLowerCase();
			const moduleName =
				(p.moduleId != null ? moduleNameById.get(p.moduleId) : 'Other')?.toLowerCase() ??
				'';
			return (
				name.includes(term) ||
				url.includes(term) ||
				moduleName.includes(term)
			);
		});
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
			const [pages, modules] = await Promise.all([
				getPage(),
				getModule()
			]);
			if (cancelled) return;
			allPages = pages;
			allModules = modules;
			const assignments = await getByUserGroupId({
				userGroupId: g.id
			});
			if (cancelled) return;
			const assignedIds = new Set(
				assignments
					.map((a) => a.pageId)
					.filter((id): id is number => id != null)
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
		pages: PageSchema[],
		checked: boolean
	) {
		const next = { ...pageSelected };
		for (const p of pages) {
			next[p.id] = checked;
		}
		pageSelected = next;
	}

	function togglePage(pageId: number) {
		pageSelected = {
			...pageSelected,
			[pageId]: !(pageSelected[pageId] ?? false)
		};
	}

	async function handleSave() {
		const g = group;
		if (!g) return;
		isSaving = true;
		try {
			const pageIds = allPages
				.filter((p) => pageSelected[p.id])
				.map((p) => p.id);
			await setPagesForUserGroup({ userGroupId: g.id, pageIds });
			toastService.addToast(
				'Page access updated.',
				StatusColorEnum.SUCCESS
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
					<div class="flex flex-wrap items-center justify-between gap-3">
						<p
							class="min-w-0 text-sm break-words text-base-content/70"
						>
							Select by module: allow all pages in a module or customize
							which pages in <strong>{group?.name ?? '—'}</strong> can be accessed.
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
									pagesInModule.every((p) => pageSelected[p.id] ?? false)}
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
						class="d-menu w-full max-w-full min-w-0 gap-3 rounded-box border border-base-300 bg-base-100 p-3 grid grid-cols-1 md:grid-cols-2"
					>
						{#each filteredPages as p (p.id)}
							{@const isChecked = pageSelected[p.id] ?? false}
							{@const moduleName =
								p.moduleId != null
									? moduleNameById.get(p.moduleId) ?? 'Other'
									: 'Other'}
							<li class="min-w-0">
								<label
									class="flex min-w-0 cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-base-200 active:bg-base-300"
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
									</span>
								</label>
							</li>
						{:else}
							<li class="text-base-content/60 text-sm px-3 py-2 col-span-full">
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
