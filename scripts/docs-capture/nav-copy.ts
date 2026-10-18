import type { WorkflowRow } from './navigate.ts';

export function buildOpenScreenInstruction(workflow: WorkflowRow): string {
	const lines: string[] = [
		`Sign in with your hospital account (for docs capture we use the seed admin from \`.env\`).`,
		`Select **Testing Hospital 1** in the hospital selector if prompted.`,
		`In the left **module bar**, click the **${workflow.moduleName}** module icon.`,
		`On the ${workflow.moduleName} home screen, open **${workflow.sectionTitle ?? workflow.title}**.`
	];

	if (workflow.sectionTitle && workflow.subTabTitle && workflow.title !== workflow.subTabTitle) {
		lines.push(
			`Under **${workflow.sectionTitle}**, select the **${workflow.subTabTitle}** tab (first sub-page opens by default).`
		);
	} else if (workflow.parentPageTitle && workflow.title !== workflow.parentPageTitle) {
		lines.push(
			`Open the **${workflow.parentPageTitle}** section, then the **${workflow.title}** tab.`
		);
	}

	if (workflow.sectionTitle && workflow.capturePageUrl && workflow.pageUrl !== workflow.capturePageUrl) {
		lines.push(
			`_This guide shows the **${workflow.subTabTitle ?? workflow.title}** work area inside **${workflow.sectionTitle}**._`
		);
	}

	return lines.join('\n\n');
}

export function stepTitleForFile(fileName: string): string {
	if (fileName.includes('overview')) return 'View the screen';
	if (fileName.includes('list')) return 'View the list';
	if (fileName.includes('create-open')) return 'Start a new record';
	if (fileName.includes('create-form')) return 'Fill the form';
	if (fileName.includes('edit')) return 'Edit a row';
	if (fileName.includes('delete')) return 'Delete confirmation';
	return 'Continue on this screen';
}
