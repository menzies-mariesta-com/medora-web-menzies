<script lang="ts">
	/**
	 * Menzies Design Wash Select (web 1.2.0).
	 * daisyUI-styled trigger + custom listbox (not the OS native picker).
	 * Placement flips via `measureDropdownPlacement`; menu width defaults to trigger.
	 * Menu is portaled to the nearest `<dialog>` (or `document.body`) with fixed
	 * positioning so scrollable modal bodies cannot clip the list.
	 * @see https://design-menzies.netlify.app/ — Select
	 */
	import OverflowText from '$lib/component/own/library/menzies/overflow-marquee/OverflowText.svelte';
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

	export type WashSelectOption = {
		value: string;
		label: string;
		disabled?: boolean;
	};

	export type WashSelectOptionGroup = {
		label: string;
		options: readonly WashSelectOption[];
	};

	export type WashSelectMenuWidth = 'trigger' | 'auto' | number | string;

	type SelectItem = WashSelectOption | WashSelectOptionGroup;

	function isOptionGroup(item: SelectItem): item is WashSelectOptionGroup {
		return (
			typeof item === 'object' &&
			item != null &&
			'options' in item &&
			Array.isArray((item as WashSelectOptionGroup).options)
		);
	}

	function flattenOptions(items: readonly SelectItem[]): WashSelectOption[] {
		const out: WashSelectOption[] = [];
		for (const item of items) {
			if (isOptionGroup(item)) out.push(...item.options);
			else out.push(item);
		}
		return out;
	}

	function resolveMenuPanelStyle(
		menuWidth: WashSelectMenuWidth,
		triggerWidthPx: number | null
	): Record<string, string | number> | undefined {
		if (menuWidth === 'auto') return undefined;
		if (menuWidth === 'trigger') {
			if (triggerWidthPx == null || triggerWidthPx <= 0) return undefined;
			return {
				width: triggerWidthPx,
				minWidth: triggerWidthPx,
				maxWidth: triggerWidthPx
			};
		}
		return {
			width: menuWidth,
			minWidth: menuWidth,
			maxWidth: menuWidth
		};
	}

	function readOptionsFromSelect(
		el: HTMLSelectElement | null
	): WashSelectOption[] {
		if (!el) return [];
		// Skip empty-value mirror options — those are placeholders (optionHeader).
		return [...el.options]
			.filter((opt) => opt.value !== '')
			.map((opt) => ({
				value: opt.value,
				label: (opt.textContent ?? opt.label ?? opt.value)
					.replace(/\s+/g, ' ')
					.trim(),
				disabled: opt.disabled
			}))
			.filter((opt) => opt.label.length > 0);
	}

	let {
		children,
		options: optionsProp,
		className = '',
		optionHeader,
		placeholder,
		label,
		hint,
		onChange,
		value = $bindable(),
		disabled = false,
		required = false,
		id,
		name,
		menuWidth = 'trigger' as WashSelectMenuWidth,
		menuClassName = '',
		'aria-label': ariaLabel
	}: {
		children?: () => void;
		options?: readonly SelectItem[];
		className?: string;
		/** Legacy placeholder (empty `<option value="">`). Prefer `placeholder`. */
		optionHeader?: string;
		placeholder?: string;
		label?: string;
		hint?: string;
		onChange?: (value?: string) => void;
		value?: any;
		disabled?: boolean;
		required?: boolean;
		id?: string;
		name?: string;
		menuWidth?: WashSelectMenuWidth;
		menuClassName?: string;
		'aria-label'?: string;
	} = $props();

	const DEFAULT_PLACEMENT: DropdownPlacement = {
		end: false,
		top: false,
		maxHeight: 280
	};

	let open = $state(false);
	let rootEl = $state<HTMLDivElement | null>(null);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let panelEl = $state<HTMLDivElement | null>(null);
	let mirrorEl = $state<HTMLSelectElement | null>(null);
	let childOptions = $state<WashSelectOption[]>([]);
	let triggerWidthPx = $state<number | null>(null);
	let placement = $state<DropdownPlacement>({ ...DEFAULT_PLACEMENT });
	/** Viewport-fixed CSS for the portaled panel (string — reliable max-height). */
	let fixedPanelStyle = $state('');

	const selectId = $derived(id ?? createWashId('select'));
	const listId = $derived(`${selectId}-list`);
	const labelId = $derived(`${selectId}-label`);
	const resolvedPlaceholder = $derived(
		placeholder ?? optionHeader ?? 'Choose…'
	);

	const useChildren = $derived(
		optionsProp == null && typeof children === 'function'
	);

	const items = $derived.by((): SelectItem[] => {
		if (optionsProp != null) return [...optionsProp];
		return childOptions;
	});

	const flat = $derived(flattenOptions(items));
	const selected = $derived(
		flat.find((opt) => String(opt.value) === String(value ?? '')) ?? null
	);
	const menuOpen = $derived(open && !disabled);

	const rootClass = $derived(
		dropdownPlacementClassName(
			placement,
			`dropdown-no-hover w-full ${menuOpen ? 'dropdown-open' : ''}`.trim()
		)
	);

	const triggerClass = $derived(
		[
			'select wash-select--icon inline-flex w-full cursor-pointer items-center justify-between gap-2 border-ink-border text-start font-normal',
			disabled && 'cursor-not-allowed opacity-60',
			className
		]
			.filter(Boolean)
			.join(' ')
	);

	const panelClass = $derived(
		[
			'fixed z-[10050] max-h-[min(17.5rem,70dvh)]',
			menuWidth === 'auto'
				? 'w-full max-w-[min(100vw-1rem,24rem)]'
				: '',
			'overflow-x-hidden overflow-y-auto overscroll-contain rounded-box border border-ink-border bg-base-100 p-2 shadow-[var(--shadow-paper-md)]',
			menuClassName
		]
			.filter(Boolean)
			.join(' ')
	);

	function portalHost(): HTMLElement | null {
		return rootEl?.closest('dialog') ?? null;
	}

	function syncChildOptions() {
		childOptions = readOptionsFromSelect(mirrorEl);
	}

	function updateFixedPanelStyle(nextPlacement: DropdownPlacement) {
		const el = triggerEl ?? rootEl;
		if (!el || typeof window === 'undefined') return;
		const rect = el.getBoundingClientRect();
		const gap = 4;
		const maxH = Math.max(
			120,
			Math.min(280, Math.round(nextPlacement.maxHeight))
		);
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
		const width = resolveMenuPanelStyle(menuWidth, triggerWidthPx);
		if (width) {
			for (const [key, val] of Object.entries(width)) {
				const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
				parts.push(
					`${cssKey}:${typeof val === 'number' ? `${val}px` : val}`
				);
			}
		}
		fixedPanelStyle = parts.join(';');
	}

	function updatePlacement() {
		const el = rootEl;
		if (!el) return;
		const panelW =
			menuWidth === 'trigger' && triggerWidthPx != null
				? triggerWidthPx
				: typeof menuWidth === 'number'
					? menuWidth
					: 320;
		const next = measureDropdownPlacement(el, {
			panelWidth: panelW,
			panelHeight: 280
		});
		const prev = untrack(() => placement);
		if (!sameDropdownPlacement(prev, next)) placement = next;
		updateFixedPanelStyle(next);
	}

	function measureTriggerWidth() {
		const node = triggerEl;
		if (!node || menuWidth !== 'trigger') {
			triggerWidthPx = null;
			return;
		}
		const width = node.getBoundingClientRect().width;
		triggerWidthPx = width > 0 ? Math.round(width) : null;
	}

	function setOpen(next: boolean) {
		if (disabled) return;
		open = next;
	}

	function toggle() {
		if (disabled) return;
		setOpen(!open);
	}

	function commit(next: string) {
		value = next;
		onChange?.(next);
		setOpen(false);
	}

	$effect(() => {
		if (!useChildren) return;
		void value;
		void optionHeader;
		const el = mirrorEl;
		if (!el) return;
		queueMicrotask(syncChildOptions);
		if (typeof MutationObserver === 'undefined') return;
		const mo = new MutationObserver(() => syncChildOptions());
		mo.observe(el, {
			childList: true,
			subtree: true,
			characterData: true,
			attributes: true
		});
		return () => mo.disconnect();
	});

	$effect(() => {
		if (!menuOpen || menuWidth !== 'trigger') {
			triggerWidthPx = null;
			return;
		}
		measureTriggerWidth();
		const node = triggerEl;
		const ro =
			typeof ResizeObserver !== 'undefined'
				? new ResizeObserver(() => measureTriggerWidth())
				: null;
		if (node) ro?.observe(node);
		window.addEventListener('resize', measureTriggerWidth);
		return () => {
			ro?.disconnect();
			window.removeEventListener('resize', measureTriggerWidth);
		};
	});

	$effect(() => {
		if (!menuOpen) return;
		void triggerWidthPx;
		updatePlacement();
		window.addEventListener('resize', updatePlacement);
		window.addEventListener('scroll', updatePlacement, true);
		return () => {
			window.removeEventListener('resize', updatePlacement);
			window.removeEventListener('scroll', updatePlacement, true);
		};
	});

	$effect(() => {
		if (!menuOpen) return;
		const root = rootEl;
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
</script>

<div class={rootClass} bind:this={rootEl}>
	<div class="form-control w-full min-w-0">
		{#if label}
			<span class="label">
				<span class="label-text" id={labelId}>
					{label}{#if required}<span
							class="align-top text-sm leading-none text-error"
							aria-hidden="true">*</span
						>{/if}
				</span>
			</span>
		{/if}

		<button
			bind:this={triggerEl}
			type="button"
			id={selectId}
			role="combobox"
			aria-expanded={menuOpen}
			aria-controls={listId}
			aria-haspopup="listbox"
			aria-required={required || undefined}
			aria-labelledby={label ? labelId : undefined}
			aria-label={ariaLabel}
			class={triggerClass}
			{disabled}
			onclick={toggle}
		>
			<OverflowText
				className="min-w-0 flex-1 {selected
					? ''
					: 'text-base-content/50'}"
				text={selected?.label ?? resolvedPlaceholder}
			/>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="size-5 shrink-0 opacity-60 {disabled
					? 'opacity-40'
					: ''}"
				aria-hidden="true"
			>
				<path d="m6 9 6 6 6-6"></path>
			</svg>
		</button>

		{#if name || required}
			<input
				type="text"
				class="sr-only"
				tabindex="-1"
				{name}
				{required}
				{disabled}
				value={value ?? ''}
				aria-hidden="true"
				oninput={() => {}}
			/>
		{/if}

		{#if hint}
			<span class="label">
				<span class="label-text-alt">{hint}</span>
			</span>
		{/if}
	</div>

	{#if useChildren}
		<!-- Mirror native options from snippet children (legacy WashSelect API). -->
		<select
			bind:this={mirrorEl}
			class="sr-only"
			tabindex="-1"
			aria-hidden="true"
			disabled
		>
			{#if optionHeader != null && optionHeader !== ''}
				<option value="">{optionHeader}</option>
			{/if}
			{@render children?.()}
		</select>
	{/if}

	{#if menuOpen}
		<div
			bind:this={panelEl}
			use:portal={portalHost}
			class={panelClass}
			style={fixedPanelStyle}
		>
			<ul
				id={listId}
				role="listbox"
				class="menu flex w-full flex-col flex-nowrap overflow-x-hidden overflow-y-auto rounded-box p-0"
				tabindex="-1"
			>
				{#if items.length === 0}
					<li class="px-3 py-2 text-sm text-ink-muted">No options</li>
				{:else}
					{#each items as item, index (isOptionGroup(item) ? `g-${item.label}-${index}` : item.value)}
						{#if isOptionGroup(item)}
							<li class="menu-title">{item.label}</li>
							{#each item.options as opt (opt.value)}
								{@const active =
									String(value ?? '') === String(opt.value)}
								<li
									role="option"
									aria-selected={active}
								>
									<button
										type="button"
										disabled={opt.disabled}
										class="cursor-pointer {active
											? 'active'
											: ''} {opt.disabled
											? 'cursor-not-allowed opacity-50'
											: ''}"
										onmousedown={(event) =>
											event.preventDefault()}
										onclick={() => {
											if (!opt.disabled) commit(opt.value);
										}}
									>
										<span class="truncate">{opt.label}</span>
										{#if active}
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
						{:else}
							{@const active =
								String(value ?? '') === String(item.value)}
							<li role="option" aria-selected={active}>
								<button
									type="button"
									disabled={item.disabled}
									class="cursor-pointer {active
										? 'active'
										: ''} {item.disabled
										? 'cursor-not-allowed opacity-50'
										: ''}"
									onmousedown={(event) => event.preventDefault()}
									onclick={() => {
										if (!item.disabled) commit(item.value);
									}}
								>
									<span class="truncate">{item.label}</span>
									{#if active}
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
						{/if}
					{/each}
				{/if}
			</ul>
		</div>
	{/if}
</div>
