<script lang="ts">
	/**
	 * Menzies Design Auto Aware Dropdown 02 · Search select (Wash UI 1.1.0).
	 * Viewport flip / end-align via `measureDropdownPlacement`; Medora extensions:
	 * `{ label, value }` options, `bind:value`, optional async `searchFn`.
	 * @see https://design-menzies.netlify.app/ (Select search)
	 */
	import LucideSearch from '$lib/component/own/library/lucide/LucideSearch.svelte';
	import OverflowText from '$lib/component/own/library/menzies/overflow-marquee/OverflowText.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import {
		createWashId,
		DROPDOWN_PANEL_Z,
		dropdownPanelStyle,
		dropdownPlacementClassName,
		measureDropdownPlacement,
		sameDropdownPlacement,
		type DropdownPlacement
	} from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { untrack } from 'svelte';

	export type SearchSelectOption = {
		label: string;
		value: string;
	};

	/** Design SearchSelect measure opts (`panelWidth: 448`, `panelHeight: 320`). */
	const PLACEMENT_OPTS = {
		panelWidth: 448,
		panelHeight: 320
	} as const;

	const DEFAULT_PLACEMENT: DropdownPlacement = {
		end: false,
		top: false,
		maxHeight: 320
	};

	/**
	 * Do not use Daisy `.menu` here — its `width: fit-content` +
	 * `grid-auto-columns: minmax(auto, max-content)` prevents label overflow,
	 * so Design portal marquee never fires on options.
	 */
	const LIST_CLASS =
		'menzies-ss-list flex w-full min-w-0 flex-col gap-0.5 overflow-x-hidden overflow-y-auto p-0';

	const OPTION_BTN_CLASS =
		'flex w-full min-w-0 max-w-full cursor-pointer items-center gap-2 rounded-[var(--radius-field)] px-3 py-1.5 text-start transition-colors hover:bg-base-200';

	function matchesFilter(query: string, text: string): boolean {
		return text.toLowerCase().includes(query.trim().toLowerCase());
	}

	function normalizeOptions(
		raw: Array<string | SearchSelectOption>
	): SearchSelectOption[] {
		return raw.map((item) =>
			typeof item === 'string'
				? { label: item, value: item }
				: item
		);
	}

	let {
		options = [],
		label,
		placeholder = 'Choose…',
		value = $bindable(''),
		onChange,
		/** Gallery `onPick` — receives the selected option label (or value for objects). */
		onPick,
		className = '',
		triggerClassName = '',
		inputClassName = '',
		disabled = false,
		inputId,
		required = false,
		emptyMessage = 'No options match.',
		searchFn,
		getLabelForValue,
		debounceMs = 300,
		minSearchLength = 0,
		invalidateKey,
		filterPlaceholder = 'Type to filter…'
	}: {
		options?: Array<string | SearchSelectOption>;
		label?: string;
		placeholder?: string;
		value?: string;
		onChange?: (value: string) => void;
		onPick?: (picked: string) => void;
		className?: string;
		triggerClassName?: string;
		inputClassName?: string;
		disabled?: boolean;
		inputId?: string;
		required?: boolean;
		emptyMessage?: string;
		searchFn?: (query: string) => Promise<SearchSelectOption[]>;
		getLabelForValue?: (value: string) => Promise<string>;
		debounceMs?: number;
		minSearchLength?: number;
		invalidateKey?: unknown;
		filterPlaceholder?: string;
	} = $props();

	let open = $state(false);
	let filter = $state('');
	let containerEl = $state<HTMLDivElement | null>(null);
	let optionsFromServer = $state<SearchSelectOption[]>([]);
	let isLoading = $state(false);
	let cachedLabelForValue = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let placement = $state<DropdownPlacement>({ ...DEFAULT_PLACEMENT });

	const listboxId = createWashId('search-select');
	const filterInputId = createWashId('search-select-filter');
	const labelTextId = createWashId('search-select-label');
	const isAsync = $derived(!!searchFn);
	const normalizedOptions = $derived(normalizeOptions(options));
	const optionsList = $derived(
		isAsync ? optionsFromServer : normalizedOptions
	);
	const displayLabel = $derived(
		!value?.trim()
			? ''
			: (optionsList.find((o) => o.value === value)?.label ??
					cachedLabelForValue)
	);
	/** Gallery `E(query, option)` — filter as you type. */
	const filtered = $derived.by(() => {
		const q = filter.trim();
		if (!q) return optionsList;
		return optionsList.filter(
			(o) => matchesFilter(q, o.label) || matchesFilter(q, o.value)
		);
	});
	const isOpen = $derived(open && !disabled);
	const dropdownClass = $derived(
		dropdownPlacementClassName(
			placement,
			`w-full ${isOpen ? 'dropdown-open' : ''} ${className}`.trim()
		)
	);
	const panelClass = $derived(
		[
			'dropdown-content',
			DROPDOWN_PANEL_Z,
			placement.top ? 'mb-1' : 'mt-1',
			// Match trigger width (form fields are often wider than Design’s 24–28rem demo cap).
			'w-full min-w-full max-w-[min(100%,100vw-1rem)] overflow-x-hidden overflow-y-auto rounded-box border border-ink-border bg-base-100 p-2 shadow-[var(--shadow-paper-md)]'
		].join(' ')
	);
	const panelStyle = $derived(dropdownPanelStyle(placement));
	const triggerBtnClass = $derived(
		[
			'btn flex w-full min-w-0 justify-between border-ink-border font-normal cursor-pointer',
			disabled ? 'btn-disabled cursor-not-allowed' : '',
			triggerClassName
		]
			.filter(Boolean)
			.join(' ')
	);
	const showLoadingOnly = $derived(
		isLoading && filtered.length === 0
	);

	function updatePlacement() {
		const el = containerEl;
		if (!el) return;
		const next = measureDropdownPlacement(el, {
			...PLACEMENT_OPTS,
			// Prefer real trigger width so end-align matches the full-width panel.
			panelWidth: Math.max(PLACEMENT_OPTS.panelWidth, el.offsetWidth || 0)
		});
		const prev = untrack(() => placement);
		if (!sameDropdownPlacement(prev, next)) {
			placement = next;
		}
	}

	async function runAsyncSearch(query: string) {
		if (!searchFn) return;
		if (query.length < minSearchLength) {
			optionsFromServer = [];
			return;
		}
		isLoading = true;
		try {
			optionsFromServer = (await searchFn(query)).slice(
				0,
				AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT
			);
		} finally {
			isLoading = false;
		}
	}

	function setOpen(next: boolean) {
		if (disabled) return;
		open = next;
		if (next) {
			filter = '';
			if (isAsync) void runAsyncSearch('');
		} else {
			filter = '';
			if (debounceTimer) {
				clearTimeout(debounceTimer);
				debounceTimer = null;
			}
		}
	}

	function toggleDropdown() {
		if (disabled) return;
		setOpen(!open);
	}

	function handleFilterInput(e: Event) {
		const next = (e.currentTarget as HTMLInputElement).value;
		filter = next;
		if (!isAsync || !searchFn) return;
		if (debounceTimer) clearTimeout(debounceTimer);
		if (next.length < minSearchLength) {
			optionsFromServer = [];
			debounceTimer = null;
			return;
		}
		debounceTimer = setTimeout(() => {
			void runAsyncSearch(next);
		}, debounceMs);
	}

	function selectOption(option: SearchSelectOption) {
		value = option.value;
		cachedLabelForValue = option.label;
		filter = '';
		open = false;
		onChange?.(option.value);
		onPick?.(option.label);
	}

	$effect(() => {
		if (!isOpen) return;
		updatePlacement();
		window.addEventListener('resize', updatePlacement);
		window.addEventListener('scroll', updatePlacement, true);
		return () => {
			window.removeEventListener('resize', updatePlacement);
			window.removeEventListener('scroll', updatePlacement, true);
		};
	});

	$effect(() => {
		if (!isOpen) return;
		queueMicrotask(() => {
			const el = document.getElementById(filterInputId);
			if (el instanceof HTMLInputElement) el.focus();
		});
	});

	$effect(() => {
		if (!isOpen) return;
		const root = containerEl;
		if (!root) return;
		function onPointerDown(event: PointerEvent) {
			const target = event.target;
			if (!(target instanceof Node)) return;
			if (root && !root.contains(target)) setOpen(false);
		}
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') setOpen(false);
		}
		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	});

	$effect(() => {
		const v = value?.trim();
		if (!isAsync || !v || !getLabelForValue) return;
		if (optionsList.some((o) => o.value === v)) return;
		getLabelForValue(v).then((labelText) => {
			cachedLabelForValue = labelText;
		});
	});

	$effect(() => {
		if (!value?.trim()) cachedLabelForValue = '';
	});

	$effect(() => {
		void invalidateKey;
		if (isAsync) optionsFromServer = [];
	});
