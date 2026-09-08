<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashFab from '$lib/component/wash/fab/WashFab.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucideHand from '../library/lucide/LucideHand.svelte';
	import LucideLanguages from '../library/lucide/LucideLanguages.svelte';
	import LucideMessageCircleQuestionMark from '../library/lucide/LucideMessageCircleQuestionMark.svelte';
	import LucidePalette from '../library/lucide/LucidePalette.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import ChangeLanguageModal from '$lib/component/own/snippet/modal/ChangeLanguageModal.svelte';
	import { LanguageEnum } from '$lib/model/enum/language.enum';
	import { LanguageTool } from '$lib/tool/language.tool.svelte';
	import ChangeAppearanceModal from '../snippet/modal/ChangeAppearanceModal.svelte';
	import SupportTicketDialogContent from '../snippet/modal/SupportTicketDialogContent.svelte';
	import { m } from '$lib/paraglide/messages';
	import type {
		WashModeEnum,
		WashPigmentEnum
	} from '$lib/model/enum/wash-theme.enum';
	import { WashThemeTool } from '$lib/tool/wash-theme.tool.svelte';
	import { WashThemeState } from '$lib/state/wash-theme.state.svelte';

	const languageTool = new LanguageTool();
	const washThemeTool = new WashThemeTool();

	function openLanguageDialog() {
		dialogService.open({
			component: ChangeLanguageModal,
			onConfirm: (data?: { language: LanguageEnum }) => {
				if (data?.language)
					languageTool.changeLanguage(data.language);
			}
		});
	}

	function openThemeSettings() {
		dialogService.open({
			component: ChangeAppearanceModal,
			onConfirm: (data?: {
				pigment: WashPigmentEnum;
				mode: WashModeEnum;
			}) => {
				if (data?.pigment && data?.mode) {
					washThemeTool.apply(data.pigment, data.mode);
					WashThemeState.pigment = data.pigment;
					WashThemeState.mode = data.mode;
				}
			}
		});
	}

	async function openSupportDialog() {
		await dialogService.open({
			component: SupportTicketDialogContent,
			fullScreen: true
		});
	}
</script>

<WashFab>
	<WashTooltip
		tooltipText={m.quick_tool()}
		className=" tooltip-secondary"
	>
		<WashButton
			className="btn-circle btn-lg btn-secondary"
			onClick={() => {}}
		>
			<LucideHand />
		</WashButton>
	</WashTooltip>

	<WashTooltip tooltipText={m.support()} className=" ">
		<WashButton
			className="btn-circle btn-lg"
			onClick={openSupportDialog}
		>
			<LucideMessageCircleQuestionMark />
		</WashButton>
	</WashTooltip>

	<WashTooltip tooltipText={m.theme()} className=" ">
		<WashButton
			onClick={openThemeSettings}
			className="btn-circle btn-lg"
		>
			<LucidePalette />
		</WashButton>
	</WashTooltip>

	<WashTooltip tooltipText={m.languages()} className=" ">
		<WashButton
			onClick={openLanguageDialog}
			className="btn-circle btn-lg"
		>
			<LucideLanguages />
		</WashButton>
	</WashTooltip>
</WashFab>
