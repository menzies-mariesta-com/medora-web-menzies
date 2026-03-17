<script>
	import DaisyUiFooter from '$lib/component/library/daisyui/footer/DaisyUiFooter.svelte';
	import LucideCopyright from '$lib/component/library/lucide/LucideCopyright.svelte';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { APP_VERSION } from '$lib/version';

	const dateTimeUtil = new DateTimeUtil();
	const lifeCycleUtil = new LifeCycleUtil();

	let time = $state('');

	function updateTime() {
		const now = new Date();

		const h = String(now.getHours()).padStart(2, '0');
		const mins = String(now.getMinutes()).padStart(2, '0');
		const s = String(now.getSeconds()).padStart(2, '0');

		time = `${h}:${mins}:${s}`;
	}

	lifeCycleUtil.onMount(() => {
		updateTime();
		const interval = setInterval(updateTime, 1000);

		return () => clearInterval(interval);
	});
</script>

<DaisyUiFooter
	className="bg-base-200  px-5 py-2 flex items-center justify-between"
>
	<div id="copyright" class="flex items-center">
		<LucideCopyright />
		{dateTimeUtil.getCurrentYear()}
		{m.heka()}. {m.all_rights_reserved()}
	</div>

	<div id="time">
		<span class="d-countdown">
			<span style="--d-value:{time.split(':')[0]}"></span> h
			<span style="--d-value:{time.split(':')[1]}"></span> m
			<span style="--d-value:{time.split(':')[2]}"></span> s
		</span>
	</div>

	<div id="version" class="mr-12">{m.version()} v{APP_VERSION}</div>
</DaisyUiFooter>
