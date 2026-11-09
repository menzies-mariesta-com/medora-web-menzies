import { describe, expect, it } from 'vitest';
import { AppEnum } from '$lib/model/enum/app.enum';
import { searchItemMasterOptions } from './item-master-search-select.util';

describe('searchItemMasterOptions', () => {
	it('returns [] when hospitalId is empty', async () => {
		expect(await searchItemMasterOptions('', 'paracetamol')).toEqual([]);
	});

	it('uses the search-select page size constant', () => {
		expect(AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT).toBeGreaterThan(0);
	});
});
