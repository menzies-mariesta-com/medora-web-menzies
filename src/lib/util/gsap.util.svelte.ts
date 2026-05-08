import gsap from 'gsap';

/** Default animation duration in seconds */
export const GSAP_DURATION = 0.35;

/** Default easing */
export const GSAP_EASE = 'power2.out';

/** Fade in from opacity 0 */
export function fadeIn(
	el: Element,
	opts?: { duration?: number; delay?: number; ease?: string }
) {
	return gsap.fromTo(
		el,
		{ opacity: 0 },
		{
			opacity: 1,
			duration: opts?.duration ?? GSAP_DURATION,
			delay: opts?.delay ?? 0,
			ease: opts?.ease ?? GSAP_EASE
		}
	);
}

/** Fade in + slide up */
export function fadeInUp(
	el: Element,
	opts?: {
		duration?: number;
		delay?: number;
		y?: number;
		ease?: string;
	}
) {
	return gsap.fromTo(
		el,
		{ opacity: 0, y: opts?.y ?? 16 },
		{
			opacity: 1,
			y: 0,
			duration: opts?.duration ?? GSAP_DURATION,
			delay: opts?.delay ?? 0,
			ease: opts?.ease ?? GSAP_EASE,
			// IMPORTANT: GSAP leaves a `transform` style on the node (even when y=0),
			// which makes `position: fixed` descendants behave like they're fixed to
			// this element in some browsers. Clear it after the animation completes.
			clearProps: 'transform'
		}
	);
}

/** Scale in (for modals, popovers) */
export function scaleIn(
	el: Element,
	opts?: { duration?: number; delay?: number; ease?: string }
) {
	return gsap.fromTo(
		el,
		{ opacity: 0, scale: 0.95 },
		{
			opacity: 1,
			scale: 1,
			duration: opts?.duration ?? GSAP_DURATION,
			delay: opts?.delay ?? 0,
			ease: opts?.ease ?? GSAP_EASE,
			clearProps: 'transform'
		}
	);
}

/** Stagger children with fade-in-up */
export function staggerIn(
	parent: Element,
	opts?: {
		selector?: string;
		duration?: number;
		stagger?: number;
		delay?: number;
		y?: number;
	}
) {
	const selector = opts?.selector ?? ':scope > *';
	const children = parent.querySelectorAll(selector);
	return gsap.fromTo(
		children,
		{ opacity: 0, y: opts?.y ?? 12 },
		{
			opacity: 1,
			y: 0,
			duration: opts?.duration ?? GSAP_DURATION,
			delay: opts?.delay ?? 0,
			stagger: opts?.stagger ?? 0.05,
			ease: GSAP_EASE,
			clearProps: 'transform'
		}
	);
}
