<script lang="ts">
	/** Adds copy buttons to highlighted pre blocks inside a container. */
	let { root }: { root: HTMLElement | null } = $props();

	$effect(() => {
		if (!root) return;
		const pres = [...root.querySelectorAll('pre')];
		const wraps: HTMLElement[] = [];

		for (const pre of pres) {
			if (pre.parentElement?.classList.contains('docs-code')) continue;
			const wrap = document.createElement('div');
			wrap.className = 'docs-code group relative my-4';
			pre.parentNode?.insertBefore(wrap, pre);
			wrap.appendChild(pre);
			wraps.push(wrap);

			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className =
				'btn btn-ghost btn-square btn-xs btn-secondary absolute end-2 top-2 z-10 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100';
			btn.setAttribute('aria-label', 'Copy code');
			btn.innerHTML =
				'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';

			btn.addEventListener('click', async () => {
				const text = pre.textContent ?? '';
				try {
					await navigator.clipboard.writeText(text);
					btn.setAttribute('aria-label', 'Copied');
					btn.classList.add('text-success');
					setTimeout(() => {
						btn.setAttribute('aria-label', 'Copy code');
						btn.classList.remove('text-success');
					}, 1500);
				} catch {
					/* ignore */
				}
			});
			wrap.appendChild(btn);
		}

		return () => {
			for (const wrap of wraps) {
				const pre = wrap.querySelector('pre');
				if (pre) wrap.parentNode?.insertBefore(pre, wrap);
				wrap.remove();
			}
		};
	});
</script>
