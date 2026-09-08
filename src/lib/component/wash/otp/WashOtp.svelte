<script lang="ts">
	/**
	 * Wash OTP field matching Menzies Design `.otp` slots + single input.
	 */
	let {
		id,
		name = 'otp',
		length = 6,
		value = $bindable(''),
		ariaLabel,
		disabled = false,
		required = false,
		className = '',
		oninput
	}: {
		id?: string;
		name?: string;
		length?: number;
		value?: string;
		ariaLabel?: string;
		disabled?: boolean;
		required?: boolean;
		className?: string;
		oninput?: (e: Event) => void;
	} = $props();

	const slots = $derived(Array.from({ length }, (_, i) => i));

	function handleInput(e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		const next = el.value.replace(/\D/g, '').slice(0, length);
		value = next;
		el.value = next;
		oninput?.(e);
	}
</script>

<label class="otp w-full cursor-text {className}" for={id}>
	{#each slots as i (i)}
		<span aria-hidden="true"></span>
	{/each}
	<input
		{id}
		{name}
		type="text"
		autocomplete="one-time-code"
		inputmode="numeric"
		maxlength={length}
		pattern={`[0-9]{${length}}`}
		{required}
		{disabled}
		aria-label={ariaLabel}
		value={value}
		oninput={handleInput}
	/>
</label>
