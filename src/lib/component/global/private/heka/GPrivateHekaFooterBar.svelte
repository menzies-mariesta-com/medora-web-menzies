<script>
	import DaisyUiFooter from '$lib/component/library/daisyui/footer/DaisyUiFooter.svelte';
	import LucideCopyright from '$lib/component/library/lucide/LucideCopyright.svelte';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { m } from '$lib/paraglide/messages';

	const dateTimeUtil = new DateTimeUtil();
</script>

<DaisyUiFooter
	className="bg-base-200  px-5 py-2 flex items-center justify-between"
>
	<div id="copyright" class="flex items-center">
		<LucideCopyright />
		{dateTimeUtil.getCurrentYear()}
		{m.heka()}. All rights reserved.
	</div>

	<div id="time">
		<span class="d-countdown">
			<span style="--d-value:10;" aria-live="polite" aria-label="10"
				>10</span
			>
			h
			<span style="--d-value:24;" aria-live="polite" aria-label="24"
				>24</span
			>
			m
			<span style="--d-value:59;" aria-live="polite" aria-label="59"
				>59</span
			>
			s
		</span>
	</div>

	<div id="version" class="mr-12">v0.0.1</div>
</DaisyUiFooter>
