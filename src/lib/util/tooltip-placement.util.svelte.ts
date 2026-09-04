export type HorizontalTooltipSide = 'left' | 'right';

const PLACEMENT_CLASS_RE =
	/\bd-tooltip-(?:top|bottom|left|right)\b/g;

/** Remove static DaisyUI placement classes; side is chosen at runtime. */
export function stripTooltipPlacementClasses(className: string): string {
	return className.replace(PLACEMENT_CLASS_RE, '').replace(/\s+/g, ' ').trim();
}

/** Pick left vs right based on which side of the viewport has more space. */
export function resolveHorizontalTooltipSide(
	el: HTMLElement
): HorizontalTooltipSide {
	const rect = el.getBoundingClientRect();
	const spaceRight = window.innerWidth - rect.right;
	const spaceLeft = rect.left;
	return spaceRight < spaceLeft ? 'left' : 'right';
}
