<script lang="ts">
	interface Option {
		label: string;
		value: string;
	}

	import { AppEnum } from '$lib/model/enum/app.enum';

	let {
		options = [],
		placeholder = 'Search...',
		value = $bindable(''),
		onChange,
		className,
		disabled,
		/** Sets `id` on the combobox input (for `<label for>`). */
		inputId,
		/** When set, search is done via this async function (server-side). Options prop is ignored for the dropdown list. */
		searchFn,
		/** When using searchFn, call this to get the label for the selected value (e.g. when value is set but not in last search results). */
		getLabelForValue,
		debounceMs = 300,
		minSearchLength = 0,
		/** When this value changes (e.g. a parent filter), the async option list is cleared so the next search uses fresh results. */
		invalidateKey,
		/** Open the suggestion list above the input (e.g. near bottom of a modal). */
		placement = 'down'
	} = $props<{
		options?: Option[];
		placeholder?: string;
		value?: string;
		onChange?: (value: string) => void;
		className?: string;
		disabled?: boolean;
		inputId?: string;
		searchFn?: (query: string) => Promise<Option[]>;
		getLabelForValue?: (value: string) => Promise<string>;
		debounceMs?: number;
		minSearchLength?: number;
		invalidateKey?: unknown;
		placement?: 'down' | 'up';
	}>();

	let search = $state('');
	/** Sync mode only: narrows `options` in the list; cleared on focus so full list shows while input shows `displayLabel`. */
	let listFilter = $state('');
	let open = $state(false);
	let containerEl = $state<HTMLDivElement | null>(null);
	let inputEl = $state<HTMLInputElement | null>(null);
	let optionsFromServer = $state<Option[]>([]);
	let isLoading = $state(false);
	let cachedLabelForValue = $state<string>('');
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	const isAsync = $derived(!!searchFn);
	const optionsList = $derived(isAsync ? optionsFromServer : options);
	const listboxId = 'daisyui-search-select-listbox';
	/** When nothing selected (value empty), show '' so placeholder is visible; otherwise show option label or cached label. */
	const displayLabel = $derived(
		!value?.trim()
			? ''
			: (optionsList.find((o: Option) => o.value === value)?.label ??
					cachedLabelForValue)
	);
	const filtered = $derived(
		isAsync
			? optionsList
			: options.filter((o: Option) => {
					const q = listFilter.trim().toLowerCase();
					if (!q) return true;
					return o.label.toLowerCase().includes(q);
				})
	);
	const inputValue = $derived(open ? search : displayLabel);

	function handleInput(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		search = target.value;
		if (!isAsync) listFilter = target.value;
		open = true;
		if (isAsync && searchFn) {
			if (debounceTimer) clearTimeout(debounceTimer);
			if (search.length < minSearchLength) {
				optionsFromServer = [];
				debounceTimer = null;
				return;
			}
			debounceTimer = setTimeout(async () => {
				isLoading = true;
				try {
					optionsFromServer = (await searchFn(search)).slice(
						0,
						AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT
					);
				} finally {
					isLoading = false;
				}
			}, debounceMs);
		}
	}

	function handleFocus() {
		open = true;
		search = displayLabel;
		if (!isAsync) listFilter = '';
		if (isAsync && searchFn && search.length >= minSearchLength) {
			isLoading = true;
			searchFn(search).then((r: Option[]) => {
				optionsFromServer = r.slice(0, AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT);
				isLoading = false;
			});
		} else if (isAsync && search.length < minSearchLength) {
			optionsFromServer = [];
		}
	}

	function selectOption(option: Option) {
		value = option.value;
		search = option.label;
		listFilter = '';
		open = false;
		onChange?.(option.value);
		inputEl?.blur();
	}

	function handleInputBlur() {
		requestAnimationFrame(() => {
			if (!containerEl) {
				open = false;
				return;
			}
			const active = document.activeElement;
			if (!active || !containerEl.contains(active)) {
				open = false;
			}
		});
	}

	$effect(() => {
		if (!open) return;
		const el = containerEl;
		if (!el) return;
		function handleClickOutside(event: MouseEvent) {
			if (el && !el.contains(event.target as Node)) {
				open = false;
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () =>
			document.removeEventListener('mousedown', handleClickOutside);
	});

	// When value is set and we're in async mode, fetch label if not in current options
	$effect(() => {
		const v = value?.trim();
		if (!isAsync || !v || !getLabelForValue) return;
		if (optionsList.some((o: Option) => o.value === v)) return;
		getLabelForValue(v).then((label: string) => {
			cachedLabelForValue = label;
		});
	});

	// Clear cached label when value is cleared
	$effect(() => {
		if (!value?.trim()) cachedLabelForValue = '';
	});

	$effect(() => {
		void invalidateKey;
		if (isAsync) optionsFromServer = [];
	});
</script>

<div class="relative w-full" bind:this={containerEl}>
	<input
		id={inputId}
		type="text"
		class="d-input-bordered d-input w-full {className ?? ''}"
		bind:this={inputEl}
		value={inputValue}
		{placeholder}
		{disabled}
		oninput={handleInput}
		onfocus={handleFocus}
		onblur={handleInputBlur}
		role="combobox"
		aria-controls={listboxId}
		aria-expanded={open}
		aria-haspopup="listbox"
		aria-autocomplete="list"
	/>

	{#if open}
		<ul
			id={listboxId}
			class="d-menu absolute z-50 left-0 right-0 flex max-h-60 w-full flex-col overflow-y-auto overflow-x-hidden rounded-box border bg-base-100 shadow-lg {placement ===
			'up'
				? 'bottom-full mb-1'
				: 'top-full mt-1'}"
			role="listbox"
		>
			{#if isLoading}
				<li class="disabled px-4 py-2 text-sm opacity-60">
					Loading…
				</li>
			{:else if filtered.length === 0}
				<li class="disabled px-4 py-2 text-sm opacity-60">
					{isAsync && search.length < minSearchLength
						? 'Type to search'
						: 'No results found'}
				</li>
			{:else}
				{#each filtered as option (option.value)}
					<li
						role="option"
						class="w-full"
						aria-selected={option.value === value}
					>
						<button
							type="button"
							class="w-full justify-start text-left"
							onmousedown={(event) => {
								event.preventDefault();
								selectOption(option);
							}}
						>
							{option.label}
						</button>
					</li>
				{/each}
			{/if}
		</ul>
	{/if}
</div>
