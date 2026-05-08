import { YesNoEnum } from '$lib/model/enum/db-link';
import type { PatientWithRelations } from '$lib/model/type/heka/patient.type';
import type { StaffWithRelations } from '$lib/model/type/heka/staff.type';
import { DateTimeUtil } from './date-time.util.svelte';
import { formatItemUnitConversionDisplay } from './item-unit-conversion.util.svelte';

type PhoneCountryInput =
	| {
			countryCallingCode?: string | null;
			phoneCode?: string | null;
	  }
	| null
	| undefined;

type ServiceItemDisplay = {
	serviceName?: string | null;
	serviceCode?: string | null;
};

export class StringUtil {
	static readonly NO_EMAIL_SUFFIX = '@no-email.heka';

	static defaultNoEmail(id: string): string {
		return `${id}${StringUtil.NO_EMAIL_SUFFIX}`;
	}

	static isNoEmail(value: string | null | undefined): boolean {
		if (!value) return false;
		return value.endsWith(StringUtil.NO_EMAIL_SUFFIX);
	}

	/** Display rule: treat "no-email" as empty */
	static displayEmail(value: string | null | undefined): string {
		if (!value) return '';
		return StringUtil.isNoEmail(value) ? '' : value;
	}

	static tableToolTip(row: any): string {
		const dateTimeUtil = new DateTimeUtil();
		const createdAt = dateTimeUtil.formatDateTime(row.createdAt);
		const updatedAt = dateTimeUtil.formatDateTime(row.updatedAt);
		const createdBy = row.createdByUser?.name ?? '—';
		const updatedBy = row.updatedByUser?.name ?? '—';
		// cancelBy: relation may be cancelByUser (refer_history, etc.) or cancelBy (service_order_detail)
		const cancelByUserRow = row.cancelByUser ?? row.cancelBy;
		const canceledBy =
			cancelByUserRow?.name ??
			(typeof row.cancelBy === 'string' && row.cancelBy.trim()
				? row.cancelBy
				: null) ??
			'—';
		const canceledAt = dateTimeUtil.formatDateTime(row.cancelAt);
		const hasCancelInfo =
			canceledBy !== '—' || (canceledAt ?? '') !== '—';

		if (hasCancelInfo) {
			return `Created by: ${createdBy}\nAt: ${createdAt}\nLast Updated by: ${updatedBy}\nAt: ${updatedAt}\nCanceled by: ${canceledBy}\nAt: ${canceledAt}`;
		}

		return `Created by: ${createdBy}\nAt: ${createdAt}\nLast Updated by: ${updatedBy}\nAt: ${updatedAt}`;
	}

	/**
	 * Row hover text for inventory list rows (flat *ByName + timestamps).
	 */
	static inventoryAuditRowTooltip(row: {
		createdAt?: string | null;
		updatedAt?: string | null;
		createdByName?: string | null;
		updatedByName?: string | null;
		approvedAt?: string | null;
		approvedByName?: string | null;
		cancelledAt?: string | null;
		cancelledByName?: string | null;
	}): string {
		const dateTimeUtil = new DateTimeUtil();
		const createdAt = dateTimeUtil.formatDateTime(row.createdAt);
		const updatedAt = dateTimeUtil.formatDateTime(row.updatedAt);
		const createdBy = row.createdByName ?? '—';
		const updatedBy = row.updatedByName ?? '—';
		const approvedBy = row.approvedByName ?? '—';
		const approvedAt = dateTimeUtil.formatDateTime(row.approvedAt);
		const canceledBy = row.cancelledByName ?? '—';
		const canceledAt = dateTimeUtil.formatDateTime(row.cancelledAt);
		const hasApprovalInfo =
			approvedBy !== '—' || (approvedAt ?? '') !== '—';
		const hasCancelInfo =
			canceledBy !== '—' || (canceledAt ?? '') !== '—';

		if (hasCancelInfo) {
			return `Created by: ${createdBy}\nAt: ${createdAt}\nLast Updated by: ${updatedBy}\nAt: ${updatedAt}${hasApprovalInfo ? `\nApproved by: ${approvedBy}\nAt: ${approvedAt}` : ''}\nCanceled by: ${canceledBy}\nAt: ${canceledAt}`;
		}

		return `Created by: ${createdBy}\nAt: ${createdAt}\nLast Updated by: ${updatedBy}\nAt: ${updatedAt}${hasApprovalInfo ? `\nApproved by: ${approvedBy}\nAt: ${approvedAt}` : ''}`;
	}

	/**
	 * snake_case / kebab-case → spaces
	 * ex: trinidad_and_tobago → trinidad and tobago
	 */
	static humanize(value: string): string {
		if (!value) return '';
		return value.replace(/[_-]+/g, ' ');
	}

