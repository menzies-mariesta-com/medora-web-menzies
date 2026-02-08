/**
 * Returns a URL suitable for displaying a staff photo (e.g. in img src).
 * If the stored URL is a Tigris URL (t3.storage.dev), rewrites it to our
 * proxy so the image loads using the server's get permission.
 */
export function getStaffPhotoDisplayUrl(url: string | null | undefined): string | undefined {
	if (!url?.trim()) return undefined;
	const u = url.trim();
	if (u.startsWith('/')) return u; // already relative (e.g. proxy URL)
	try {
		if (u.includes('t3.storage.dev')) {
			const pathname = new URL(u).pathname;
			return pathname ? `/api/staff-photo${pathname}` : u;
		}
	} catch {
		// ignore invalid URL
	}
	return u;
}
