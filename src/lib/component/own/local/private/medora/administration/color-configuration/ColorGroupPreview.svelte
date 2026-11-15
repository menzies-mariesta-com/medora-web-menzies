<script lang="ts">
	import type { ColorPreviewKind } from '$lib/model/const/color-purpose.const';
	import {
		badgeInlineStyleFromColor,
		borderLeftStyleFromColor,
		triageRibbonStyle
	} from '$lib/tool/color/hospital-color-resolve.util';
	import { contrastText } from '$lib/tool/color/color-hsl.util';

	type PreviewItem = {
		key: string;
		label: string;
		color: string;
	};

	let {
		kind,
		items,
		usageTitle,
		kitTitle,
		bedLabel,
		cardLabel,
		headers
	}: {
		kind: ColorPreviewKind;
		items: PreviewItem[];
		usageTitle: string;
		kitTitle: string;
		bedLabel: string;
		cardLabel: string;
		headers: {
			item: string;
			badge: string;
			card: string;
			alert: string;
			row: string;
		};
	} = $props();
</script>

<section class="mt-6 flex flex-col gap-4" aria-live="polite">
	<div class="flex flex-col gap-2">
		<p class="text-sm font-medium">{usageTitle}</p>
		<div
			class="rounded-box border border-base-300 bg-base-200/40 p-3"
		>
			{#if kind === 'visit_bar'}
				<ul class="flex flex-col gap-2">
					{#each items as item (item.key)}
						<li
							class="rounded-box border border-base-300 bg-base-100 px-3 py-2 text-sm"
							style={borderLeftStyleFromColor(item.color)}
						>
							{item.label}
						</li>
					{/each}
				</ul>
			{:else if kind === 'ribbon'}
				<ul class="flex flex-wrap gap-2">
					{#each items as item (item.key)}
						<li
							class="rounded-box px-2 py-1 text-xs"
							style="{triageRibbonStyle(
								item.color
							)}; color: {contrastText(item.color)}"
						>
							{item.label}
						</li>
					{/each}
				</ul>
			{:else if kind === 'board'}
				<ul class="flex flex-wrap gap-2">
					{#each items as item (item.key)}
						<li
							class="rounded-box min-w-24 px-2 py-3 text-center text-xs"
							style="background-color: {item.color}; color: {contrastText(
								item.color
							)}"
						>
							{item.label}
						</li>
					{/each}
				</ul>
			{:else if kind === 'bed'}
				<ul class="grid grid-cols-2 gap-2 sm:grid-cols-4">
					{#each items as item (item.key)}
						<li
							class="rounded-box border border-base-300 bg-base-100 p-2"
							style={borderLeftStyleFromColor(item.color, 6)}
						>
							<p class="text-xs text-base-content/60">{bedLabel}</p>
							<p class="text-sm" style="color: {item.color}">
								{item.label}
							</p>
						</li>
					{/each}
				</ul>
			{:else if kind === 'alert'}
				<ul class="flex flex-col gap-2">
					{#each items as item (item.key)}
						<li
							role="alert"
							class="alert alert-outline py-2 text-sm"
							style="border-color: {item.color}; color: {item.color}"
						>
							{item.label}
						</li>
					{/each}
				</ul>
			{:else}
				<ul class="flex flex-wrap gap-2">
					{#each items as item (item.key)}
						<li>
							<span
								class="badge badge-sm"
								style={badgeInlineStyleFromColor(item.color)}
							>
								{item.label}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<p class="text-sm font-medium">{kitTitle}</p>
		<div class="rounded-box overflow-x-auto border border-base-300">
			<table class="table-xs table">
				<thead>
					<tr>
						<th scope="col">{headers.item}</th>
						<th scope="col">{headers.badge}</th>
						<th scope="col">{headers.card}</th>
						<th scope="col">{headers.alert}</th>
						<th scope="col">{headers.row}</th>
					</tr>
				</thead>
				<tbody>
					{#each items as item (item.key)}
						<tr>
							<th scope="row" class="font-normal">{item.label}</th>
							<td>
								<span
									class="badge badge-sm"
									style={badgeInlineStyleFromColor(item.color)}
								>
									{item.label}
								</span>
							</td>
							<td>
								<div
									class="rounded-box border border-base-300 bg-base-100 px-2 py-1 text-xs"
									style={borderLeftStyleFromColor(item.color)}
								>
									{cardLabel}
								</div>
							</td>
							<td>
								<div
									role="alert"
									class="alert alert-outline px-2 py-1 text-xs"
									style="border-color: {item.color}; color: {item.color}"
								>
									{item.label}
								</div>
							</td>
							<td>
								<span
									class="rounded-field inline-flex px-2 py-0.5 text-xs"
									style={badgeInlineStyleFromColor(item.color)}
								>
									{item.label}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>
