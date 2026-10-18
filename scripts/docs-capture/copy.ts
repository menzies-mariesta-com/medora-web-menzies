export function plainSummary(title: string, moduleName: string): string {
	return `**${title}** is where you record and review work in **${moduleName}**. This guide shows the screen and what to tap or click, step by step.`;
}

export function plainBeforeStart(needsVisit: boolean): string {
	const lines = [
		'- You are signed in to Medora.',
		'- Your hospital is selected in the top bar.'
	];
	if (needsVisit) {
		lines.push('- A patient visit is open (you picked a visit from the list).');
	}
	return lines.join('\n');
}

export function plainTroubleshooting(accessDenied: boolean, needsVisit: boolean): string {
	if (accessDenied) {
		return '- **Screen will not open:** ask your hospital administrator to give your user group access to this page.\n- **Still stuck:** sign out, sign in again, and pick your hospital.';
	}
	const lines = [
		'- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).',
		'- **Cannot save:** check required fields marked with a red star.'
	];
	if (needsVisit) {
		lines.unshift('- **Blank clinical screen:** select a patient visit from the visit list, then open this page again.');
	}
	return lines.join('\n');
}
