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
		value = $bindable(),
		ariaLabel,
		rawStyle,
		checked,
		hidden,
		disabled,
		required,
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
		required?: boolean;
		onClick?: () => void;
	}>();
</script>

{#if rawStyle}
	<input
		{id}
		class={className}
		type={inputType}
		placeholder={inputPlaceholderText}
		pattern={inputPattern}
		minlength={minLength ?? 1}
		maxlength={maxlength ?? 50}
		title={inputTitle}
		name={nameText}
		bind:value
		aria-label={ariaLabel}
		onclick={onClick}
		{required}
		{checked}
		{hidden}
		{disabled}
	/>
{:else}
	<input
		{id}
		class="d-input {className}"
		type={inputType}
		placeholder={inputPlaceholderText}
		pattern={inputPattern}
		minlength={minLength ?? 1}
		maxlength={maxlength ?? 50}
		title={inputTitle}
		name={nameText}
		bind:value
		aria-label={ariaLabel}
		{required}
		{checked}
		{hidden}
		{disabled}
		onclick={onClick}
	/>
{/if}
