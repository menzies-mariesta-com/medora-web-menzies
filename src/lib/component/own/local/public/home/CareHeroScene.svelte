<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '$lib/paraglide/messages';

	let rootEl = $state<HTMLDivElement | null>(null);

	onMount(() => {
		const root = rootEl;
		if (!root) return;

		const reduced = window.matchMedia(
			'(prefers-reduced-motion: reduce)'
		).matches;
		if (reduced) return;

		let cancelled = false;
		let ctx: { revert: () => void } | null = null;
		let io: IntersectionObserver | null = null;
		let mistTween: { pause: () => void; play: () => void } | null = null;
		let foliageTween: { pause: () => void; play: () => void } | null =
			null;

		void import('gsap').then(({ default: gsap }) => {
			if (cancelled) return;

			ctx = gsap.context(() => {
				const mist = root.querySelectorAll('.ch-mist');
				const foliage = root.querySelectorAll('.ch-foliage');

				mistTween = gsap.to(mist, {
					opacity: 0.5,
					duration: 4.5,
					ease: 'sine.inOut',
					yoyo: true,
					repeat: -1,
					stagger: 0.6
				});

				foliageTween = gsap.to(foliage, {
					rotation: 2.2,
					transformOrigin: '50% 100%',
					duration: 3.8,
					ease: 'sine.inOut',
					yoyo: true,
					repeat: -1,
					stagger: 0.35
				});

				io = new IntersectionObserver(
					(entries) => {
						const visible = entries.some((e) => e.isIntersecting);
						if (!visible) {
							mistTween?.pause();
							foliageTween?.pause();
						} else {
							mistTween?.play();
							foliageTween?.play();
						}
					},
					{ threshold: 0.15 }
				);
				io.observe(root);
			}, root);
		});

		return () => {
			cancelled = true;
			io?.disconnect();
			ctx?.revert();
		};
	});
</script>

<div
	bind:this={rootEl}
	class="ch-scene relative mx-auto w-full max-w-xl select-none"
	aria-hidden="true"
