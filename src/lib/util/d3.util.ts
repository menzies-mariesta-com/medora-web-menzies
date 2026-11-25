import * as d3 from 'd3';

export type ChartScaleType = 'linear' | 'time' | 'band';

export interface ChartMargin {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

export interface ChartTheme {
	background: string;
	axisColor: string;
	gridColor: string;
	lineColor: string;
	barColor: string;
	fontFamily: string;
	fontSize: number;
}

export interface BaseChartOptions<T> {
	container: HTMLElement | SVGSVGElement;
	data: T[];
	width?: number;
	height?: number;
	margin?: Partial<ChartMargin>;
	theme?: Partial<ChartTheme>;
}

export interface LineSeries<T> {
	data: T[];
	yAccessor: (d: T) => number;
	color: string;
	label?: string;
	/** `dots` skips the connecting path (sparse readings, e.g. weight). */
	drawAs?: 'line' | 'dots';
}

export interface LineChartOptions<T> extends BaseChartOptions<T> {
	xAccessor: (d: T) => Date | number;
	yAccessor: (d: T) => number;
	xScaleType?: Extract<ChartScaleType, 'linear' | 'time'>;
	yScaleType?: 'linear' | 'log';
	curve?: unknown;
	strokeWidth?: number;
	showPoints?: boolean;
	showGrid?: boolean;
	/** Include 0 on the y axis (BP, heart rate) instead of hugging the data. */
	includeZero?: boolean;
	/** `dots` skips the connecting path for `data` (sparse readings). */
	drawAs?: 'line' | 'dots';
	/** Extra series drawn over `data` (e.g. diastolic beside systolic). */
	series?: LineSeries<T>[];
	/** Shaded normal-range rect behind the lines. */
	band?: { min: number; max: number; color?: string };
	/** Tint the area between each line and the chart floor with its colour. */
	showArea?: boolean;
	tooltipFormatter?: (d: T) => string;
}

export interface BarChartOptions<T> extends BaseChartOptions<T> {
	xAccessor: (d: T) => string;
	yAccessor: (d: T) => number;
	paddingInner?: number;
	paddingOuter?: number;
	showGrid?: boolean;
	/** Cap x labels; a long series would otherwise overlap them all. */
	maxXTicks?: number;
	/** Shaded normal-range rect behind the bars (e.g. glucose reference). */
	band?: { min: number; max: number; color?: string };
	tooltipFormatter?: (d: T) => string;
}

const DEFAULT_MARGIN: ChartMargin = {
	top: 16,
	right: 16,
	bottom: 32,
	left: 48
};

const DEFAULT_THEME: ChartTheme = {
	background: 'transparent',
	axisColor: '#9ca3af',
	gridColor: '#e5e7eb',
	lineColor: '#3b82f6',
	barColor: '#3b82f6',
	fontFamily:
		'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
	fontSize: 12
};

function resolveMargin(margin?: Partial<ChartMargin>): ChartMargin {
	return {
		top: margin?.top ?? DEFAULT_MARGIN.top,
		right: margin?.right ?? DEFAULT_MARGIN.right,
		bottom: margin?.bottom ?? DEFAULT_MARGIN.bottom,
		left: margin?.left ?? DEFAULT_MARGIN.left
	};
}

function resolveTheme(theme?: Partial<ChartTheme>): ChartTheme {
	return {
		background: theme?.background ?? DEFAULT_THEME.background,
		axisColor: theme?.axisColor ?? DEFAULT_THEME.axisColor,
		gridColor: theme?.gridColor ?? DEFAULT_THEME.gridColor,
		lineColor: theme?.lineColor ?? DEFAULT_THEME.lineColor,
		barColor: theme?.barColor ?? DEFAULT_THEME.barColor,
		fontFamily: theme?.fontFamily ?? DEFAULT_THEME.fontFamily,
		fontSize: theme?.fontSize ?? DEFAULT_THEME.fontSize
	};
}

/**
 * Y domain for a trend. A vital reading of 36.8 °C must not sit on a 0-40 axis,
 * so this hugs the data (5% padding) and only widens for `include`, `includeZero`
 * or a single reading that would otherwise collapse to a zero-height domain.
 */
export function resolveNumericDomain(
	values: number[],
	opts: {
		includeZero?: boolean;
		include?: { min: number; max: number };
	} = {}
): [number, number] {
	const finite = values.filter((v) => Number.isFinite(v));
	const candidates = opts.include
		? [opts.include.min, opts.include.max, ...finite]
		: finite;
	if (candidates.length === 0) return [0, 1];

	let min = Math.min(...candidates);
	let max = Math.max(...candidates);

	if (opts.includeZero) {
		min = Math.min(0, min);
		max = Math.max(0, max);
	}

	const span = max - min;
	// A lone reading has no span, so pad it by 2% of its own value instead.
	const pad =
		span > 0 ? span * 0.05 : Math.max(Math.abs(max) * 0.02, 1);
	return [min - pad, max + pad];
}

function getTooltipElement(): HTMLDivElement {
	let tooltip = document.querySelector<HTMLDivElement>(
		'.d3-util-tooltip'
	);
	if (!tooltip) {
		tooltip = document.createElement('div');
		tooltip.className = 'd3-util-tooltip';
		Object.assign(tooltip.style, {
			position: 'fixed',
			pointerEvents: 'none',
			background: 'rgba(17,24,39,0.9)',
			color: '#f9fafb',
			padding: '4px 8px',
			borderRadius: '4px',
			fontSize: '12px',
			zIndex: '9999',
			opacity: '0',
			transition: 'opacity 120ms ease-out'
		});
		document.body.appendChild(tooltip);
	}
	return tooltip;
}

export class D3Util {
	static clear(container: HTMLElement | SVGSVGElement): void {
		d3.select(container).selectAll('*').remove();
	}

