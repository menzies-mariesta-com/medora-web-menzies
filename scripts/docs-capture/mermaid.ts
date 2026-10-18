export function buildWorkflowMermaid(steps: string[]): string {
	const nodes = steps.map((label, i) => {
		const id = `s${i}`;
		const safe = label.replace(/"/g, "'");
		return `  ${id}["${safe}"]`;
	});
	const edges = steps
		.map((_, i) => (i < steps.length - 1 ? `  s${i} --> s${i + 1}` : ''))
		.filter(Boolean);
	return ['flowchart LR', ...nodes, ...edges].join('\n');
}
