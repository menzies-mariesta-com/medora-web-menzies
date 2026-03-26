export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
	FATAL = 4,
	SILENT = 5
}

const LEVEL_LABELS: Record<LogLevel, string> = {
	[LogLevel.DEBUG]: 'DEBUG',
	[LogLevel.INFO]: 'INFO',
	[LogLevel.WARN]: 'WARN',
	[LogLevel.ERROR]: 'ERROR',
	[LogLevel.FATAL]: 'FATAL',
	[LogLevel.SILENT]: 'SILENT'
};

const LEVEL_COLORS: Record<LogLevel, string> = {
	[LogLevel.DEBUG]: '\x1b[36m', // cyan
	[LogLevel.INFO]: '\x1b[32m', // green
	[LogLevel.WARN]: '\x1b[33m', // yellow
	[LogLevel.ERROR]: '\x1b[31m', // red
	[LogLevel.FATAL]: '\x1b[35m', // magenta
	[LogLevel.SILENT]: ''
};
const RESET = '\x1b[0m';

type LogMeta = Record<string, unknown>;

interface LogEntry {
	timestamp: string;
	level: string;
	scope: string;
	message: string;
	meta?: LogMeta;
	error?: { message: string; stack?: string };
	env: 'server' | 'client';
}

const browser =
	typeof window !== 'undefined' && typeof document !== 'undefined';
const dev = process.env.NODE_ENV !== 'production';

function parseLevel(value: string | undefined): LogLevel {
	if (!value) return dev ? LogLevel.DEBUG : LogLevel.INFO;
	const upper = value.toUpperCase();
	const match = Object.entries(LEVEL_LABELS).find(
		([, v]) => v === upper
	);
	return match ? (Number(match[0]) as LogLevel) : LogLevel.INFO;
}

function getConfiguredLevel(): LogLevel {
	if (browser) {
		try {
			const stored = localStorage.getItem('heka_log_level');
			if (stored) return parseLevel(stored);
		} catch {
			// ignore
		}
		return dev ? LogLevel.DEBUG : LogLevel.WARN;
	}
	try {
		return parseLevel(process.env.LOG_LEVEL);
	} catch {
		return dev ? LogLevel.DEBUG : LogLevel.INFO;
	}
}

let globalLevel = getConfiguredLevel();

export function setGlobalLogLevel(level: LogLevel): void {
	globalLevel = level;
}

export class Logger {
	private scope: string;
	private defaultMeta: LogMeta;

	constructor(scope: string, defaultMeta: LogMeta = {}) {
		this.scope = scope;
		this.defaultMeta = defaultMeta;
	}

	child(subScope: string, meta: LogMeta = {}): Logger {
		return new Logger(`${this.scope}:${subScope}`, {
			...this.defaultMeta,
			...meta
		});
	}

	debug(message: string, meta?: LogMeta): void {
		this.log(LogLevel.DEBUG, message, meta);
	}

	info(message: string, meta?: LogMeta): void {
		this.log(LogLevel.INFO, message, meta);
	}

	warn(message: string, meta?: LogMeta): void {
		this.log(LogLevel.WARN, message, meta);
	}

	error(
		message: string,
		errorOrMeta?: Error | LogMeta,
		meta?: LogMeta
	): void {
		if (errorOrMeta instanceof Error) {
			this.log(LogLevel.ERROR, message, meta, errorOrMeta);
		} else {
			this.log(LogLevel.ERROR, message, errorOrMeta);
		}
	}

	fatal(
		message: string,
		errorOrMeta?: Error | LogMeta,
		meta?: LogMeta
	): void {
		if (errorOrMeta instanceof Error) {
			this.log(LogLevel.FATAL, message, meta, errorOrMeta);
		} else {
			this.log(LogLevel.FATAL, message, errorOrMeta);
		}
	}

