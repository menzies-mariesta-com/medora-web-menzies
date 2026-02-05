<script lang="ts">
	let {
		id,
		className,
		inputPlaceholderText,
		inputType,
		inputPattern,
		inputTitle,
		minLength,
		maxlength,
		nameText,
		value,
		ariaLabel,
		rawStyle,
		checked,
		hidden,
		disabled,
		onClick
	} = $props<{
		id?: string;
		className?: string;
		inputPlaceholderText?: string;
		inputType?: string;
		inputPattern?: string;
		inputTitle?: string;
		minLength?: number;
		maxlength?: number;
		nameText?: string;
		value?: string;
		ariaLabel?: string;
		rawStyle?: boolean;
		checked?: boolean;
		hidden?: boolean;
		disabled?: boolean;
		onClick?: () => void;
	}>();
</script>

{#if rawStyle}
	<input
		{id}
		class={className}
		type={inputType}
		required
		placeholder={inputPlaceholderText}
		pattern={inputPattern}
		minlength={minLength ?? 1}
		maxlength={maxlength ?? 50}
		title={inputTitle}
		name={nameText}
		{value}
		aria-label={ariaLabel}
		onclick={onClick}
		{checked}
		{hidden}
		{disabled}
	/>
{:else}
	<input
		{id}
		class="d-input {className}"
		type={inputType}
		required
		placeholder={inputPlaceholderText}
		pattern={inputPattern}
		minlength={minLength ?? 1}
		maxlength={maxlength ?? 50}
		title={inputTitle}
		name={nameText}
		{value}
		aria-label={ariaLabel}
		{checked}
		{hidden}
		{disabled}
		onclick={onClick}
	/>
{/if}
