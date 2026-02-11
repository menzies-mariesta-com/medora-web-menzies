import { YesNoEnum } from "$lib/model/enum/db-link";
import type { PatientWithRelations } from "$lib/remote/table/information-table/patient.remote";

export class StringUtil {
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
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
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
      .map(word =>
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
    lastName?: string | null
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

    return parts.join(' ');
  }

	static patientDisplayName(patient: PatientWithRelations): string {
		const nameMasking = (patient as { nameMasking?: number }).nameMasking;
		if (nameMasking === YesNoEnum.YES) return '***';
		return StringUtil.fullNameWithTitle(
			patient.title?.name,
			patient.firstName,
			patient.middleName,
			patient.lastName
		);
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
    return this.parseUrlSegments(url).map(this.segmentToLabel.bind(this));
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
