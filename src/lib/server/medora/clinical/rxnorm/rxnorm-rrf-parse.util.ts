/**
 * Parse UMLS RRF pipe-delimited lines (trailing pipe).
 */

export function parseRrfLine(line: string): string[] {
	const trimmed = line.replace(/\r?\n$/, '');
	if (!trimmed) return [];
	const parts = trimmed.split('|');
	if (parts.length > 0 && parts[parts.length - 1] === '') {
		parts.pop();
	}
	return parts;
}

/** RXNCONSO: RXCUI|LAT|TS|LUI|STT|SUI|ISPREF|RXAUI|SAUI|SCUI|SDUI|SAB|TTY|CODE|STR|SRL|SUPPRESS|CVF */
export type RxnConsoRow = {
	rxcui: string;
	lat: string;
	sab: string;
	tty: string;
	str: string;
	suppress: string;
};

export function parseRxnConsoLine(line: string): RxnConsoRow | null {
	const p = parseRrfLine(line);
	if (p.length < 17) return null;
	return {
		rxcui: p[0] ?? '',
		lat: p[1] ?? '',
		sab: p[11] ?? '',
		tty: p[12] ?? '',
		str: p[14] ?? '',
		suppress: p[16] ?? ''
	};
}

/** RXNREL: RXCUI1|RXAUI1|STYPE1|REL|RXCUI2|RXAUI2|STYPE2|RELA|RUI|SRUI|SAB|SL|DIR|RG|SUPPRESS|CVF */
export type RxnRelRow = {
	rxcui1: string;
	rxcui2: string;
	rela: string;
	sab: string;
	suppress: string;
};

export function parseRxnRelLine(line: string): RxnRelRow | null {
	const p = parseRrfLine(line);
	if (p.length < 16) return null;
	return {
		rxcui1: p[0] ?? '',
		rxcui2: p[4] ?? '',
		rela: p[7] ?? '',
		sab: p[10] ?? '',
		suppress: p[14] ?? ''
	};
}

/** RXNSAT: RXCUI|LUI|SUI|RXAUI|STYPE|CODE|ATV|ATN|SAB|SUPPRESS|CVF */
export type RxnSatRow = {
	rxcui: string;
	atn: string;
	atv: string;
	sab: string;
	suppress: string;
};

export function parseRxnSatLine(line: string): RxnSatRow | null {
	const p = parseRrfLine(line);
	if (p.length < 11) return null;
	return {
		rxcui: p[0] ?? '',
		atn: p[7] ?? '',
		atv: p[6] ?? '',
		sab: p[8] ?? '',
		suppress: p[9] ?? ''
	};
}

export function normalizeRxnormName(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.replace(/\s+/g, ' ');
}
