import { SvelteDate } from 'svelte/reactivity';

export class DateTimeUtil {
	constructor() {}
	getCurrentDateTime(): string {
		return new SvelteDate().toISOString();
	}

	formatDate(
		date: Date,
		locale: string = 'en-US',
		options?: Intl.DateTimeFormatOptions
	): string {
		return date.toLocaleDateString(locale, options);
	}

	formatTime(
		date: Date,
		locale: string = 'en-US',
		options?: Intl.DateTimeFormatOptions
	): string {
		return date.toLocaleTimeString(locale, options);
	}

	formatDateTime(
		date: Date,
		locale: string = 'en-US',
		options?: Intl.DateTimeFormatOptions
	): string {
		return date.toLocaleString(locale, options);
	}
	parseDate(dateString: string): Date | null {
		const date = new SvelteDate(dateString);
		return isNaN(date.getTime()) ? null : date;
	}

	addDays(date: Date, days: number): Date {
		const result = new SvelteDate(date);
		result.setDate(result.getDate() + days);
		return result;
	}
	addMonths(date: Date, months: number): Date {
		const result = new SvelteDate(date);
		result.setMonth(result.getMonth() + months);
		return result;
	}

	addYears(date: Date, years: number): Date {
		const result = new SvelteDate(date);
		result.setFullYear(result.getFullYear() + years);
		return result;
	}

	differenceInDays(date1: Date, date2: Date): number {
		const diffTime = Math.abs(date2.getTime() - date1.getTime());
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	}

	isLeapYear(year: number): boolean {
		return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
	}

	getDayOfWeek(date: Date, locale: string = 'en-US'): string {
		return date.toLocaleDateString(locale, { weekday: 'long' });
	}

	getMonthName(date: Date, locale: string = 'en-US'): string {
		return date.toLocaleDateString(locale, { month: 'long' });
	}

	getYear(date: Date): number {
		return date.getFullYear();
	}

	getDaysInMonth(year: number, month: number): number {
		return new SvelteDate(year, month + 1, 0).getDate();
	}

	isValidDate(date: Date): boolean {
		return !isNaN(date.getTime());
	}

	toUnixTimestamp(date: Date): number {
		return Math.floor(date.getTime() / 1000);
	}

	fromUnixTimestamp(timestamp: number): Date {
		return new SvelteDate(timestamp * 1000);
	}
	isSameDay(date1: Date, date2: Date): boolean {
		return (
			date1.getFullYear() === date2.getFullYear() &&
			date1.getMonth() === date2.getMonth() &&
			date1.getDate() === date2.getDate()
		);
	}

	isBefore(date1: Date, date2: Date): boolean {
		return date1.getTime() < date2.getTime();
	}

	isAfter(date1: Date, date2: Date): boolean {
		return date1.getTime() > date2.getTime();
	}
	cloneDate(date: Date): Date {
		return new SvelteDate(date.getTime());
	}

	startOfDay(date: Date): Date {
		const clonedDate = this.cloneDate(date);
		clonedDate.setHours(0, 0, 0, 0);
		return clonedDate;
	}

	endOfDay(date: Date): Date {
		const clonedDate = this.cloneDate(date);
		clonedDate.setHours(23, 59, 59, 999);
		return clonedDate;
	}

	startOfMonth(date: Date): Date {
		const clonedDate = this.cloneDate(date);
		clonedDate.setDate(1);
		clonedDate.setHours(0, 0, 0, 0);
		return clonedDate;
	}
	endOfMonth(date: Date): Date {
		const clonedDate = this.cloneDate(date);
		clonedDate.setMonth(clonedDate.getMonth() + 1);
		clonedDate.setDate(0);
		clonedDate.setHours(23, 59, 59, 999);
		return clonedDate;
	}

	startOfYear(date: Date): Date {
		const clonedDate = this.cloneDate(date);
		clonedDate.setMonth(0, 1);
		clonedDate.setHours(0, 0, 0, 0);
		return clonedDate;
	}
	endOfYear(date: Date): Date {
		const clonedDate = this.cloneDate(date);
		clonedDate.setMonth(11, 31);
		clonedDate.setHours(23, 59, 59, 999);
		return clonedDate;
	}
	formatRelative(
		date: Date,
		baseDate: Date = new SvelteDate()
	): string {
		const diffInSeconds = Math.floor(
			(baseDate.getTime() - date.getTime()) / 1000
		);
		const intervals: { [key: string]: number } = {
			year: 31536000,
			month: 2592000,
			week: 604800,
			day: 86400,
			hour: 3600,
			minute: 60,
			second: 1
		};

		for (const interval in intervals) {
			const intervalSeconds = intervals[interval];
			if (diffInSeconds >= intervalSeconds) {
				const count = Math.floor(diffInSeconds / intervalSeconds);
				return `${count} ${interval}${count !== 1 ? 's' : ''} ago`;
			}
		}
		return 'just now';
	}

