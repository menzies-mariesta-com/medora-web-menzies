export type HorizontalTooltipSide = 'left' | 'right';

const PLACEMENT_CLASS_RE =
	/\b(?:d-)?tooltip-(?:top|bottom|left|right)\b/g;

/** Remove static DaisyUI placement classes; side is chosen at runtime. */
export function stripTooltipPlacementClasses(className: string): string {
	return className.replace(PLACEMENT_CLASS_RE, '').replace(/\s+/g, ' ').trim();
}

/**
 * Near the left of the viewport → show tip on the right.
 * Near the right of the viewport → show tip on the left.
 */
export function resolveHorizontalTooltipSide(
	el: HTMLElement
): HorizontalTooltipSide {
	const rect = el.getBoundingClientRect();
	const spaceRight = window.innerWidth - rect.right;
	const spaceLeft = rect.left;
	return spaceRight < spaceLeft ? 'left' : 'right';
}
