<script lang="ts">
	import { resolve } from '$app/paths';
	import LucideCheck from '$lib/component/own/library/lucide/LucideCheck.svelte';
	import { m } from '$lib/paraglide/messages';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import {
		ANNUAL_OFF,
		CLOUD_MONTHLY_USD,
		ONPREM_PREMIUM_USD,
		USD_TO_MMK,
		effectiveMonthlyUsd,
		formatMmk,
		formatUsd,
		usdToMmk,
		type BillingPeriod,
		type PricingMarket,
		type ServiceMode
	} from '$lib/tool/pricing';

	type PlanId = 'starter' | 'business' | 'scale' | 'platform';

	type Plan = {
		id: PlanId;
		name: string;
		tagline: string;
		cloudMonthlyUsd: number | null;
		highlight?: boolean;
		ctaLabel: string;
		ctaHref: string;
		features: string[];
	};

	let mode = $state<ServiceMode>('cloud');
	let period = $state<BillingPeriod>('monthly');
	let market = $state<PricingMarket>('global');

	const cloud = $derived(mode === 'cloud');
	const annual = $derived(period === 'annual');
	const myanmar = $derived(market === 'myanmar');
	const savePercent = String(ANNUAL_OFF * 100);
	const premiumUsd = formatUsd(ONPREM_PREMIUM_USD);
	const loginHref = resolve(WebRoutesEnum.LOGIN);

	const plans = $derived<Plan[]>([
		{
			id: 'starter',
			name: m.pricing_plan_starter_name(),
			tagline: cloud
				? m.pricing_plan_starter_tagline()
				: m.pricing_plan_starter_tagline_onprem(),
			cloudMonthlyUsd: CLOUD_MONTHLY_USD.starter,
			ctaLabel: m.pricing_plan_starter_cta(),
			ctaHref: loginHref,
			features: [
				cloud
					? m.pricing_plan_starter_f1()
					: m.pricing_plan_starter_f1_onprem(),
				m.pricing_plan_starter_f2(),
				m.pricing_plan_starter_f3(),
				m.pricing_plan_starter_f4(),
				m.pricing_plan_starter_f5(),
				cloud
					? m.pricing_plan_starter_f6()
					: m.pricing_plan_starter_f6_onprem()
			]
		},
		{
			id: 'business',
			name: m.pricing_plan_business_name(),
			tagline: cloud
				? m.pricing_plan_business_tagline()
				: m.pricing_plan_business_tagline_onprem(),
			cloudMonthlyUsd: CLOUD_MONTHLY_USD.business,
			highlight: true,
			ctaLabel: m.pricing_plan_business_cta(),
			ctaHref: loginHref,
			features: [
				cloud
					? m.pricing_plan_business_f1()
					: m.pricing_plan_business_f1_onprem(),
				m.pricing_plan_business_f2(),
				m.pricing_plan_business_f3(),
				m.pricing_plan_business_f4(),
				m.pricing_plan_business_f5(),
				m.pricing_plan_business_f6(),
				m.pricing_plan_business_f7()
			]
		},
		{
			id: 'scale',
			name: m.pricing_plan_scale_name(),
			tagline: cloud
				? m.pricing_plan_scale_tagline()
				: m.pricing_plan_scale_tagline_onprem(),
			cloudMonthlyUsd: CLOUD_MONTHLY_USD.scale,
			ctaLabel: m.pricing_plan_scale_cta(),
			ctaHref: loginHref,
			features: [
				m.pricing_plan_scale_f1(),
				m.pricing_plan_scale_f2(),
				m.pricing_plan_scale_f3(),
				m.pricing_plan_scale_f4(),
				m.pricing_plan_scale_f5(),
				m.pricing_plan_scale_f6(),
				m.pricing_plan_scale_f7()
			]
		},
		{
			id: 'platform',
			name: m.pricing_plan_platform_name(),
			tagline: cloud
				? m.pricing_plan_platform_tagline()
				: m.pricing_plan_platform_tagline_onprem(),
			cloudMonthlyUsd: null,
			ctaLabel: m.pricing_plan_platform_cta(),
			ctaHref: '#request-trial',
			features: [
				m.pricing_plan_platform_f1(),
				m.pricing_plan_platform_f2(),
				m.pricing_plan_platform_f3(),
				m.pricing_plan_platform_f4(),
				m.pricing_plan_platform_f5(),
				cloud
					? m.pricing_plan_platform_f6()
					: m.pricing_plan_platform_f6_onprem()
			]
		}
	]);

	const plansLabel = $derived(
		cloud ? m.pricing_cloud_plans_label() : m.pricing_onprem_plans_label()
	);

	function listUsd(cloudMonthly: number): number {
		return effectiveMonthlyUsd(cloudMonthly, mode, period);
	}