	static createLineChart<T>(options: LineChartOptions<T>): void {
		const {
			container,
			data,
			xAccessor,
			yAccessor,
			width = 640,
			height = 360,
			margin: marginInput,
			theme: themeInput,
			xScaleType = 'time',
			yScaleType = 'linear',
			curve = d3.curveMonotoneX,
			strokeWidth = 2,
			showPoints = true,
			showGrid = true,
			includeZero = false,
			series = [],
			band,
			showArea = false,
			tooltipFormatter
		} = options;

		const allSeries: LineSeries<T>[] = [
			{
				data,
				yAccessor,
				color: themeInput?.lineColor ?? DEFAULT_THEME.lineColor,
				drawAs: options.drawAs ?? 'line'
			},
			...series
		];
		const hasData = allSeries.some((s) => s.data.length > 0);

		if (!container) return;
		if (!hasData) {
			this.clear(container);
			return;
		}

		const margin = resolveMargin(marginInput);
		const theme = resolveTheme(themeInput);
		const innerWidth = width - margin.left - margin.right;
		const innerHeight = height - margin.top - margin.bottom;

		this.clear(container);

		const root = d3
			.select(container as HTMLElement)
			.append('svg')
			.attr('width', width)
			.attr('height', height)
			.attr('viewBox', `0 0 ${width} ${height}`)
			.style('background', theme.background)
			.style('font-family', theme.fontFamily)
			.style('font-size', `${theme.fontSize}px`);

		const g = root
			.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		// Scales
		let xScale: any;

		// The x domain must span every series, or the extra series clips off-axis.
		const allData = allSeries.flatMap((s) => s.data);

		if (xScaleType === 'time') {
			const xExtent = d3.extent(
				allData,
				(d: T) => xAccessor(d) as Date
			);
			// One instant would collapse the domain; pad it by a minute.
			const [x0, x1] = xExtent as [Date, Date];
			const padded: [Date, Date] =
				+x0 === +x1
					? [new Date(+x0 - 60_000), new Date(+x1 + 60_000)]
					: [x0, x1];
			xScale = d3.scaleTime().domain(padded).range([0, innerWidth]);
		} else {
			const xExtent = d3.extent(allData, (d: T) =>
				Number(xAccessor(d))
			) as [number, number];
			xScale = d3
				.scaleLinear()
				.domain(
					xExtent[0] === xExtent[1]
						? [xExtent[0] - 1, xExtent[1] + 1]
						: xExtent
				)
				.range([0, innerWidth])
				.nice();
		}

		let yScale: any;

		const yValues = allSeries.flatMap((s) =>
			s.data.map((d) => s.yAccessor(d))
		);
		const yMax = d3.max(yValues) ?? 0;

		if (yScaleType === 'log') {
			const minPositive = Math.max(
				Number.MIN_VALUE,
				d3.min(yValues.filter((v) => v > 0)) ?? 1
			);
			yScale = d3
				.scaleLog()
				.domain([minPositive, yMax || 1])
				.range([innerHeight, 0])
				.nice();
		} else {
			yScale = d3
				.scaleLinear()
				.domain(
					resolveNumericDomain(yValues, {
						includeZero,
						include: band
					})
				)
				.range([innerHeight, 0]);
		}

		// Normal-range band sits under the grid so the lines stay readable.
		if (band) {
			const top = yScale(band.max);
			const bottom = yScale(band.min);
			g.append('rect')
				.attr('class', 'reference-band')
				.attr('x', 0)
				.attr('y', top)
				.attr('width', innerWidth)
				.attr('height', Math.max(0, bottom - top))
				.attr('fill', band.color ?? 'var(--color-success, #36d399)')
				.attr('opacity', 0.12);
		}

		// Grid
		if (showGrid) {
			const yAxisGrid = d3
				.axisLeft(yScale)
				.tickSize(-innerWidth)
				.tickFormat(() => '');

			g.append('g')
				.attr('class', 'grid')
				.call(yAxisGrid as any)
				.selectAll('line')
				.attr('stroke', theme.gridColor)
				.attr('stroke-opacity', 0.4);

			g.selectAll('.grid path').remove();
		}

		// Axes
		// A single reading (plus its padding) needs fewer ticks than a long trend.
		const xAxis = d3
			.axisBottom(xScale as any)
			.ticks(Math.min(6, allData.length + 1))
			.tickSizeOuter(0);
		const yAxis = d3
			.axisLeft(yScale as any)
			.ticks(5)
			.tickSizeOuter(0);

		g.append('g')
			.attr('transform', `translate(0,${innerHeight})`)
			.call(xAxis as any)
			.call((axis: unknown) => {
				const selection = axis as any;
				selection
					.selectAll('path,line')
					.attr('stroke', theme.axisColor);
				selection.selectAll('text').attr('fill', theme.axisColor);
			});

		g.append('g')
			.call(yAxis as any)
			.call((axis: unknown) => {
				const selection = axis as any;
				selection
					.selectAll('path,line')
					.attr('stroke', theme.axisColor);
				selection.selectAll('text').attr('fill', theme.axisColor);
			});

		const tooltip = tooltipFormatter ? getTooltipElement() : null;
		const showTooltip = (event: MouseEvent, d: T) => {
			if (!tooltip || !tooltipFormatter) return;
			tooltip.textContent = tooltipFormatter(d);
			tooltip.style.opacity = '1';
			tooltip.style.left = `${event.clientX + 8}px`;
			tooltip.style.top = `${event.clientY + 8}px`;
		};
		const moveTooltip = (event: MouseEvent) => {
			if (!tooltip) return;
			tooltip.style.left = `${event.clientX + 8}px`;
			tooltip.style.top = `${event.clientY + 8}px`;
		};
		const hideTooltip = () => {
			if (tooltip) tooltip.style.opacity = '0';
		};

		for (const s of allSeries) {
			if (s.data.length === 0) continue;
			const pointX = (d: T) => xScale(xAccessor(d) as any);
			const pointY = (d: T) => yScale(s.yAccessor(d));

			// A single reading has no line to draw, so its dot is the chart.
			const drawLine = s.drawAs !== 'dots' && s.data.length > 1;
			if (drawLine && showArea) {
				const area = d3
					.area()
					.curve(curve as any)
					.x(pointX)
					.y0(innerHeight)
					.y1(pointY);
				g.append('path')
					.datum(s.data)
					.attr('class', 'series-area')
					.attr('fill', s.color)
					.attr('fill-opacity', 0.12)
					.attr('stroke', 'none')
					.attr('d', area as any);
			}
			if (drawLine) {
				const line = d3
					.line()
					.curve(curve as any)
					.x(pointX)
					.y(pointY);
				g.append('path')
					.datum(s.data)
					.attr('class', 'series-line')
					.attr('fill', 'none')
					.attr('stroke', s.color)
					.attr('stroke-width', strokeWidth)
					.attr('d', line as any);
			}

			// Dots on sparse data (always for dots-only series) so a lone reading shows.
			if (showPoints || s.drawAs === 'dots' || s.data.length === 1) {
				g.append('g')
					.selectAll('.point')
					.data(s.data)
					.enter()
					.append('circle')
					.attr('class', 'point')
					.attr('r', s.data.length === 1 ? 4 : 3)
					.attr('fill', s.color)
					.attr('cx', pointX)
					.attr('cy', pointY)
					.on('mouseenter', showTooltip)
					.on('mouseleave', hideTooltip)
					.on('mousemove', moveTooltip);
			}
		}
	}

