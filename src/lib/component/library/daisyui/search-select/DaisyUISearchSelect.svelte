<script lang="ts">
	interface Option {
		label: string;
		value: string;
	}

	let {
		options = [],
		placeholder = 'Search...',
		value = $bindable(''),
		onChange,
		className,
		disabled,
		/** When set, search is done via this async function (server-side). Options prop is ignored for the dropdown list. */
		searchFn,
		/** When using searchFn, call this to get the label for the selected value (e.g. when value is set but not in last search results). */
		getLabelForValue,
		debounceMs = 300,
		minSearchLength = 0
	} = $props<{
		options?: Option[];
		placeholder?: string;
		value?: string;
		onChange?: (value: string) => void;
		className?: string;
		disabled?: boolean;
		searchFn?: (query: string) => Promise<Option[]>;
		getLabelForValue?: (value: string) => Promise<string>;
		debounceMs?: number;
		minSearchLength?: number;
	}>();

	let search = $state('');
	let open = $state(false);
	let containerEl = $state<HTMLDivElement | null>(null);
	let optionsFromServer = $state<Option[]>([]);
	let isLoading = $state(false);
	let cachedLabelForValue = $state<string>('');
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	const isAsync = $derived(!!searchFn);
	const optionsList = $derived(isAsync ? optionsFromServer : options);
	/** When nothing selected (value empty), show '' so placeholder is visible; otherwise show option label or cached label. */
	const displayLabel = $derived(
		!value?.trim()
			? ''
			: optionsList.find((o) => o.value === value)?.label ?? cachedLabelForValue
	);
	const filtered = $derived(
		isAsync
			? optionsList
			: options.filter((o) =>
					o.label.toLowerCase().includes(search.toLowerCase())
				)
	);
	const inputValue = $derived(open ? search : displayLabel);

	function handleInput(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		search = target.value;
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
					optionsFromServer = await searchFn(search);
				} finally {
					isLoading = false;
				}
			}, debounceMs);
		}
	}

	function handleFocus() {
		open = true;
		search = displayLabel;
		if (isAsync && searchFn && search.length >= minSearchLength) {
			isLoading = true;
			searchFn(search).then((r) => {
				optionsFromServer = r;
				isLoading = false;
			});
		} else if (isAsync && search.length < minSearchLength) {
			optionsFromServer = [];
		}
	}

	function selectOption(option: Option) {
		value = option.value;
		search = option.label;
		open = false;
		onChange?.(option.value);
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
		return () => document.removeEventListener('mousedown', handleClickOutside);
	});

	// When value is set and we're in async mode, fetch label if not in current options
	$effect(() => {
		const v = value?.trim();
		if (!isAsync || !v || !getLabelForValue) return;
		if (optionsList.some((o) => o.value === v)) return;
		getLabelForValue(v).then((label) => {
			cachedLabelForValue = label;
		});
	});

	// Clear cached label when value is cleared
	$effect(() => {
		if (!value?.trim()) cachedLabelForValue = '';
	});
</script>

<div class="relative w-full" bind:this={containerEl}>
	<input
		type="text"
		class="d-input d-input-bordered w-full {className ?? ''}"
		value={inputValue}
		{placeholder}
		{disabled}
		oninput={handleInput}
		onfocus={handleFocus}
		role="combobox"
		aria-expanded={open}
		aria-haspopup="listbox"
		aria-autocomplete="list"
	/>

	{#if open}
		<ul
			class="d-menu bg-base-100 shadow-lg rounded-box mt-1 w-full absolute z-50 max-h-60 overflow-auto border"
			role="listbox"
		>
			{#if isLoading}
				<li class="disabled px-4 py-2 text-sm opacity-60">Loading…</li>
			{:else if filtered.length === 0}
				<li class="disabled px-4 py-2 text-sm opacity-60">
					{isAsync && search.length < minSearchLength
						? 'Type to search'
						: 'No results found'}
				</li>
			{:else}
				{#each filtered as option (option.value)}
					<li role="option">
						<button type="button" onclick={() => selectOption(option)}>
							{option.label}
						</button>
					</li>
				{/each}
			{/if}
		</ul>
	{/if}
</div>
