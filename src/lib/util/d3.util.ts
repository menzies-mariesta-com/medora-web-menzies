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

export interface LineChartOptions<T> extends BaseChartOptions<T> {
	xAccessor: (d: T) => Date | number;
	yAccessor: (d: T) => number;
	xScaleType?: Extract<ChartScaleType, 'linear' | 'time'>;
	yScaleType?: 'linear' | 'log';
	curve?: unknown;
	strokeWidth?: number;
	showPoints?: boolean;
	showGrid?: boolean;
	tooltipFormatter?: (d: T) => string;
}

export interface BarChartOptions<T> extends BaseChartOptions<T> {
	xAccessor: (d: T) => string;
	yAccessor: (d: T) => number;
	paddingInner?: number;
	paddingOuter?: number;
	showGrid?: boolean;
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

		// Scales
		let xScale: any;

		if (xScaleType === 'time') {
			const xExtent = d3.extent(data, (d: T) => xAccessor(d) as Date);
			xScale = d3
				.scaleTime()
				.domain(xExtent as [Date, Date])
				.range([0, innerWidth])
				.nice();
		} else {
			const xExtent = d3.extent(data, (d: T) =>
				Number(xAccessor(d))
			) as [number, number];
			xScale = d3
				.scaleLinear()
				.domain(xExtent)
				.range([0, innerWidth])
				.nice();
		}

		let yScale: any;

		const yMax = d3.max(data, (d: T) => yAccessor(d)) ?? 0;
		const yMin = d3.min(data, (d: T) => yAccessor(d)) ?? 0;

		if (yScaleType === 'log') {
			const minPositive = Math.max(
				Number.MIN_VALUE,
				d3.min(data, (d: T) =>
					yAccessor(d) > 0 ? yAccessor(d) : Number.POSITIVE_INFINITY
				) ?? 1
			);
			yScale = d3
				.scaleLog()
				.domain([minPositive, yMax || 1])
				.range([innerHeight, 0])
				.nice();
		} else {
			yScale = d3
				.scaleLinear()
				.domain([Math.min(0, yMin), yMax || 1])
				.range([innerHeight, 0])
				.nice();
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
		const xAxis = d3.axisBottom(xScale as any).tickSizeOuter(0);
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

		// Line generator
		const line = d3
			.line()
			.curve(curve)
			.x((d: T) => {
				const x = xAccessor(d);
				return xScale(x as any);
			})
			.y((d: T) => yScale(yAccessor(d)));

		g.append('path')
			.datum(data)
			.attr('fill', 'none')
			.attr('stroke', theme.lineColor)
			.attr('stroke-width', strokeWidth)
			.attr('d', line as any);

		// Points + tooltip
		if (showPoints) {
			const tooltip = tooltipFormatter ? getTooltipElement() : null;

			g.selectAll('.point')
				.data(data)
				.enter()
				.append('circle')
				.attr('class', 'point')
				.attr('r', 3)
				.attr('fill', theme.lineColor)
				.attr('cx', (d: T) => {
					const x = xAccessor(d);
					return xScale(x as any);
				})
				.attr('cy', (d: T) => yScale(yAccessor(d)))
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

		const xDomain = data.map((d: T) => xAccessor(d));
		const xScale = d3
			.scaleBand()
			.domain(xDomain)
			.range([0, innerWidth])
			.paddingInner(paddingInner)
			.paddingOuter(paddingOuter);

		const yMax = d3.max(data, (d: T) => yAccessor(d)) ?? 0;
		const yScale = d3
			.scaleLinear()
			.domain([0, yMax || 1])
			.range([innerHeight, 0])
			.nice();

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
		const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);
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
			.attr('x', (d: T) => xScale(xAccessor(d)) ?? 0)
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
