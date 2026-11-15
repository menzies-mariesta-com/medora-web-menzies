<script lang="ts">
	import type { TocItem } from '$lib/tool/docs/types';

	let {
		items,
		activeId,
		onSelect
	}: {
		items: TocItem[];
		activeId: string | null;
		onSelect?: (id: string) => void;
	} = $props();

	function goToHeading(event: MouseEvent, id: string) {
		event.preventDefault();
		const el = document.getElementById(id);
		if (!el) return;

		onSelect?.(id);

		const reduceMotion =
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		el.scrollIntoView({
			behavior: reduceMotion ? 'auto' : 'smooth',
			block: 'start'
		});

		const hash = `#${id}`;
		if (window.location.hash !== hash) {
			history.pushState(null, '', hash);
		} else {
			history.replaceState(null, '', hash);
		}
	}
</script>

{#if items.length > 0}
	<nav aria-label="On this page">
		<p class="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">On this page</p>
		<ul class="relative space-y-0.5 border-s border-ink-border/70 text-sm">
			{#each items as item (item.id)}
				{@const active = activeId === item.id}
				<li class={item.level === 3 ? 'ps-1' : ''}>
					<a
						href={`#${item.id}`}
						class="relative -ms-px block cursor-pointer border-s-2 py-1.5 transition-colors {item.level ===
						3
							? 'ps-4'
							: 'ps-3'} {active
							? 'border-primary font-semibold text-primary'
							: 'border-transparent text-ink-muted hover:border-ink-border hover:text-base-content'}"
						aria-current={active ? 'location' : undefined}
						onclick={(e) => goToHeading(e, item.id)}
					>
						{item.text}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}