	isWeekend(date: Date): boolean {
		const day = date.getDay();
		return day === 0 || day === 6;
	}
	isWeekday(date: Date): boolean {
		const day = date.getDay();
		return day >= 1 && day <= 5;
	}

	getWeekNumber(date: Date): number {
		const clonedDate = this.cloneDate(date);
		clonedDate.setHours(0, 0, 0, 0);
		clonedDate.setDate(
			clonedDate.getDate() + 4 - (clonedDate.getDay() || 7)
		);
		const yearStart = new SvelteDate(clonedDate.getFullYear(), 0, 1);
		return Math.ceil(
			((clonedDate.getTime() - yearStart.getTime()) / 86400000 + 1) /
				7
		);
	}
	getQuarter(date: Date): number {
		return Math.floor(date.getMonth() / 3) + 1;
	}

	getDaysBetween(date1: Date, date2: Date): number {
		const start = this.startOfDay(date1);
		const end = this.startOfDay(date2);
		const diffTime = Math.abs(end.getTime() - start.getTime());
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	}
	getMonthsBetween(date1: Date, date2: Date): number {
		const start = new SvelteDate(
			date1.getFullYear(),
			date1.getMonth(),
			1
		);
		const end = new SvelteDate(
			date2.getFullYear(),
			date2.getMonth(),
			1
		);
		return (
			(end.getFullYear() - start.getFullYear()) * 12 +
			(end.getMonth() - start.getMonth())
		);
	}
	getYearsBetween(date1: Date, date2: Date): number {
		return date2.getFullYear() - date1.getFullYear();
	}
	isSameMonth(date1: Date, date2: Date): boolean {
		return (
			date1.getFullYear() === date2.getFullYear() &&
			date1.getMonth() === date2.getMonth()
		);
	}
	isSameYear(date1: Date, date2: Date): boolean {
		return date1.getFullYear() === date2.getFullYear();
	}
	toISOStringWithoutMillis(date: Date): string {
		return date.toISOString().split('.')[0] + 'Z';
	}

	parseISODate(dateString: string): Date | null {
		const isoRegex =
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
		if (!isoRegex.test(dateString)) return null;
		const date = new SvelteDate(dateString);
		return isNaN(date.getTime()) ? null : date;
	}
	getOrdinalSuffix(day: number): string {
		if (day > 3 && day < 21) return 'th';
		switch (day % 10) {
			case 1:
				return 'st';
			case 2:
				return 'nd';
			case 3:
				return 'rd';
			default:
				return 'th';
		}
	}
	formatWithOrdinal(
		date: Date,
		locale: string = 'en-US',
		options?: Intl.DateTimeFormatOptions
	): string {
		const day = date.getDate();
		const suffix = this.getOrdinalSuffix(day);
		const dayWithSuffix = `${day}${suffix}`;
		const formattedDate = date.toLocaleDateString(locale, {
			...options,
			day: 'numeric'
		});
		return formattedDate.replace(day.toString(), dayWithSuffix);
	}

	parseCustomDate(dateString: string, format: string): Date | null {
		const formatParts = format.match(/(YYYY|MM|DD|HH|mm|ss)/g);
		const dateParts = dateString.match(/(\d{2,4})/g);
		if (
			!formatParts ||
			!dateParts ||
			formatParts.length !== dateParts.length
		)
			return null;

		const dateObj: { [key: string]: number } = {
			YYYY: 1970,
			MM: 1,
			DD: 1,
			HH: 0,
			mm: 0,
			ss: 0
		};
		formatParts.forEach((part, index) => {
			dateObj[part] = parseInt(dateParts[index], 10);
		});
		const date = new SvelteDate(
			dateObj.YYYY,
			dateObj.MM - 1,
			dateObj.DD,
			dateObj.HH,
			dateObj.mm,
			dateObj.ss
		);
		return isNaN(date.getTime()) ? null : date;
	}
	getTimezoneOffset(date: Date): number {
		return date.getTimezoneOffset();
	}

	convertToTimezone(date: Date, timeZone: string): string {
		return date.toLocaleString('en-US', { timeZone });
	}
	getCurrentTimezone(): string {
		return Intl.DateTimeFormat().resolvedOptions().timeZone;
	}

	isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
		return date >= startDate && date <= endDate;
	}

	getAge(birthDate: Date): number {
		const today = new SvelteDate();
		let age = today.getFullYear() - birthDate.getFullYear();
		const m = today.getMonth() - birthDate.getMonth();
		if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
			age--;
		}
		return age;
	}
	getNextDay(date: Date): Date {
		return this.addDays(date, 1);
	}

	getPreviousDay(date: Date): Date {
		return this.addDays(date, -1);
	}
	getMidnight(date: Date): Date {
		return this.startOfDay(date);
	}

	getNoon(date: Date): Date {
		const clonedDate = this.cloneDate(date);
		clonedDate.setHours(12, 0, 0, 0);
		return clonedDate;
	}
	getRandomDate(start: Date, end: Date): Date {
		const startTime = start.getTime();
		const endTime = end.getTime();
		const randomTime =
			startTime + Math.random() * (endTime - startTime);
		return new SvelteDate(randomTime);
	}
	isDateInFuture(date: Date): boolean {
		return date.getTime() > new SvelteDate().getTime();
	}
	isDateInPast(date: Date): boolean {
		return date.getTime() < new SvelteDate().getTime();
	}
	getDateComponents(date: Date): {
		year: number;
		month: number;
		day: number;
		hours: number;
		minutes: number;
		seconds: number;
		milliseconds: number;
	} {
		return {
			year: date.getFullYear(),
			month: date.getMonth() + 1,
			day: date.getDate(),
			hours: date.getHours(),
			minutes: date.getMinutes(),
			seconds: date.getSeconds(),
			milliseconds: date.getMilliseconds()
		};
	}
	fromDateComponents(components: {
		year: number;
		month: number;
		day: number;
		hours?: number;
		minutes?: number;
		seconds?: number;
		milliseconds?: number;
	}): Date {
		return new SvelteDate(
			components.year,
			(components.month || 1) - 1,
			components.day || 1,
			components.hours || 0,
			components.minutes || 0,
			components.seconds || 0,
			components.milliseconds || 0
		);
	}
	sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
	isSameHour(date1: Date, date2: Date): boolean {
		return (
			date1.getFullYear() === date2.getFullYear() &&
			date1.getMonth() === date2.getMonth() &&
			date1.getDate() === date2.getDate() &&
			date1.getHours() === date2.getHours()
		);
	}
	isSameMinute(date1: Date, date2: Date): boolean {
		return (
			this.isSameHour(date1, date2) &&
			date1.getMinutes() === date2.getMinutes()
		);
	}
	isSameSecond(date1: Date, date2: Date): boolean {
		return (
			this.isSameMinute(date1, date2) &&
			date1.getSeconds() === date2.getSeconds()
		);
	}
	getTimeDifference(
		date1: Date,
		date2: Date
	): {
		days: number;
		hours: number;
		minutes: number;
		seconds: number;
	} {
		let delta = Math.abs(date2.getTime() - date1.getTime()) / 1000;
		const days = Math.floor(delta / 86400);
		delta -= days * 86400;
		const hours = Math.floor(delta / 3600) % 24;
		delta -= hours * 3600;
		const minutes = Math.floor(delta / 60) % 60;
		delta -= minutes * 60;
		const seconds = Math.floor(delta % 60);
		return { days, hours, minutes, seconds };
	}
	formatDuration(seconds: number): string {
		const hrs = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return [hrs, mins, secs]
			.map((v) => (v < 10 ? '0' + v : v))
			.filter((v, i) => v !== '00' || i > 0)
			.join(':');
	}
	parseDuration(duration: string): number | null {
		const parts = duration
			.split(':')
			.map((part) => parseInt(part, 10));
		if (parts.some(isNaN)) return null;
		let seconds = 0;
		if (parts.length === 3) {
			seconds += parts[0] * 3600; // hours
			seconds += parts[1] * 60;
			seconds += parts[2]; // seconds
		} else if (parts.length === 2) {
			seconds += parts[0] * 60;
			seconds += parts[1]; // seconds
		} else if (parts.length === 1) {
			seconds += parts[0]; // seconds
		} else {
			return null;
		}
		return seconds;
	}

	getWeekStartDate(date: Date, weekStartsOn: number = 0): Date {
		const clonedDate = this.cloneDate(date);
		const day = clonedDate.getDay();
		const diff = (day < weekStartsOn ? -7 : 0) + weekStartsOn - day;
		clonedDate.setDate(clonedDate.getDate() + diff);
		return this.startOfDay(clonedDate);
	}

	getWeekEndDate(date: Date, weekStartsOn: number = 0): Date {
		const startOfWeek = this.getWeekStartDate(date, weekStartsOn);
		const endOfWeek = this.addDays(startOfWeek, 6);
		return this.endOfDay(endOfWeek);
	}

	formatDateWithTimezone(
		date: Date,
		locale: string = 'en-US',
		timeZone: string = 'UTC',
		options?: Intl.DateTimeFormatOptions
	): string {
		return date.toLocaleString(locale, { timeZone, ...options });
	}
}
