import { describe, expect, it } from 'vitest';
import { medoraHospitalNavHref } from '$lib/model/enum/routes.enum';

const HID = '01900000-0000-7000-8000-000000000001';

describe('medoraHospitalNavHref', () => {
	it('maps a DB page URL to a hospital route', () => {
		expect(
			medoraHospitalNavHref(
				HID,
				'/medora/home/administration/document-master/document-type'
			)
		).toBe(
			`/medora/hospital/${HID}/home/administration/document-master/document-type`
		);
	});

	it('rejects placeholders and relative junk (no document-master/-)', () => {
		expect(
			medoraHospitalNavHref(HID, '-')
		).toBeNull();
		expect(
			medoraHospitalNavHref(HID, '/other/path')
		).toBeNull();
		expect(medoraHospitalNavHref('', '/medora/home/administration')).toBeNull();
		expect(medoraHospitalNavHref(HID, null)).toBeNull();
	});
});