	/**
	 * Capitalize each word
	 * ex: hello world → Hello World
	 */
	static titleCase(value: string): string {
		return value
			.toLowerCase()
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	/**
	 * Smart country formatter
	 */
	static countryName(value: string): string {
		const smallWords = ['and', 'of', 'the'];

		return this.humanize(value)
			.toLowerCase()
			.split(' ')
			.map((word) =>
				smallWords.includes(word)
					? word
					: word.charAt(0).toUpperCase() + word.slice(1)
			)
			.join(' ');
	}

	// =========================================================
	// Name helpers
	// =========================================================

	/**
	 * Build full name from parts:
	 * first + (space + middle?) + (space + last?)
	 */
	static fullName(
		firstName?: string | null,
		middleName?: string | null,
		lastName?: string | null
	): string {
		const parts: string[] = [];

		if (firstName && firstName.trim()) {
			parts.push(firstName.trim());
		}
		if (middleName && middleName.trim()) {
			parts.push(middleName.trim());
		}
		if (lastName && lastName.trim()) {
			parts.push(lastName.trim());
		}

		return parts.join(' ');
	}

	static fullNameWithTitle(
		titleName?: string | null,
		firstName?: string | null,
		middleName?: string | null,
		lastName?: string | null,
		type?: string | null
	): string {
		const parts: string[] = [];

		if (titleName && titleName.trim()) {
			parts.push(titleName.trim());
		}
		if (firstName && firstName.trim()) {
			parts.push(firstName.trim());
		}
		if (middleName && middleName.trim()) {
			parts.push(middleName.trim());
		}
		if (lastName && lastName.trim()) {
			parts.push(lastName.trim());
		}
		if (
			!titleName &&
			!firstName &&
			!middleName &&
			!lastName &&
			type
		) {
			parts.push(`Unknown ${type.trim()}`);
		}

		return parts.join(' ');
	}

	static patientDisplayName(patient: PatientWithRelations): string {
		const nameMasking = (patient as { nameMasking?: number })
			.nameMasking;
		if (nameMasking === YesNoEnum.YES) return '***';
		return StringUtil.fullNameWithTitle(
			patient.title?.name,
			patient.firstName,
			patient.middleName,
			patient.lastName
		);
	}

	static fullPhoneNo(
		phoneCountry?: PhoneCountryInput,
		phone?: string | null
	): string {
		const pc = phoneCountry ?? null;
		const code =
			pc == null ? '' : (pc.countryCallingCode ?? pc.phoneCode ?? '');
		if (phoneCountry && phone && code) {
			return `${code}${phone}`;
		} else if (phone) {
			return `${phone}`;
		}
		return `Unknown Phone`;
	}

	static fullIdentity(
		identityType: { name?: string | null } | null,
		identityNo: string | null
	): string {
		if (identityType && identityNo) {
			return `(${identityType.name}) ${identityNo}`;
		}

		return `Unknown Identity`;
	}

	static patientOptionDisplayName(
		patient: PatientWithRelations
	): string {
		return `${patient.code} - ${this.patientDisplayName(patient)} - ${this.fullPhoneNo(
			patient.phonePrimaryCountry,
			patient.phonePrimary
		)} - ${this.fullIdentity(patient.identityType ?? null, patient.identityNo ?? null)} - ${this.fullNameWithTitle(
			patient.fatherTitle?.name ?? null,
			patient.fatherName,
			null,
			null,
			'Father'
		)}`;
	}

	static doctorOptionDisplayName(
		doctor: StaffWithRelations | null
	): string {
		if (!doctor) return 'Unknown Doctor';
		return `${this.fullNameWithTitle(doctor.title?.name, doctor.firstName, doctor.middleName, doctor.lastName, 'Doctor')} (${doctor.specialization?.name ?? '-'})`;
	}

	static itemUnitConversionDisplay(input: {
		purchaseUnitName: string;
		issueUnitName: string;
		purchaseFactor: number;
		issueFactor: number;
	}): string {
		return formatItemUnitConversionDisplay(input);
	}

	static serviceOptionDisplayName(service: ServiceItemDisplay): string {
		return `${service.serviceName ?? 'Unknown Service'} (${service.serviceCode ?? '-'})`;
	}

	// =========================================================
	// 🔥 NEW URL HELPERS
	// =========================================================

	/**
	 * Parse URL string into clean path segments
	 * /heka/home/admin?x=1#top
	 * → ['heka', 'home', 'admin']
	 */
	static parseUrlSegments(url: string): string[] {
		if (!url) return [];

		return url
			.split('?')[0]
			.split('#')[0]
			.replace(/^\/|\/$/g, '')
			.split('/')
			.filter(Boolean);
	}

	/**
	 * Get last segment from URL
	 * /heka/home/admin → admin
	 */
	static lastSegment(url: string): string {
		const segments = this.parseUrlSegments(url);
		return segments.at(-1) ?? '';
	}

	/**
	 * Convert single segment → readable label
	 * example-path → Example Path
	 * audit_trail → Audit Trail
	 */
	static segmentToLabel(segment: string): string {
		return this.titleCase(this.humanize(segment));
	}

	/**
	 * Convert all segments → labels
	 * /heka/home/admin → ['Heka', 'Home', 'Admin']
	 */
	static segmentsToLabels(url: string): string[] {
		return this.parseUrlSegments(url).map(
			this.segmentToLabel.bind(this)
		);
	}

	/**
	 * Convert whole path → title
	 * /heka/home/audit-trail → "Heka Home Audit Trail"
	 */
	static urlToTitle(url: string): string {
		return this.segmentsToLabels(url).join(' ');
	}

	/**
	 * Get last N segments from URL as title
	 * /heka/home/administration/audit-trail, 2 → "Administration Audit Trail"
	 */
	static urlToTitleLast(url: string, lastN: number): string {
		const segments = this.parseUrlSegments(url);
		const lastSegments = segments.slice(-lastN); // take last N
		return lastSegments.map(this.segmentToLabel.bind(this)).join(' ');
	}
}