</script>

<section
	class="scroll-mt-24 px-4 pb-8 pt-28 sm:px-6 sm:pb-12 sm:pt-32"
	aria-labelledby="pricing-heading"
>
	<div class="mx-auto max-w-6xl">
		<p class="text-sm font-medium tracking-wide text-[var(--loom-teal)] uppercase">
			{m.pricing_eyebrow()}
		</p>

		<h1
			id="pricing-heading"
			class="mt-2 max-w-2xl text-3xl font-semibold text-[var(--loom-ink)] sm:text-4xl lg:text-5xl"
		>
			{m.pricing_heading()}
		</h1>
		<p class="mt-3 max-w-2xl text-base leading-relaxed text-[var(--loom-ink)]/75 sm:text-lg">
			{m.pricing_lead()}
		</p>
		<p class="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--loom-ink)]/70 sm:text-base">
			{#if cloud}
				{m.pricing_lead_cloud()}
			{:else}
				{m.pricing_lead_onprem({ premium: premiumUsd })}
			{/if}
			{#if myanmar}
				{' '}{m.pricing_lead_mmk({ rate: formatMmk(USD_TO_MMK) })}
			{:else}
				{' '}{m.pricing_lead_usd()}
			{/if}
		</p>

		<div class="mt-8 flex flex-wrap items-center justify-between gap-3">
			<div
				class="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--loom-ink)]/10 bg-base-100/40 p-1.5"
				role="group"
				aria-label={m.pricing_billing_period()}
			>
				<button
					type="button"
					class="btn btn-sm cursor-pointer rounded-full {!annual
						? 'btn-primary'
						: 'btn-ghost text-[var(--loom-ink)]/70'}"
					aria-pressed={!annual}
					onclick={() => (period = 'monthly')}
				>
					{m.common_monthly()}
				</button>
				<button
					type="button"
					class="btn btn-sm cursor-pointer rounded-full {annual
						? 'btn-primary'
						: 'btn-ghost text-[var(--loom-ink)]/70'}"
					aria-pressed={annual}
					onclick={() => (period = 'annual')}
				>
					{m.common_annual()}
					<span class="ms-1 text-xs font-medium opacity-90"
						>{m.common_save_percent({ percent: savePercent })}</span
					>
				</button>
			</div>

			<div
				class="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--loom-ink)]/10 bg-base-100/40 p-1.5"
				role="group"
				aria-label={m.pricing_service_mode()}
			>
				<button
					type="button"
					class="btn btn-sm cursor-pointer rounded-full {cloud
						? 'btn-primary'
						: 'btn-ghost text-[var(--loom-ink)]/70'}"
					aria-pressed={cloud}
					onclick={() => (mode = 'cloud')}
				>
					{m.pricing_mode_cloud()}
				</button>
				<button
					type="button"
					class="btn btn-sm cursor-pointer rounded-full {!cloud
						? 'btn-primary'
						: 'btn-ghost text-[var(--loom-ink)]/70'}"
					aria-pressed={!cloud}
					onclick={() => (mode = 'onprem')}
				>
					{m.pricing_mode_onprem()}
				</button>
			</div>

			<div
				class="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--loom-ink)]/10 bg-base-100/40 p-1.5"
				role="group"
				aria-label={m.pricing_market_currency()}
			>
				<button
					type="button"
					class="btn btn-sm cursor-pointer rounded-full {!myanmar
						? 'btn-primary'
						: 'btn-ghost text-[var(--loom-ink)]/70'}"
					aria-pressed={!myanmar}
					onclick={() => (market = 'global')}
				>
					{m.common_global()}
				</button>
				<button
					type="button"
					class="btn btn-sm cursor-pointer rounded-full {myanmar
						? 'btn-primary'
						: 'btn-ghost text-[var(--loom-ink)]/70'}"
					aria-pressed={myanmar}
					onclick={() => (market = 'myanmar')}
				>
					{m.common_myanmar()}
				</button>
			</div>
		</div>
	</div>