</script>

<div class={dropdownClass} bind:this={containerEl}>
	<label class="form-control w-full">
		{#if label}
			<span class="label">
				<span class="label-text" id={labelTextId}>
					{label}{#if required}<span
							class="align-top text-sm leading-none text-error"
							aria-hidden="true">*</span
						>{/if}
				</span>
			</span>
		{/if}
		<button
			id={inputId}
			type="button"
			role="combobox"
			aria-expanded={isOpen}
			aria-controls={listboxId}
			aria-haspopup="listbox"
			aria-required={required || undefined}
			aria-labelledby={label ? labelTextId : undefined}
			class={triggerBtnClass}
			{disabled}
			onclick={toggleDropdown}
		>
			<OverflowText
				className="min-w-0 flex-1 {displayLabel ? '' : 'text-base-content/50'}"
				text={displayLabel || placeholder}
			/>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="size-4 shrink-0 opacity-60"
				aria-hidden="true"
			>
				<path d="m7 15 5 5 5-5"></path>
				<path d="m7 9 5-5 5 5"></path>
			</svg>
		</button>
		{#if required}
			<input
				type="text"
				class="sr-only"
				tabindex="-1"
				required
				value={displayLabel}
				aria-hidden="true"
				oninput={() => {}}
			/>
		{/if}
	</label>

	{#if isOpen}
		<div
			class={panelClass}
			style="max-height: {panelStyle.maxHeight}px; --wash-dropdown-max-h: {panelStyle[
				'--wash-dropdown-max-h'
			]}"
		>
			<label
				class="input input-sm mb-2 w-full cursor-text border-ink-border"
			>
				<LucideSearch className="size-3.5 shrink-0 opacity-60" />
				<input
					id={filterInputId}
					type="search"
					class="grow cursor-text {inputClassName}"
					placeholder={filterPlaceholder}
					aria-label={label ? `Filter ${label}` : 'Filter options'}
					aria-controls={listboxId}
					value={filter}
					oninput={handleFilterInput}
					onkeydown={(event) => {
						if (event.key === 'Escape') {
							event.stopPropagation();
							setOpen(false);
						}
					}}
				/>
			</label>
			<ul
				id={listboxId}
				role="listbox"
				class={LIST_CLASS}
				tabindex="-1"
			>
				{#if showLoadingOnly}
					<li class="px-3 py-2 text-sm text-ink-muted">Loading…</li>
				{:else if filtered.length === 0}
					<li class="px-3 py-2 text-sm text-ink-muted">
						{isAsync && filter.length < minSearchLength
							? filterPlaceholder
							: emptyMessage}
					</li>
				{:else}
					{#each filtered as option (option.value)}
						{@const selected = option.value === value}
						<li class="min-w-0 w-full" role="option" aria-selected={selected}>
							<button
								type="button"
								class="{OPTION_BTN_CLASS} {selected
									? 'bg-base-200 font-medium'
									: ''}"
								onmousedown={(event) => event.preventDefault()}
								onclick={() => selectOption(option)}
							>
								<OverflowText className="min-w-0 flex-1" text={option.label} />
								{#if selected}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="size-4 shrink-0 opacity-70"
										aria-hidden="true"
									>
										<path d="M20 6 9 17l-5-5"></path>
									</svg>
								{/if}
							</button>
						</li>
					{/each}
				{/if}
			</ul>
		</div>
	{/if}
</div>
