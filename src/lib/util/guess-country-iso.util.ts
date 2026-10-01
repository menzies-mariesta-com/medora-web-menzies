/**
 * Client-safe country ISO guess from locale region and/or IANA timezone.
 * No network calls. Returns uppercase ISO 3166-1 alpha-2, or null.
 */

/** Common IANA zones → ISO country (primary country for multi-country zones). */
const TIMEZONE_TO_ISO: Record<string, string> = {
	'Africa/Cairo': 'EG',
	'Africa/Johannesburg': 'ZA',
	'Africa/Lagos': 'NG',
	'Africa/Nairobi': 'KE',
	'America/Argentina/Buenos_Aires': 'AR',
	'America/Bogota': 'CO',
	'America/Chicago': 'US',
	'America/Denver': 'US',
	'America/Lima': 'PE',
	'America/Los_Angeles': 'US',
	'America/Mexico_City': 'MX',
	'America/New_York': 'US',
	'America/Sao_Paulo': 'BR',
	'America/Toronto': 'CA',
	'America/Vancouver': 'CA',
	'Asia/Bangkok': 'TH',
	'Asia/Colombo': 'LK',
	'Asia/Dhaka': 'BD',
	'Asia/Dubai': 'AE',
	'Asia/Hong_Kong': 'HK',
	'Asia/Jakarta': 'ID',
	'Asia/Karachi': 'PK',
	'Asia/Kolkata': 'IN',
	'Asia/Kuala_Lumpur': 'MY',
	'Asia/Manila': 'PH',
	'Asia/Rangoon': 'MM',
	'Asia/Seoul': 'KR',
	'Asia/Shanghai': 'CN',
	'Asia/Singapore': 'SG',
	'Asia/Taipei': 'TW',
	'Asia/Tokyo': 'JP',
	'Asia/Yangon': 'MM',
	'Australia/Melbourne': 'AU',
	'Australia/Sydney': 'AU',
	'Europe/Amsterdam': 'NL',
	'Europe/Berlin': 'DE',
	'Europe/London': 'GB',
	'Europe/Madrid': 'ES',
	'Europe/Moscow': 'RU',
	'Europe/Paris': 'FR',
	'Europe/Rome': 'IT',
	'Europe/Warsaw': 'PL',
	'Pacific/Auckland': 'NZ',
	'Pacific/Honolulu': 'US'
};

function regionFromLocaleTag(tag: string): string | null {
	const trimmed = tag?.trim();
	if (!trimmed) return null;
	// Prefer an explicit region in the tag (en-MM). Do not use Locale.maximize():
	// bare "en" often invents "US" and would override a better timezone guess.
	try {
		const region = new Intl.Locale(trimmed).region;
		if (region && /^[A-Za-z]{2}$/.test(region)) return region.toUpperCase();
	} catch {
		/* fall through */
	}
	const match = /^[A-Za-z]{2,3}[-_]([A-Za-z]{2})\b/.exec(trimmed);
	return match ? match[1].toUpperCase() : null;
}

function regionFromNavigatorLocales(): string | null {
	if (typeof navigator === 'undefined') return null;
	const tags = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
	for (const tag of tags) {
		const region = regionFromLocaleTag(tag);
		if (region) return region;
	}
	return null;
}

function regionFromTimezone(): string | null {
	if (typeof Intl === 'undefined') return null;
	try {
		const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (!timeZone) return null;
		const direct = TIMEZONE_TO_ISO[timeZone];
		if (direct) return direct;
		return null;
	} catch {
		return null;
	}
}

/** Best-effort ISO country code for the current browser environment. */
export function guessCountryIsoCode(): string | null {
	// Prefer timezone (closer to physical location) over language region.
	return regionFromTimezone() ?? regionFromNavigatorLocales();
}
