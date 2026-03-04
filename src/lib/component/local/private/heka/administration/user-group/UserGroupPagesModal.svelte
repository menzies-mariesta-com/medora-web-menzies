<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
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

	const group = $derived(UserGroupPagesModalState.group);

	/** Group pages by module (null = no module). Order: known modules first, then "Other". */
	const modulesWithPages = $derived.by(() => {
		const byModule = new Map<number | null, PageSchema[]>();
		for (const p of allPages) {
			const key = p.moduleId ?? null;
			if (!byModule.has(key)) byModule.set(key, []);
			byModule.get(key)!.push(p);
		}
		const result: {
			moduleName: string;
			moduleId: number | null;
			pages: PageSchema[];
		}[] = [];
		for (const m of allModules) {
			const pages = byModule.get(m.id) ?? [];
			if (pages.length > 0)
				result.push({
					moduleName: m.name ?? m.moduleUrl ?? 'Module',
					moduleId: m.id,
					pages
				});
		}
		const otherPages = byModule.get(null) ?? [];
		if (otherPages.length > 0) {
			result.push({
				moduleName: 'Other',
				moduleId: null,
				pages: otherPages
			});
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
	class="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden"
>
	{#if !loaded}
		<p class="py-4 text-base-content/70">Loading…</p>
	{:else}
		<DaisyUiCard
			className="min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden bg-base-200 shadow-sm"
		>
			<DaisyUiCardBody className="gap-0 overflow-hidden p-4 min-w-0">
				<p
					class="mb-4 min-w-0 text-sm break-words text-base-content/70"
				>
					Select by module: allow all pages in a module or customize
					which pages in <strong>{group?.name ?? '—'}</strong> can be accessed.
				</p>
				<div
					class="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
				>
					<ul
						class="d-menu w-full max-w-full min-w-0 gap-2 rounded-box border border-base-300 bg-base-100 p-2"
					>
						{#each modulesWithPages as { moduleName, moduleId, pages } (moduleId !== null ? String(moduleId) : 'other')}
							{@const allChecked =
								pages.length > 0 &&
								pages.every((p) => pageSelected[p.id] ?? false)}
							{@const someChecked = pages.some(
								(p) => pageSelected[p.id] ?? false
							)}
							<li
								class="flex min-w-0 flex-row items-center gap-2 rounded-lg bg-base-200/80 d-menu-title px-3 py-2"
								class:ring-2={someChecked && !allChecked}
								class:ring-primary={someChecked && !allChecked}
							>
								<label
									class="flex min-h-0 min-w-0 flex-1 cursor-pointer items-center gap-2 py-0"
								>
									<input
										type="checkbox"
										class="d-checkbox shrink-0 d-checkbox-sm d-checkbox-primary"
										checked={allChecked}
										indeterminate={someChecked && !allChecked}
										onchange={() =>
											setModuleSelection(
												moduleId,
												pages,
												!allChecked
											)}
									/>
									<span class="min-w-0 truncate font-medium"
										>{moduleName}</span
									>
									<span
										class="d-badge shrink-0 d-badge-ghost d-badge-sm"
										>{pages.length} page{pages.length === 1
											? ''
											: 's'}</span
									>
								</label>
							</li>
							<li
								class="ml-4 min-w-0 border-l-2 border-base-300 pl-3"
							>
								<ul
									class="d-menu w-full max-w-full min-w-0 gap-0.5 rounded-box bg-base-100/50 p-1"
								>
									{#each pages as p (p.id)}
										{@const isChecked = pageSelected[p.id] ?? false}
										<li class="min-w-0">
											<label
												class="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-base-200 active:bg-base-300"
											>
												<input
													type="checkbox"
													class="d-checkbox shrink-0 d-checkbox-sm"
													checked={isChecked}
													onchange={() => togglePage(p.id)}
												/>
												<span class="min-w-0 flex-1 break-words">
													{p.name ?? '—'}
													<span
														class="ml-1 break-all text-base-content/50"
														>({p.pageUrl ?? ''})</span
													>
												</span>
											</label>
										</li>
									{/each}
								</ul>
							</li>
						{:else}
							<li class="text-base-content/60 text-sm px-3 py-2">
								No modules with pages defined.
							</li>
						{/each}
					</ul>
				</div>
			</DaisyUiCardBody>
		</DaisyUiCard>
		<div
			class="d-modal-action flex shrink-0 justify-end gap-2 border-t border-base-300 pt-4"
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
