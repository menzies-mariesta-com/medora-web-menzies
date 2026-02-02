export class StringUtil {
  /**
   * Convert snake_case / kebab-case to spaced text
   * ex: trinidad_and_tobago → trinidad and tobago
   */
  static humanize(value: string): string {
    if (!value) return '';
    return value.replace(/[_-]+/g, ' ');
  }

  /**
   * Capitalize each word
   * ex: trinidad and tobago → Trinidad And Tobago
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
   * snake_case → Trinidad and Tobago
   * keeps small words lowercase for natural reading
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
}