</section>

<section class="px-4 pb-16 sm:px-6 sm:pb-24" aria-label={plansLabel}>
	<div class="mx-auto max-w-6xl">
		<div class="medora-pricing-tiers">
			{#each plans as plan (plan.id)}
				<article class:medora-pricing-tier--highlight={plan.highlight}>
					{#if plan.highlight}
						<p
							class="mb-3 text-xs font-semibold tracking-wide text-[var(--loom-teal)] uppercase"
						>
							{m.common_recommended()}
						</p>
					{:else}
						<p
							class="mb-3 hidden text-xs font-semibold tracking-wide text-transparent uppercase lg:block"
							aria-hidden="true"
						>
							&nbsp;
						</p>
					{/if}

					<h2 class="text-xl font-semibold text-[var(--loom-ink)]">{plan.name}</h2>
					<p class="mt-1 text-sm leading-snug text-[var(--loom-ink)]/65">{plan.tagline}</p>

					<div class="mt-5 min-h-[5.5rem]">
						{#if plan.cloudMonthlyUsd != null}
							{@const usdMo = listUsd(plan.cloudMonthlyUsd)}
							{@const mmkMo = usdToMmk(usdMo)}
							{@const usdYr = usdMo * 12}
							{@const mmkYr = usdToMmk(usdYr)}
							{#if myanmar}
								<p class="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
									<span class="font-display text-4xl font-semibold text-[var(--loom-ink)]">
										Ks {formatMmk(mmkMo)}
									</span>
									<span class="text-sm text-[var(--loom-ink)]/55">{m.common_per_month_abbr()}</span>
								</p>
								<p class="mt-1 text-sm text-[var(--loom-ink)]/60">
									{m.pricing_usd_mo_secondary({ usd: formatUsd(usdMo) })}
								</p>
								<p class="mt-1 text-xs text-[var(--loom-ink)]/50">
									{#if annual}
										{m.pricing_billed_annually_mmk({
											mmk: formatMmk(mmkYr),
											usd: formatUsd(usdYr)
										})}
									{:else}
										{m.common_billed_monthly()}
									{/if}
								</p>
							{:else}
								<p class="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
									<span class="font-display text-4xl font-semibold text-[var(--loom-ink)]">
										${formatUsd(usdMo)}
									</span>
									<span class="text-sm text-[var(--loom-ink)]/55">{m.common_usd_per_month()}</span>
								</p>
								<p class="mt-1 text-xs text-[var(--loom-ink)]/50">
									{#if annual}
										{m.pricing_billed_annually_usd({ usd: formatUsd(usdYr) })}
									{:else}
										{m.common_billed_monthly()}
									{/if}
								</p>
							{/if}
						{:else}
							<p class="font-display text-3xl font-semibold text-[var(--loom-ink)]">
								{m.common_custom()}
							</p>
							<p class="mt-1 text-xs text-[var(--loom-ink)]/50">
								{m.pricing_quote_footprint()}
							</p>
						{/if}
					</div>

					<a
						href={plan.ctaHref}
						class="btn mt-6 w-full cursor-pointer sm:w-auto lg:w-full {plan.highlight
							? 'btn-primary'
							: 'btn-outline'}"
					>
						{plan.ctaLabel}
					</a>

					<ul class="mt-6 flex flex-col gap-2.5">
						{#each plan.features as feature (feature)}
							<li class="flex gap-2 text-sm leading-snug text-[var(--loom-ink)]/80">
								<LucideCheck
									className="mt-0.5 size-4 shrink-0 text-[var(--loom-teal)]"
								/>
								<span>{feature}</span>
							</li>
						{/each}
					</ul>
				</article>
			{/each}
		</div>
	</div>
</section>
