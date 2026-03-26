<script lang="ts">
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucideInfo from '$lib/component/own/library/lucide/LucideInfo.svelte';
	import LucideTriangleAlert from '$lib/component/own/library/lucide/LucideTriangleAlert.svelte';
	import LucideCircleX from '$lib/component/own/library/lucide/LucideCircleX.svelte';

	let {
		type = StatusColorEnum.INFO,
		className = '',
		message = ''
	}: {
		type: StatusColorEnum;
		className?: string;
		message: string;
	} = $props();

	// Map enum -> daisyUI class + icon
	const typeClassMap: Record<StatusColorEnum, string> = {
		[StatusColorEnum.SUCCESS]: 'd-alert-success',
		[StatusColorEnum.INFO]: 'd-alert-info',
		[StatusColorEnum.WARNING]: 'd-alert-warning',
		[StatusColorEnum.ERROR]: 'd-alert-error'
	};

	const iconMap: Record<StatusColorEnum, typeof LucideCircleCheck> = {
		[StatusColorEnum.SUCCESS]: LucideCircleCheck,
		[StatusColorEnum.INFO]: LucideInfo,
		[StatusColorEnum.WARNING]: LucideTriangleAlert,
		[StatusColorEnum.ERROR]: LucideCircleX
	};

	// `type`/`className` are props; compute derived values reactively.
	const alertClass = $derived(
		`d-alert ${typeClassMap[type]} ${className ?? ''}`.trim()
	);
	const Icon = $derived(() => iconMap[type]);
</script>

<div role="alert" class="{alertClass} flex items-center shadow-lg">
	<Icon />
	<div class="text-black">
		{message}
	</div>
</div>