	static createBarChart<T>(options: BarChartOptions<T>): void {
		const {
			container,
			data,
			xAccessor,
			yAccessor,
			width = 640,
			height = 360,
			margin: marginInput,
			theme: themeInput,
			paddingInner = 0.2,
			paddingOuter = 0.1,
			showGrid = true,
			maxXTicks = 8,
			band,
			tooltipFormatter
		} = options;

		if (!container) return;
		if (!data.length) {
			this.clear(container);
			return;
		}

		const margin = resolveMargin(marginInput);
		const theme = resolveTheme(themeInput);
		const innerWidth = width - margin.left - margin.right;
		const innerHeight = height - margin.top - margin.bottom;

		this.clear(container);

		const root = d3
			.select(container as HTMLElement)
			.append('svg')
			.attr('width', width)
			.attr('height', height)
			.attr('viewBox', `0 0 ${width} ${height}`)
			.style('background', theme.background)
			.style('font-family', theme.fontFamily)
			.style('font-size', `${theme.fontSize}px`);

		const g = root
			.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		// Band positions, not labels: several readings can share one day label.
		const xDomain = data.map((_d: T, i: number) => String(i));
		const labels = data.map((d: T) => xAccessor(d));
		const xScale = d3
			.scaleBand()
			.domain(xDomain)
			.range([0, innerWidth])
			.paddingInner(paddingInner)
			.paddingOuter(paddingOuter);

		const yValues = data.map((d: T) => yAccessor(d));
		const [domainMin, domainMax] = resolveNumericDomain(yValues, {
			includeZero: true,
			include: band
		});
		const yScale = d3
			.scaleLinear()
			// Bars grow from the chart floor, so padding below zero is wasted space.
			.domain([Math.min(0, domainMin), domainMax])
			.range([innerHeight, 0])
			.nice();

		// Normal-range band sits under the grid so the bars stay readable.
		if (band) {
			const top = yScale(band.max);
			const bottom = yScale(band.min);
			g.append('rect')
				.attr('class', 'reference-band')
				.attr('x', 0)
				.attr('y', top)
				.attr('width', innerWidth)
				.attr('height', Math.max(0, bottom - top))
				.attr('fill', band.color ?? 'var(--color-success, #36d399)')
				.attr('opacity', 0.12);
		}

		// Grid
		if (showGrid) {
			const yAxisGrid = d3
				.axisLeft(yScale)
				.tickSize(-innerWidth)
				.tickFormat(() => '');

			g.append('g')
				.attr('class', 'grid')
				.call(yAxisGrid as any)
				.selectAll('line')
				.attr('stroke', theme.gridColor)
				.attr('stroke-opacity', 0.4);

			g.selectAll('.grid path').remove();
		}

		// Axes
		const labelStep = Math.ceil(data.length / Math.max(1, maxXTicks));
		const xAxis = d3
			.axisBottom(xScale)
			.tickSizeOuter(0)
			.tickValues(xDomain.filter((_d, i) => i % labelStep === 0))
			.tickFormat((value: number | { valueOf(): number }) =>
				labels[Number(value)] ?? ''
			);
		const yAxis = d3.axisLeft(yScale).ticks(5).tickSizeOuter(0);

		g.append('g')
			.attr('transform', `translate(0,${innerHeight})`)
			.call(xAxis as any)
			.call((axis: unknown) => {
				const selection = axis as any;
				selection
					.selectAll('path,line')
					.attr('stroke', theme.axisColor);
				selection.selectAll('text').attr('fill', theme.axisColor);
			});

		g.append('g')
			.call(yAxis as any)
			.call((axis: unknown) => {
				const selection = axis as any;
				selection
					.selectAll('path,line')
					.attr('stroke', theme.axisColor);
				selection.selectAll('text').attr('fill', theme.axisColor);
			});

		// Bars + tooltip
		const tooltip = tooltipFormatter ? getTooltipElement() : null;

		g.selectAll('.bar')
			.data(data)
			.enter()
			.append('rect')
			.attr('class', 'bar')
			.attr('x', (_d: T, i: number) => xScale(String(i)) ?? 0)
			.attr('y', (d: T) => yScale(yAccessor(d)))
			.attr('width', xScale.bandwidth())
			.attr('height', (d: T) => innerHeight - yScale(yAccessor(d)))
			.attr('fill', theme.barColor)
			.on('mouseenter', (event: MouseEvent, d: T) => {
				if (!tooltip || !tooltipFormatter) return;
				tooltip.textContent = tooltipFormatter(d);
				tooltip.style.opacity = '1';
				tooltip.style.left = `${event.clientX + 8}px`;
				tooltip.style.top = `${event.clientY + 8}px`;
			})
			.on('mouseleave', () => {
				if (!tooltip) return;
				tooltip.style.opacity = '0';
			})
			.on('mousemove', (event: MouseEvent) => {
				if (!tooltip) return;
				tooltip.style.left = `${event.clientX + 8}px`;
				tooltip.style.top = `${event.clientY + 8}px`;
			});
	}
}
