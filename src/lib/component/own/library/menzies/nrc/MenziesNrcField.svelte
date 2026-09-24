<script lang="ts">
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import {
		MYANMAR_NRC_CITIZENSHIP,
		MYANMAR_NRC_TOWNSHIP_NUMBERS
	} from '$lib/model/data/myanmar-nrc.data';
	import { m } from '$lib/paraglide/messages';
	import {
		codesForTownshipNumber,
		formatNrc,
		isValidNrcParts,
		parseNrc,
		type MyanmarNrcParts
	} from '$lib/tool/identity/myanmar-nrc.util';

	let {
		value = $bindable(''),
		disabled = false,
		id = 'menzies-nrc',
		className = ''
	}: {
		value?: string;
		disabled?: boolean;
		id?: string;
		className?: string;
	} = $props();

	let townshipNumber = $state('');
	let townshipCode = $state('');
	let citizenship = $state('N');
	let serial = $state('');
	/** Prevent write-back while hydrating from bound value. */
	let suppressWrite = $state(false);
	let lastHydrated = $state<string | null>(null);

	const msg = m as Record<string, (inputs?: object) => string>;

	const townshipNumberOptions = $derived(
		MYANMAR_NRC_TOWNSHIP_NUMBERS.map((n) => ({
			value: n,
			label: `${n}/`
		}))
	);
	const townshipCodeOptions = $derived(
		codesForTownshipNumber(townshipNumber).map((c) => ({
			value: c,
			label: c
		}))
	);
	const citizenshipOptions = $derived(
		MYANMAR_NRC_CITIZENSHIP.map((c) => ({
			value: c,
			label: `(${c})`
		}))
	);

	function writeValueFromParts(): void {
		if (suppressWrite) return;
		const parts: MyanmarNrcParts = {
			townshipNumber,
			townshipCode,
			citizenship: citizenship as MyanmarNrcParts['citizenship'],
			serial
		};
		if (isValidNrcParts(parts)) {
			const next = formatNrc(parts);
			if (value !== next) {
				value = next;
				lastHydrated = next;
			}
			return;
		}
		if (!townshipNumber && !townshipCode && !serial) {
			if (value !== '') {
				value = '';
				lastHydrated = '';
			}
		}
	}

	$effect(() => {
		const raw = value ?? '';
		if (raw === lastHydrated) return;
		suppressWrite = true;
		const parsed = parseNrc(raw);
		if (parsed) {
			townshipNumber = parsed.townshipNumber;
			townshipCode = parsed.townshipCode;
			citizenship = parsed.citizenship;
			serial = parsed.serial;
		} else if (!raw.trim()) {
			townshipNumber = '';
			townshipCode = '';
			citizenship = 'N';
			serial = '';
		}
		lastHydrated = raw;
		suppressWrite = false;
	});

	$effect(() => {
		void townshipNumber;
		void townshipCode;
		void citizenship;
		void serial;
		writeValueFromParts();
	});

	function onTownshipNumberChange(next?: string): void {
		townshipNumber = String(next ?? '');
		const codes = codesForTownshipNumber(townshipNumber);
		if (townshipCode && !codes.includes(townshipCode)) {
			townshipCode = '';
		}
	}

	function onSerialInput(e: Event): void {
		const el = e.currentTarget as HTMLInputElement;
		const digits = el.value.replace(/\D/g, '').slice(0, 6);
		if (digits !== serial) serial = digits;
		if (el.value !== digits) el.value = digits;
	}
</script>

<!--
	Manual horizontal join. Parent caps width to label+control; segments flex inside.
-->
<div
	class="flex w-full min-w-0 max-w-full items-stretch overflow-hidden rounded-[var(--radius-field)] border border-ink-border {className}"
>
	<div class="w-[4.5rem] min-w-[4.25rem] shrink-0 border-r border-ink-border">
		<WashSelect
			id="{id}-township"
			bind:value={townshipNumber}
			options={townshipNumberOptions}
			placeholder="#/"
			{disabled}
			aria-label={msg.nrc_township?.() ?? 'Township number'}
			className="rounded-none border-0 shadow-none"
			onChange={onTownshipNumberChange}
		/>
	</div>
	<SearchSelect
		joinItem
		inputId="{id}-code"
		bind:value={townshipCode}
		options={townshipCodeOptions}
		placeholder={msg.nrc_township_code?.() ?? 'Township code'}
		filterPlaceholder={msg.nrc_township_code?.() ?? 'Township code'}
		disabled={disabled || !townshipNumber}
		className="w-[8rem] min-w-[8rem] max-w-[8rem] shrink-0 rounded-none border-0 border-r border-ink-border shadow-none"
	/>
	<div class="w-[5.5rem] min-w-[5.5rem] shrink-0 border-r border-ink-border">
		<WashSelect
			id="{id}-citizenship"
			bind:value={citizenship}
			options={citizenshipOptions}
			placeholder="(N)"
			{disabled}
			aria-label={msg.nrc_citizenship?.() ?? 'Citizenship'}
			className="rounded-none border-0 shadow-none"
		/>
	</div>
	<WashInputField
		id="{id}-serial"
		bind:value={serial}
		inputType="text"
		inputPlaceholderText={msg.nrc_serial?.() ?? '000000'}
		className="min-w-[5rem] flex-1 rounded-none border-0 shadow-none"
		maxlength={6}
		minLength={0}
		{disabled}
		oninput={onSerialInput}
	/>
</div>
