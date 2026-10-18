import { ApiErrorCodeEnum } from '$lib/model/enum/api-error.enum';

/** Parse machine-readable code from a failed fetch Response body. */
export async function readApiErrorCode(
	res: Response
): Promise<string | null> {
	try {
		const data = (await res.clone().json()) as { code?: string };
		return typeof data.code === 'string' ? data.code : null;
	} catch {
		return null;
	}
}

export function isErBedRequiredCode(code: string | null): boolean {
	return code === ApiErrorCodeEnum.ER_BED_REQUIRED;
}
