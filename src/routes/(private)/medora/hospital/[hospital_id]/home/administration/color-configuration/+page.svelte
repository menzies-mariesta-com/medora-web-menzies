<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashCardBodyAction from '$lib/component/wash/card/body/action/WashCardBodyAction.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableRowActionGroup from '$lib/component/own/library/menzies/table/MenziesTableRowActionGroup.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import ColorSwatchStrip from '$lib/component/own/local/private/medora/administration/color-configuration/ColorSwatchStrip.svelte';
	import ColorWheelRow from '$lib/component/own/local/private/medora/administration/color-configuration/ColorWheelRow.svelte';
	import ColorGroupPreview from '$lib/component/own/local/private/medora/administration/color-configuration/ColorGroupPreview.svelte';
	import {
		COLOR_CONFIGURATION_SECTIONS,
		HOSPITAL_COLOR_CATEGORY,
		STATIC_COLOR_CATALOG,
		defaultColorFor,
		hospitalColorMapKey,
		type ColorCatalogSectionId,
		type ColorConfigurationSection
	} from '$lib/model/const/color-purpose.const';
	import type { ColorConfigurationPayload } from '$lib/model/type/medora/color-configuration.type';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';
	import { clearHospitalColorMapCache } from '$lib/util/hospital-color-map-client.util';
	import { resolveHospitalColor } from '$lib/tool/color/hospital-color-resolve.util';
	import { colorToHex } from '$lib/tool/color/color-hsl.util';
	import { isValidColorInput } from '$lib/tool/color/validate-color.util';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();
	const toastService = new ToastService();
	const saveLock = createActionLock();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);

	type CatalogItem = {
		category: string;
		entityKey: string;
		label: string;
		defaultColor: string;
	};

	type GroupListRow = {
		id: ColorCatalogSectionId;
		label: string;
		swatches: string[];
	};

	type DraftItem = {
		key: string;
		category: string;
		entityKey: string;
		label: string;
		color: string;
		baseline: string;
		defaultColor: string;
		wasConfigured: boolean;
	};

	let payload = $state<ColorConfigurationPayload | null>(null);
	let isLoading = $state(false);
	let viewMode = $state<'list' | 'edit'>('list');
	let editingId = $state<ColorCatalogSectionId | null>(null);
	let draft = $state<DraftItem[]>([]);

	const apiUrl = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/color-configuration`
			: ''
	);

	const editingSection = $derived(
		COLOR_CONFIGURATION_SECTIONS.find(
			(section) => section.id === editingId
		) ?? null
	);

	function text(key: string, fallback: string): string {
		return msg[key]?.() ?? fallback;
	}

	function sectionLabel(id: ColorCatalogSectionId): string {
		return text(`color_configuration_section_${id}`, id);
	}

	function sectionHelp(id: ColorCatalogSectionId): string {
		return text(
			`color_configuration_help_${id}`,
			text(
				'color_configuration_edit_help',
				'Drag the hue wheel or type a hex color. Nothing is stored until you save.'
			)
		);
	}

	function configured(category: string, entityKey: string): boolean {
		return (payload?.configured ?? []).some(
			(row) =>
				row.category === category && row.entityKey === entityKey
		);
	}

	function catalogItems(
		sectionId: ColorCatalogSectionId
	): CatalogItem[] {
		if (sectionId === 'trauma') {
			return (payload?.dynamicTrauma ?? []).map((row) => ({
				category: HOSPITAL_COLOR_CATEGORY.TRAUMA_ACTIVATION_LEVEL,
				entityKey: row.entityKey,
				label: `${row.code} — ${row.name}`,
				defaultColor: defaultColorFor(
					HOSPITAL_COLOR_CATEGORY.TRAUMA_ACTIVATION_LEVEL,
					row.entityKey
				)
			}));
		}
		return STATIC_COLOR_CATALOG.filter(
			(entry) => entry.sectionId === sectionId
		).map((entry) => {
			if (sectionId !== 'ed_triage') return entry;
			const named = payload?.dynamicTriage.find(
				(row) => row.entityKey === entry.entityKey
			);
			return named ? { ...entry, label: named.name } : entry;
		});
	}

	function resolvedHex(item: CatalogItem): string {
		if (!payload) return colorToHex(item.defaultColor);
		return colorToHex(
			resolveHospitalColor(
				payload.resolvedMap,
				item.category,
				item.entityKey
			)
		);
	}

	const groupRows = $derived.by((): GroupListRow[] =>
		COLOR_CONFIGURATION_SECTIONS.map((section) => {
			const items = catalogItems(section.id);
			return {
				id: section.id,
				label: sectionLabel(section.id),
				swatches: items.map((item) => resolvedHex(item))
			};
		})
	);

	const columns: MenziesTableColumn<GroupListRow>[] = [
		{
			id: 'group',
			header: text('color_configuration_column_group', 'Group'),
			field: 'label'
		},
		{
			id: 'colors',
			header: text('color_configuration_column_colors', 'Colors'),
			field: 'swatches',
			cellComponentGetter: (row) => ({
				component: ColorSwatchStrip,
				props: { colors: row.swatches }
			})
		},
		{
			id: 'status',
			header: text('color_configuration_column_status', 'Status'),
			field: 'id',
			format: (_value, row) => {
				const items = catalogItems(row.id);
				const anyConfigured = items.some((item) =>
					configured(item.category, item.entityKey)
				);
				return anyConfigured
					? text(
							'color_configuration_status_configured',
							'Configured'
						)
					: text('color_configuration_status_default', 'Default');
			}
		}
	];

	async function load() {
		if (!apiUrl) return;
		isLoading = true;
		try {
			const res = await fetch(apiUrl, {
				signal: AbortSignal.timeout(20_000)
			});
			if (!res.ok) throw new Error(await res.text());
			payload = (await res.json()) as ColorConfigurationPayload;
		} catch (error) {
			const timedOut =
				error instanceof Error && error.name === 'TimeoutError';
			toastService.addToast(
				timedOut
					? m.error_load_failed()
					: error instanceof Error
						? error.message
						: m.error_load_failed(),
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	}

	function startEdit(section: ColorConfigurationSection) {
		editingId = section.id;
		viewMode = 'edit';
		draft = catalogItems(section.id).map((item) => {
			const color = resolvedHex(item);
			return {
				key: hospitalColorMapKey(item.category, item.entityKey),
				category: item.category,
				entityKey: item.entityKey,
				label: item.label,
				color,
				baseline: color,
				defaultColor: colorToHex(item.defaultColor),
				wasConfigured: configured(item.category, item.entityKey)
			};
		});
	}

	function cancelEdit() {
		viewMode = 'list';
		editingId = null;
		draft = [];
	}

	function setDraftColor(key: string, color: string) {
		draft = draft.map((item) =>
			item.key === key ? { ...item, color } : item
		);
	}

	function resetDraftColor(key: string) {
		draft = draft.map((item) =>
			item.key === key ? { ...item, color: item.defaultColor } : item
		);
	}

	async function saveEdit() {
		if (!apiUrl || !editingId || saveLock.pending) return;
		for (const item of draft) {
			if (
				!isValidColorInput(item.color) ||
				!item.color.startsWith('#')
			) {
				toastService.addToast(
					text(
						'color_configuration_invalid_color',
						'Enter a valid #RRGGBB color.'
					),
					StatusColorEnum.ERROR
				);
				return;
			}
		}
		await saveLock.run(async () => {
			const jobs: Promise<void>[] = [];
			for (const item of draft) {
				const next = colorToHex(item.color);
				const atDefault = next === item.defaultColor;
				if (item.wasConfigured && atDefault) {
					jobs.push(writeColor('DELETE', item));
				} else if (next !== item.baseline) {
					jobs.push(writeColor('PUT', item, next));
				}
			}
			try {
				await Promise.all(jobs);
				clearHospitalColorMapCache(hospitalId);
				toastService.addToast(
					text('color_configuration_saved', 'Color saved'),
					StatusColorEnum.SUCCESS
				);
				cancelEdit();
				await load();
			} catch (error) {
				toastService.addToast(
					error instanceof Error
						? error.message
						: text(
								'color_configuration_invalid_color',
								'Enter a valid #RRGGBB color.'
							),
					StatusColorEnum.ERROR
				);
			}
		});
	}

	async function writeColor(
		method: 'PUT' | 'DELETE',
		item: DraftItem,
		color?: string
	) {
		const res = await fetch(apiUrl, {
			method,
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				category: item.category,
				entityKey: item.entityKey,
				...(color ? { color } : {})
			})
		});
		if (!res.ok) throw new Error(await res.text());
	}

	lifeCycle.onMount(() => {
		void load();
	});
</script>

{#if viewMode === 'list'}
	<div class={TableEnum.HEIGHT}>
		<MenziesTable
			showRefreshButton={true}
			title={text(
				'color_configuration_page_title',
				'Color configuration'
			)}
			description={text(
				'color_configuration_page_subtitle',
				'Set hospital colors for visit types, workflow statuses, triage, trauma, and operational badges. Unset items use application defaults.'
			)}
			{columns}
			rows={groupRows}
			{isLoading}
			showRowActions={true}
			actionsVariant="none"
			on:refresh={() => load()}
		>
			{#snippet rowActions(row: GroupListRow)}
				<MenziesTableRowActionGroup>
					<MenziesTableIconAction
						tooltipText={m.menzies_table_tooltip_edit()}
						color="accent"
						onClick={() => {
							const section = COLOR_CONFIGURATION_SECTIONS.find(
								(item) => item.id === row.id
							);
							if (section) startEdit(section);
						}}
					>
						{#snippet icon()}
							<LucidePencil className="size-4" />
						{/snippet}
					</MenziesTableIconAction>
				</MenziesTableRowActionGroup>
			{/snippet}
		</MenziesTable>
	</div>
{:else if editingSection}
	<WashCard>
		<WashCardBody>
			<form
				onsubmit={(event) => {
					event.preventDefault();
					void saveEdit();
				}}
			>
				<fieldset class="m-0 min-w-0 border-0 p-0">
					<WashCardBodyTitle className="mb-3">
						{sectionLabel(editingSection.id)}
					</WashCardBodyTitle>
					<p class="text-xs leading-snug text-base-content/60">
						{sectionHelp(editingSection.id)}
					</p>
				</fieldset>

				{#if draft.length === 0}
					<p class="mt-4 text-sm text-base-content/70">
						{text(
							'color_configuration_empty_group',
							'No colors in this group yet.'
						)}
					</p>
				{:else}
					<ul class="mt-2">
						{#each draft as item (item.key)}
							<li>
								<ColorWheelRow
									label={item.label}
									value={item.color}
									hueLabel={text('color_configuration_hue', 'Hue')}
									saturationLabel={text(
										'color_configuration_saturation',
										'Saturation'
									)}
									saturationMark={text(
										'color_configuration_saturation_mark',
										'S'
									)}
									lightnessLabel={text(
										'color_configuration_lightness',
										'Lightness'
									)}
									lightnessMark={text(
										'color_configuration_lightness_mark',
										'L'
									)}
									hexLabel={text('color_configuration_hex', 'Hex')}
									resetLabel={text(
										'color_configuration_reset',
										'Reset to default'
									)}
									onColor={(hex) => setDraftColor(item.key, hex)}
									onReset={() => resetDraftColor(item.key)}
								/>
							</li>
						{/each}
					</ul>
					<ColorGroupPreview
						kind={editingSection.preview}
						items={draft.map((item) => ({
							key: item.key,
							label: item.label,
							color: item.color
						}))}
						usageTitle={text(
							'color_configuration_preview_usage',
							'How this looks'
						)}
						kitTitle={text(
							'color_configuration_preview_kit',
							'Component preview'
						)}
						bedLabel={text('color_configuration_bed', 'Bed')}
						cardLabel={text('color_configuration_kit_card', 'Card')}
						headers={{
							item: text('color_configuration_kit_item', 'Item'),
							badge: text('color_configuration_kit_badge', 'Badge'),
							card: text('color_configuration_kit_card', 'Card'),
							alert: text('color_configuration_kit_alert', 'Alert'),
							row: text('color_configuration_kit_row', 'Row')
						}}
					/>
				{/if}

				<WashCardBodyAction className="mt-4 flex flex-wrap gap-2">
					<WashButton
						type="submit"
						variant="accent"
						wide={true}
						disabled={saveLock.pending}
					>
						{m.save()}
					</WashButton>
					<WashButton
						type="button"
						className="btn-outline"
						wide={true}
						onClick={cancelEdit}
					>
						{m.cancel()}
					</WashButton>
				</WashCardBodyAction>
			</form>
		</WashCardBody>
	</WashCard>
{/if}
