<script lang="ts">
	/**
	 * Gallery `SearchSelect` (design-menzies Select search) — Svelte port of
	 * `dropdown + btn + input + menu`. Medora extensions: `{ label, value }`
	 * options, `bind:value`, and optional async `searchFn`.
	 * @see https://design-menzies.netlify.app/ (Select search)
	 */
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { createWashId } from '@menzies-mariesta-com/menzies-design-wash-ui/core';

	export type SearchSelectOption = {
		label: string;
		value: string;
	};

	/** Gallery constant `b` */
	const PANEL_CLASS =
		'dropdown-content z-50 mt-1 w-full max-w-[min(100vw-1rem,28rem)] max-h-[min(70vh,20rem)] overflow-x-hidden overflow-y-auto rounded-box border border-ink-border bg-base-100 p-2 shadow-[var(--shadow-paper-md)]';
	/** Gallery constant `x` */
	const LIST_CLASS =
		'menu max-h-52 w-full overflow-y-auto overflow-x-hidden rounded-box p-0';

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
		placement = 'down',
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
		placement?: 'down' | 'up';
		filterPlaceholder?: string;
	} = $props();

	let open = $state(false);
	let filter = $state('');
	let containerEl = $state<HTMLDivElement | null>(null);
	let optionsFromServer = $state<SearchSelectOption[]>([]);
	let isLoading = $state(false);
	let cachedLabelForValue = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	const listboxId = createWashId('search-select');
	const filterInputId = createWashId('search-select-filter');
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
		return optionsList.filter((o) => matchesFilter(q, o.label));
	});
	const isOpen = $derived(open && !disabled);
	const dropdownClass = $derived(
		[
			'dropdown w-full',
			className,
			placement === 'up' ? 'dropdown-top' : '',
			isOpen ? 'dropdown-open' : ''
		]
			.filter(Boolean)
			.join(' ')
	);
	const panelClass = $derived(
		placement === 'up'
			? PANEL_CLASS.replace(' mt-1 ', ' mb-1 ')
			: PANEL_CLASS
	);
	const triggerBtnClass = $derived(
		[
			'btn w-full justify-between border-ink-border font-normal cursor-pointer',
			disabled ? 'btn-disabled cursor-not-allowed' : '',
			triggerClassName
		]
			.filter(Boolean)
			.join(' ')
	);
	const showLoadingOnly = $derived(
		isLoading && filtered.length === 0
	);

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
				<span class="label-text">
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
			class={triggerBtnClass}
			{disabled}
			onclick={toggleDropdown}
		>
			<span
				class={displayLabel
					? 'truncate'
					: 'truncate text-base-content/50'}
			>
				{displayLabel || placeholder}
			</span>
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
		<div class={panelClass}>
			<WashInputField
				id={filterInputId}
				bind:value={filter}
				inputType="search"
				inputPlaceholderText={filterPlaceholder}
				className="input-sm mb-2 w-full cursor-text border-ink-border {inputClassName}"
				ariaLabel={label ? `Filter ${label}` : 'Filter options'}
				minLength={0}
				maxlength={200}
				oninput={handleFilterInput}
			/>
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
						<li role="option" aria-selected={selected}>
							<button
								type="button"
								class="cursor-pointer {selected ? 'active' : ''}"
								onmousedown={(event) => event.preventDefault()}
								onclick={() => selectOption(option)}
							>
								<span class="truncate">{option.label}</span>
								{#if selected}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="size-4 opacity-70"
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