	/**
	 * Measure async operation duration.
	 * Returns the result of `fn` and logs elapsed time.
	 */
	async time<T>(
		label: string,
		fn: () => Promise<T>,
		meta?: LogMeta
	): Promise<T> {
		const start = performance.now();
		try {
			const result = await fn();
			const elapsed = (performance.now() - start).toFixed(1);
			this.info(`${label} completed`, {
				...meta,
				durationMs: elapsed
			});
			return result;
		} catch (err) {
			const elapsed = (performance.now() - start).toFixed(1);
			this.error(
				`${label} failed`,
				err instanceof Error ? err : undefined,
				{ ...meta, durationMs: elapsed }
			);
			throw err;
		}
	}

	private log(
		level: LogLevel,
		message: string,
		meta?: LogMeta,
		err?: Error
	): void {
		if (level < globalLevel) return;

		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level: LEVEL_LABELS[level],
			scope: this.scope,
			message,
			env: browser ? 'client' : 'server'
		};

		const mergedMeta = { ...this.defaultMeta, ...meta };
		if (Object.keys(mergedMeta).length > 0) {
			entry.meta = mergedMeta;
		}

		if (err) {
			entry.error = { message: err.message, stack: err.stack };
		}

		if (browser) {
			this.logBrowser(level, entry);
		} else {
			this.logServer(level, entry);
		}
	}

	private logBrowser(level: LogLevel, entry: LogEntry): void {
		const prefix = `%c[${entry.level}]%c [${entry.scope}]`;
		const levelStyle = `color: ${this.browserColor(level)}; font-weight: bold`;
		const scopeStyle = 'color: #888; font-weight: normal';

		const args: unknown[] = [
			prefix,
			levelStyle,
			scopeStyle,
			entry.message
		];
		if (entry.meta) args.push(entry.meta);
		if (entry.error) args.push(entry.error);

		switch (level) {
			case LogLevel.DEBUG:
				console.debug(...args);
				break;
			case LogLevel.WARN:
				console.warn(...args);
				break;
			case LogLevel.ERROR:
			case LogLevel.FATAL:
				console.error(...args);
				break;
			default:
				console.log(...args);
		}
	}

	private logServer(_level: LogLevel, entry: LogEntry): void {
		const color = LEVEL_COLORS[_level] || '';
		const line =
			`${color}[${entry.level}]${RESET} ` +
			`\x1b[90m${entry.timestamp}\x1b[0m ` +
			`\x1b[1m[${entry.scope}]\x1b[0m ` +
			entry.message;

		const extra: string[] = [];
		if (entry.meta)
			extra.push(`  meta=${JSON.stringify(entry.meta)}`);
		if (entry.error) {
			extra.push(`  error=${entry.error.message}`);
			if (entry.error.stack)
				extra.push(`  stack=${entry.error.stack}`);
		}

		const output =
			extra.length > 0 ? `${line}\n${extra.join('\n')}` : line;

		switch (_level) {
			case LogLevel.WARN:
				console.warn(output);
				break;
			case LogLevel.ERROR:
			case LogLevel.FATAL:
				console.error(output);
				break;
			default:
				console.log(output);
		}
	}

	private browserColor(level: LogLevel): string {
		switch (level) {
			case LogLevel.DEBUG:
				return '#0ea5e9';
			case LogLevel.INFO:
				return '#22c55e';
			case LogLevel.WARN:
				return '#eab308';
			case LogLevel.ERROR:
				return '#ef4444';
			case LogLevel.FATAL:
				return '#a855f7';
			default:
				return '#888';
		}
	}
}

const rootLogger = new Logger('heka');

export const log = rootLogger;
export const dbLogger = rootLogger.child('db');
export const authLogger = rootLogger.child('auth');
export const remoteLogger = rootLogger.child('remote');
export const apiLogger = rootLogger.child('api');
export const uiLogger = rootLogger.child('ui');
export const seedLogger = rootLogger.child('seed');
