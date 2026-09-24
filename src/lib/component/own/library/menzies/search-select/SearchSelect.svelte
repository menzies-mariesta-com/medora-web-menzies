<script lang="ts">
	/**
	 * Menzies Design Auto Aware Dropdown 02 · Search select (Wash UI 1.2.0).
	 * Viewport flip / end-align via `measureDropdownPlacement`; Medora extensions:
	 * `{ label, value }` options, `bind:value`, optional async `searchFn`.
	 * Menu is portaled to the nearest `<dialog>` (or `document.body`) with fixed
	 * positioning so scrollable modal bodies cannot clip the list.
	 * Use `joinItem` inside Daisy `.join` (or a manual flex join): wrappers become
	 * `display: contents` so the trigger is the bordered control.
	 * @see https://design-menzies.netlify.app/ (Select search)
	 */
	import LucideChevronsUpDown from '$lib/component/own/library/lucide/LucideChevronsUpDown.svelte';
	import LucideSearch from '$lib/component/own/library/lucide/LucideSearch.svelte';
	import OverflowText from '$lib/component/own/library/menzies/overflow-marquee/OverflowText.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import {
		createWashId,
		dropdownPlacementClassName,
		measureDropdownPlacement,
		sameDropdownPlacement,
		type DropdownPlacement
	} from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { untrack } from 'svelte';

	/**
	 * Mount under nearest `<dialog>` (top layer) or `document.body` so menus escape
	 * scroll containers (`overflow-y-auto`) that clip absolute dropdowns.
	 */
	function portal(node: HTMLElement, getHost: () => HTMLElement | null) {
		const host = getHost() ?? document.body;
		host.appendChild(node);
		return {
			update(nextGetHost: () => HTMLElement | null) {
				const next = nextGetHost() ?? document.body;
				if (node.parentElement !== next) next.appendChild(node);
			},
			destroy() {
				node.remove();
			}
		};
	}

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
		'menzies-ss-list flex w-full min-w-0 flex-col gap-0.5 overflow-x-hidden overflow-y-auto p-0 text-sm';

	const OPTION_BTN_CLASS =
		'flex w-full min-w-0 max-w-full cursor-pointer items-center gap-2 rounded-[var(--radius-field)] px-3 py-1.5 text-start text-sm transition-colors hover:bg-base-200';

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
		filterPlaceholder = 'Type to filter…',
		/**
		 * Use inside DaisyUI `.join`: wrappers become `contents` so the trigger
		 * is the join-item (borders/radius merge with siblings). Put `join-item`
		 * width classes on `className` / `triggerClassName`.
		 */
		joinItem = false
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
		joinItem?: boolean;
	} = $props();

	let open = $state(false);
	let filter = $state('');
	let containerEl = $state<HTMLDivElement | null>(null);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let panelEl = $state<HTMLDivElement | null>(null);
	let optionsFromServer = $state<SearchSelectOption[]>([]);
	let isLoading = $state(false);
	let cachedLabelForValue = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let placement = $state<DropdownPlacement>({ ...DEFAULT_PLACEMENT });
	/** Viewport-fixed CSS for the portaled panel (string — reliable max-height). */
	let fixedPanelStyle = $state('');

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
			[
				'dropdown-no-hover',
				joinItem ? 'contents' : 'w-full',
				isOpen ? 'dropdown-open' : '',
				joinItem ? '' : className
			]
				.filter(Boolean)
				.join(' ')
				.trim()
		)
	);
	const fieldClass = $derived(
		joinItem ? 'contents' : 'form-control w-full'
	);
	const panelClass = $derived(
		[
			'fixed z-[10050] max-h-[min(20rem,70dvh)]',
			'overflow-x-hidden overflow-y-auto overscroll-contain rounded-box border border-ink-border bg-base-100 p-2 shadow-[var(--shadow-paper-md)]'
		].join(' ')
	);
	const triggerBtnClass = $derived(
		[
			// Match WashSelect trigger (`.select`), join or standalone — not `.btn`.
			'select wash-select--icon inline-flex min-w-0 cursor-pointer items-center justify-between gap-2 border-ink-border text-start font-normal',
			joinItem ? '' : 'w-full',
			disabled ? 'cursor-not-allowed opacity-60' : '',
			joinItem ? className : '',
			triggerClassName
		]
			.filter(Boolean)
			.join(' ')
	);
	const showLoadingOnly = $derived(
		isLoading && filtered.length === 0
	);

	function portalHost(): HTMLElement | null {
		return containerEl?.closest('dialog') ?? null;
	}

	function updateFixedPanelStyle(nextPlacement: DropdownPlacement) {
		const el = triggerEl ?? containerEl;
		if (!el || typeof window === 'undefined') return;
		const rect = el.getBoundingClientRect();
		const gap = 4;
		const maxH = Math.max(
			120,
			Math.min(320, Math.round(nextPlacement.maxHeight))
		);
		const widthPx = Math.round(rect.width);
		const parts: string[] = [
			`max-height:${maxH}px`,
			`--wash-dropdown-max-h:${maxH}px`
		];
		if (nextPlacement.top) {
			parts.push(`bottom:${window.innerHeight - rect.top + gap}px`);
			parts.push('top:auto');
		} else {
			parts.push(`top:${rect.bottom + gap}px`);
			parts.push('bottom:auto');
		}
		if (nextPlacement.end) {
			parts.push(`right:${window.innerWidth - rect.right}px`);
			parts.push('left:auto');
		} else {
			parts.push(`left:${rect.left}px`);
			parts.push('right:auto');
		}
		if (widthPx > 0) {
			parts.push(`width:${widthPx}px`);
			parts.push(`min-width:${widthPx}px`);
			parts.push(`max-width:${widthPx}px`);
		}
		fixedPanelStyle = parts.join(';');
	}

	function updatePlacement() {
		const el = triggerEl ?? containerEl;
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
		updateFixedPanelStyle(next);
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
		const panel = panelEl;
		function onPointerDown(event: PointerEvent) {
			const target = event.target;
			if (!(target instanceof Node)) return;
			if (root?.contains(target) || panel?.contains(target)) return;
			setOpen(false);
		}
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') setOpen(false);
		}
		document.addEventListener('pointerdown', onPointerDown, true);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown, true);
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
	{#if joinItem}
		{#if label}
			<span class="label sr-only" id={labelTextId}>
				{label}{#if required}<span class="text-error" aria-hidden="true">*</span>{/if}
			</span>
		{/if}
		<button
			bind:this={triggerEl}
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
			<LucideChevronsUpDown
				className="size-5 shrink-0 opacity-60 {disabled ? 'opacity-40' : ''}"
				strokeWidth={1.75}
			/>
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
	{:else}
		<label class={fieldClass}>
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
				bind:this={triggerEl}
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
				<LucideChevronsUpDown
					className="size-5 shrink-0 opacity-60 {disabled ? 'opacity-40' : ''}"
					strokeWidth={1.75}
				/>
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
	{/if}

	{#if isOpen}
		<div
			bind:this={panelEl}
			use:portal={portalHost}
			class={panelClass}
			style={fixedPanelStyle}
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
