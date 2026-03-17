import gsap from 'gsap';
import {
	fadeIn,
	fadeInUp,
	scaleIn,
	staggerIn,
	GSAP_DURATION
} from '$lib/util/gsap.util.svelte';

export type GsapActionType = 'fade' | 'fadeUp' | 'scale' | 'stagger';

export type GsapActionParams = {
	type?: GsapActionType;
	duration?: number;
	delay?: number;
	stagger?: number;
	y?: number;
	/** When false, no animation runs */
	enabled?: boolean;
};

/**
 * Svelte action for GSAP animations on mount.
 * Usage: use:gsapAnimate={{ type: 'fadeUp' }}
 *        use:gsapAnimate
 *        use:gsapAnimate={{ type: 'stagger', stagger: 0.06 }}
 *        use:gsapAnimate={condition ? { type: 'fadeUp' } : undefined}  // undefined = no animation
 */
export function gsapAnimate(
	node: HTMLElement,
	params?: GsapActionParams | GsapActionType | false | null
): { destroy?: () => void } {
	if (params === false || params === null || params === undefined) {
		return {};
	}
	const opts =
		typeof params === 'string'
			? { type: params as GsapActionType }
			: params;
	if (opts?.enabled === false) return {};
	const type = opts?.type ?? 'fadeUp';
	const duration = opts?.duration ?? GSAP_DURATION;
	const delay = opts?.delay ?? 0;
	const stagger = opts?.stagger ?? 0.05;
	const y = opts?.y ?? 16;

	let tween: gsap.core.Tween | gsap.core.Tween[] | undefined;

	// Run after node is in DOM
	requestAnimationFrame(() => {
		switch (type) {
			case 'fade':
				tween = fadeIn(node, { duration, delay });
				break;
			case 'fadeUp':
				tween = fadeInUp(node, { duration, delay, y });
				break;
			case 'scale':
				tween = scaleIn(node, { duration, delay });
				break;
			case 'stagger':
				tween = staggerIn(node, {
					duration,
					delay,
					stagger,
					y: y ?? 12
				});
				break;
			default:
				tween = fadeInUp(node, { duration, delay, y });
		}
	});

	return {
		destroy() {
			if (Array.isArray(tween)) {
				tween.forEach((t) => t.kill());
			} else {
				tween?.kill();
			}
		}
	};
}
