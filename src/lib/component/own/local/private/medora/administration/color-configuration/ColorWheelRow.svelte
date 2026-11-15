<script lang="ts">
	import LucideRotateCcw from '$lib/component/own/library/lucide/LucideRotateCcw.svelte';
	import {
		colorToHex,
		hexToHsl,
		hslToHex,
		hueFromPointer,
		hueIndicatorPercent,
		type Hsl
	} from '$lib/tool/color/color-hsl.util';
	import { normalizeColorInput } from '$lib/tool/color/validate-color.util';

	let {
		label,
		value,
		hueLabel,
		saturationLabel,
		saturationMark,
		lightnessLabel,
		lightnessMark,
		hexLabel,
		resetLabel,
		onColor,
		onReset
	}: {
		label: string;
		value: string;
		hueLabel: string;
		saturationLabel: string;
		saturationMark: string;
		lightnessLabel: string;
		lightnessMark: string;
		hexLabel: string;
		resetLabel: string;
		onColor: (hex: string) => void;
		onReset: () => void;
	} = $props();

	const hsl = $derived(hexToHsl(value));
	const swatch = $derived(colorToHex(value));
	const indicator = $derived(hueIndicatorPercent(hsl.h));
	let hexDraft = $state<string | null>(null);
	const hexText = $derived(hexDraft ?? swatch);

	const wheelBackground =
		'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)';

	function emit(next: Hsl) {
		hexDraft = null;
		onColor(hslToHex(next));
	}

	function paintHue(event: PointerEvent) {
		const el = event.currentTarget as HTMLElement;
		const h = hueFromPointer(
			event.clientX,
			event.clientY,
			el.getBoundingClientRect()
		);
		emit({ ...hsl, h });
	}

	function onWheelKey(event: KeyboardEvent) {
		const step = event.shiftKey ? 15 : 2;
		if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
			event.preventDefault();
			emit({ ...hsl, h: hsl.h + step });
		} else if (
			event.key === 'ArrowLeft' ||
			event.key === 'ArrowDown'
		) {
			event.preventDefault();
			emit({ ...hsl, h: hsl.h - step });
		}
	}

	function setChannel(channel: 's' | 'l', raw: string) {
		const n = Number(raw);
		if (!Number.isFinite(n)) return;
		emit({ ...hsl, [channel]: n });
	}

	function onHexInput(event: Event) {
		const raw = (event.currentTarget as HTMLInputElement).value;
		const norm = normalizeColorInput(raw);
		if (
			norm?.startsWith('#') &&
			(norm.length === 7 || norm.length === 9)
		) {
			hexDraft = null;
			onColor(norm.slice(0, 7));
			return;
		}
		hexDraft = raw;
	}

	const hexInvalid = $derived.by(() => {
		const raw = hexText.trim();
		if (!raw) return false;
		const norm = normalizeColorInput(raw);
		return !(
			norm?.startsWith('#') &&
			(norm.length === 7 || norm.length === 9)
		);
	});
</script>

<div
	class="flex flex-col gap-2 border-b border-base-300 py-3 sm:flex-row sm:items-center sm:gap-3"
>
	<span class="shrink-0 text-sm sm:w-40">{label}</span>
	<div class="flex min-w-0 flex-1 flex-wrap items-center gap-3">
		<button
			type="button"
			class="relative size-10 shrink-0 cursor-pointer rounded-full border border-base-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
			style="background: {wheelBackground}"
			aria-label={hueLabel}
			aria-valuemin={0}
			aria-valuemax={360}
			aria-valuenow={hsl.h}
			role="slider"
			onpointerdown={(event) => {
				(event.currentTarget as HTMLElement).setPointerCapture(
					event.pointerId
				);
				paintHue(event);
			}}
			onpointermove={(event) => {
				if (event.buttons !== 1) return;
				paintHue(event);
			}}
			onkeydown={onWheelKey}
		>
			<span
				class="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-base-100 bg-base-100 shadow-sm"
				style="left: {indicator.left}; top: {indicator.top}"
				aria-hidden="true"
			></span>
		</button>
		<label class="flex items-center gap-1">
			<span class="w-3 text-xs text-base-content/60"
				>{saturationMark}</span
			>
			<input
				type="range"
				min="0"
				max="100"
				value={hsl.s}
				class="range range-xs w-24"
				aria-label={saturationLabel}
				oninput={(event) =>
					setChannel('s', event.currentTarget.value)}
			/>
		</label>
		<label class="flex items-center gap-1">
			<span class="w-3 text-xs text-base-content/60"
				>{lightnessMark}</span
			>
			<input
				type="range"
				min="0"
				max="100"
				value={hsl.l}
				class="range range-xs w-24"
				aria-label={lightnessLabel}
				oninput={(event) =>
					setChannel('l', event.currentTarget.value)}
			/>
		</label>
		<span
			class="rounded-box size-8 shrink-0 border border-base-300"
			style="background-color: {swatch}"
			aria-hidden="true"
		></span>
		<label class="flex items-center gap-1">
			<span class="sr-only">{hexLabel}</span>
			<input
				type="text"
				class="input input-xs input-bordered w-28 font-mono {hexInvalid
					? 'input-error'
					: ''}"
				value={hexText}
				spellcheck="false"
				maxlength={9}
				aria-label={hexLabel}
				oninput={onHexInput}
			/>
		</label>
		<button
			type="button"
			class="btn btn-ghost btn-square btn-xs"
			title={resetLabel}
			aria-label={resetLabel}
			onclick={() => {
				hexDraft = null;
				onReset();
			}}
		>
			<LucideRotateCcw className="size-3.5" />
		</button>
	</div>
</div>
