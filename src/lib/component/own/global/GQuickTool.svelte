<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiFab from '$lib/component/daisyui/fab/DaisyUiFab.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideHand from '../library/lucide/LucideHand.svelte';
	import LucideLanguages from '../library/lucide/LucideLanguages.svelte';
	import LucideMessageCircleQuestionMark from '../library/lucide/LucideMessageCircleQuestionMark.svelte';
	import LucidePalette from '../library/lucide/LucidePalette.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import ChangeLanguageModal from '$lib/component/own/snippet/modal/ChangeLanguageModal.svelte';
	import { LanguageEnum } from '$lib/model/enum/language.enum';
	import { LanguageTool } from '$lib/tool/language.tool.svelte';
	import { ThemeTool } from '$lib/tool/theme.tool.svelte';
	import type { ThemeEnum } from '$lib/model/enum/theme.enum';
	import { LocalStorageUtil } from '$lib/util/local-storage.util.svelte';
	import ChangeAppearanceModal from '../snippet/modal/ChangeAppearanceModal.svelte';
	import SupportTicketDialogContent from '../snippet/modal/SupportTicketDialogContent.svelte';
	import type { FontEnum } from '$lib/model/enum/font.enum';
	import { FontTool } from '$lib/tool/font.tool.svelte';
	import { m } from '$lib/paraglide/messages';

	const languageTool = new LanguageTool();
	const localStorageUtil = new LocalStorageUtil();
	const themeTool = new ThemeTool(localStorageUtil);
	const fontTool = new FontTool(localStorageUtil);

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
			onConfirm: (data?: { theme: ThemeEnum; font: FontEnum }) => {
				if (data?.theme) themeTool.setTheme(data.theme);
				if (data?.font) fontTool.setFont(data.font);
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

<DaisyUiFab>
	<DaisyUiTooltip
		tooltipText={m.quick_tool()}
		className="d-tooltip-left d-tooltip-secondary"
	>
		<DaisyUiButton
			className="d-btn-circle d-btn-lg d-btn-secondary"
			onClick={() => {}}
		>
			<LucideHand />
		</DaisyUiButton>
	</DaisyUiTooltip>

	<DaisyUiTooltip
		tooltipText={m.support()}
		className="d-tooltip-left "
	>
		<DaisyUiButton
			className="d-btn-circle d-btn-lg"
			onClick={openSupportDialog}
		>
			<LucideMessageCircleQuestionMark />
		</DaisyUiButton>
	</DaisyUiTooltip>

	<DaisyUiTooltip tooltipText={m.theme()} className="d-tooltip-left ">
		<DaisyUiButton
			onClick={openThemeSettings}
			className="d-btn-circle d-btn-lg"
		>
			<LucidePalette />
		</DaisyUiButton>
	</DaisyUiTooltip>

	<DaisyUiTooltip
		tooltipText={m.languages()}
		className="d-tooltip-left "
	>
		<DaisyUiButton
			onClick={openLanguageDialog}
			className="d-btn-circle d-btn-lg"
		>
			<LucideLanguages />
		</DaisyUiButton>
	</DaisyUiTooltip>
</DaisyUiFab>