>
	<div
		class="pointer-events-none absolute inset-0 rounded-[2rem] opacity-90"
		style="background:
			radial-gradient(ellipse 50% 45% at 82% 18%, var(--wash-a, #d9eef5) 0%, transparent 70%),
			radial-gradient(ellipse 45% 50% at 18% 82%, var(--wash-b, #f2e1c6) 0%, transparent 65%);"
	></div>

	<svg
		viewBox="0 0 560 380"
		class="relative z-10 h-auto w-full"
		xmlns="http://www.w3.org/2000/svg"
		role="img"
	>
		<title>{m.home_scene_aria()}</title>

		<defs>
			<filter
				id="ch-soft-blur"
				x="-30%"
				y="-30%"
				width="160%"
				height="160%"
			>
				<feGaussianBlur stdDeviation="10" />
			</filter>
			<linearGradient id="ch-sky" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="#D9EEF5" stop-opacity="0.55" />
				<stop offset="55%" stop-color="#F7F4EF" stop-opacity="0.2" />
				<stop offset="100%" stop-color="#F7F4EF" stop-opacity="0" />
			</linearGradient>
			<linearGradient id="ch-ground" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="#d8eee6" stop-opacity="0.55" />
				<stop offset="100%" stop-color="#E8E1D4" stop-opacity="0.75" />
			</linearGradient>
			<linearGradient id="ch-wall" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="#F7F4EF" />
				<stop offset="100%" stop-color="#E8E1D4" />
			</linearGradient>
			<linearGradient id="ch-roof" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="#276C8E" stop-opacity="0.72" />
				<stop offset="100%" stop-color="#3d7a6f" stop-opacity="0.85" />
			</linearGradient>
		</defs>

		<!-- Soft sky wash -->
		<rect width="560" height="380" fill="url(#ch-sky)" />

		<!-- Watercolor mist blotches -->
		<ellipse
			class="ch-mist"
			cx="92"
			cy="78"
			rx="88"
			ry="58"
			fill="#D9EEF5"
			opacity="0.72"
			filter="url(#ch-soft-blur)"
		/>
		<ellipse
			class="ch-mist"
			cx="470"
			cy="64"
			rx="96"
			ry="64"
			fill="#d8eee6"
			opacity="0.65"
			filter="url(#ch-soft-blur)"
		/>
		<ellipse
			class="ch-mist"
			cx="280"
			cy="42"
			rx="70"
			ry="42"
			fill="#F2E1C6"
			opacity="0.38"
			filter="url(#ch-soft-blur)"
		/>
		<ellipse
			class="ch-mist"
			cx="430"
			cy="280"
			rx="72"
			ry="48"
			fill="#E8C9C3"
			opacity="0.28"
			filter="url(#ch-soft-blur)"
		/>
		<path
			d="M28 210 C12 150 70 98 130 112 C178 124 188 178 158 214 C128 250 48 252 28 210 Z"
			fill="#276C8E"
			opacity="0.16"
			filter="url(#ch-soft-blur)"
		/>
		<path
			d="M470 330 C510 300 548 320 552 355 C556 385 520 402 482 390 C444 378 438 352 470 330 Z"
			fill="#B87524"
			opacity="0.18"
			filter="url(#ch-soft-blur)"
		/>

		<!-- Ground plane -->
		<path
			d="M18 300 C90 278 180 292 280 286 C380 280 470 268 542 290 L542 368 L18 368 Z"
			fill="url(#ch-ground)"
		/>
		<ellipse
			cx="300"
			cy="332"
			rx="210"
			ry="22"
			fill="#1A3A48"
			opacity="0.06"
		/>

		<!-- Courtyard path -->
		<path
			d="M248 338 C268 318 292 308 318 302 C340 298 358 292 372 280"
			fill="none"
			stroke="#E8E1D4"
			stroke-width="18"
			stroke-linecap="round"
			opacity="0.9"
		/>
		<path
			d="M248 338 C268 318 292 308 318 302 C340 298 358 292 372 280"
			fill="none"
			stroke="#F7F4EF"
			stroke-width="10"
			stroke-linecap="round"
		/>

		<!-- Tree (left) -->
		<g class="ch-tree" transform="translate(108 268)">
			<!-- Trunk -->
			<path
				d="M-6 42 C-4 18 -2 0 0 -18 C2 0 4 18 6 42 Z"
				fill="#1c2a28"
				opacity="0.78"
			/>
			<path
				d="M0 -18 C-8 -6 -14 8 -10 22"
				fill="none"
				stroke="#1A3A48"
				stroke-width="2.2"
				stroke-linecap="round"
				opacity="0.55"
			/>

			<!-- Soft foliage washes -->
			<g class="ch-foliage">
				<ellipse
					cx="-28"
					cy="-48"
					rx="42"
					ry="34"
					fill="#d8eee6"
					opacity="0.85"
				/>
				<ellipse
					cx="26"
					cy="-42"
					rx="38"
					ry="32"
					fill="#D9EEF5"
					opacity="0.75"
				/>
				<ellipse
					cx="0"
					cy="-72"
					rx="36"
					ry="30"
					fill="#3d7a6f"
					opacity="0.38"
				/>
				<ellipse
					cx="-12"
					cy="-36"
					rx="30"
					ry="24"
					fill="#F7F4EF"
					opacity="0.55"
				/>
				<!-- Mineral ink leaf suggestion -->
				<path
					d="M-34 -52 C-18 -68 6 -74 28 -56 C10 -48 -8 -42 -34 -52 Z"
					fill="none"
					stroke="#1A3A48"
					stroke-width="1.6"
					stroke-linecap="round"
					stroke-linejoin="round"
					opacity="0.35"
				/>
			</g>
		</g>

		<!-- Smaller companion tree -->
		<g class="ch-tree" transform="translate(178 292) scale(0.62)">
			<path
				d="M-5 36 C-3 14 -1 0 0 -14 C1 0 3 14 5 36 Z"
				fill="#1c2a28"
				opacity="0.7"
			/>
			<g class="ch-foliage">
				<ellipse
					cx="-18"
					cy="-36"
					rx="30"
					ry="24"
					fill="#d8eee6"
					opacity="0.8"
				/>
				<ellipse
					cx="16"
					cy="-30"
					rx="26"
					ry="22"
					fill="#3d7a6f"
					opacity="0.32"
				/>
				<ellipse
					cx="0"
					cy="-52"
					rx="24"
					ry="20"
					fill="#D9EEF5"
					opacity="0.7"
				/>
			</g>
		</g>

		<!-- Hospital building (dominant) -->
		<g transform="translate(318 168)">
			<!-- Soft building shadow wash -->
			<ellipse
				cx="8"
				cy="168"
				rx="118"
				ry="16"
				fill="#1A3A48"
				opacity="0.08"
			/>

			<!-- Main body -->
			<path
				d="M-88 28
					C-88 12 -76 4 -60 4
					L60 4
					C76 4 88 12 88 28
					L88 158
					C88 166 82 170 74 170
					L-74 170
					C-82 170 -88 166 -88 158 Z"
				fill="url(#ch-wall)"
			/>
			<path
				d="M-88 28
					C-88 12 -76 4 -60 4
					L60 4
					C76 4 88 12 88 28
					L88 158
					C88 166 82 170 74 170
					L-74 170
					C-82 170 -88 166 -88 158 Z"
				fill="none"
				stroke="#1A3A48"
				stroke-width="2.4"
				stroke-linecap="round"
				stroke-linejoin="round"
				opacity="0.78"
			/>

			<!-- Soft teal wash on facade -->
			<path
				d="M-70 40 L70 40 L70 92 L-70 92 Z"
				fill="#276C8E"
				opacity="0.08"
			/>

			<!-- Side wing -->
			<path
				d="M88 70
					C96 70 104 76 104 86
					L104 158
					C104 166 98 170 90 170
					L88 170 Z"
				fill="#E8E1D4"
			/>
			<path
				d="M88 70
					C96 70 104 76 104 86
					L104 158
					C104 166 98 170 90 170
					L88 170 Z"
				fill="none"
				stroke="#1A3A48"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				opacity="0.7"
			/>

			<!-- Roof band -->
			<path
				d="M-70 -8
					C-78 -8 -84 -2 -84 8
					L-84 18
					L84 18
					L84 8
					C84 -2 78 -8 70 -8 Z"
				fill="url(#ch-roof)"
			/>
			<path
				d="M-70 -8
					C-78 -8 -84 -2 -84 8
					L-84 18
					L84 18
					L84 8
					C84 -2 78 -8 70 -8 Z"
				fill="none"
				stroke="#1A3A48"
				stroke-width="2.2"
				stroke-linecap="round"
				stroke-linejoin="round"
				opacity="0.75"
			/>

			<!-- Rooftop cross pavilion (hospital mark echo) -->
			<g transform="translate(0 -28)">
				<rect
					x="-16"
					y="-22"
					width="32"
					height="36"
					rx="6"
					fill="#F7F4EF"
					stroke="#1A3A48"
					stroke-width="2.2"
					opacity="0.95"
				/>
				<path
					d="M0 -12 v16 M-8 -4 h16"
					fill="none"
					stroke="#276C8E"
					stroke-width="3.2"
					stroke-linecap="round"
				/>
			</g>

			<!-- Windows: soft mint panes -->
			{#each [-48, -16, 16, 48] as wx (wx)}
				{#each [52, 92] as wy (wy)}
					<rect
						x={wx - 12}
						y={wy}
						width="24"
						height="22"
						rx="4"
						fill="#D9EEF5"
						opacity="0.85"
					/>
					<rect
						x={wx - 12}
						y={wy}
						width="24"
						height="22"
						rx="4"
						fill="none"
						stroke="#1A3A48"
						stroke-width="1.5"
						opacity="0.45"
					/>
				{/each}
			{/each}

			<!-- Wing windows -->
			{#each [88, 122] as wy (wy)}
				<rect
					x="90"
					y={wy}
					width="10"
					height="18"
					rx="3"
					fill="#d8eee6"
					opacity="0.8"
				/>
			{/each}

			<!-- Entry -->
			<path
				d="M-22 118
					C-22 110 -16 104 -8 104
					L8 104
					C16 104 22 110 22 118
					L22 170
					L-22 170 Z"
				fill="#1A3A48"
				opacity="0.12"
			/>
			<path
				d="M-22 118
					C-22 110 -16 104 -8 104
					L8 104
					C16 104 22 110 22 118
					L22 170
					L-22 170 Z"
				fill="none"
				stroke="#1A3A48"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				opacity="0.7"
			/>
			<!-- Soft amber door wash (sparse accent) -->
			<rect
				x="-10"
				y="128"
				width="20"
				height="42"
				rx="4"
				fill="#B87524"
				opacity="0.28"
			/>

			<!-- Entry canopy -->
			<path
				d="M-34 112 L34 112 L28 102 L-28 102 Z"
				fill="#3d7a6f"
				opacity="0.45"
			/>
			<path
				d="M-34 112 L34 112 L28 102 L-28 102 Z"
				fill="none"
				stroke="#1A3A48"
				stroke-width="1.6"
				stroke-linejoin="round"
				opacity="0.55"
			/>
		</g>

		<!-- Soft foreground grass wash near trees -->
		<ellipse
			cx="120"
			cy="318"
			rx="64"
			ry="14"
			fill="#3d7a6f"
			opacity="0.12"
		/>
		<ellipse
			cx="168"
			cy="324"
			rx="36"
			ry="10"
			fill="#d8eee6"
			opacity="0.45"
		/>
	</svg>
</div>
