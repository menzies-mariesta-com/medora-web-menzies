import { query } from '$app/server';
import { MarketplaceConfig } from '$lib/config/api.config';
import type { MarketplaceStoreInterface } from '$lib/model/interface/third-party-api/marketplace/marketplace-store.interface';

const BASE_PATH = '/store';

export const getStore = query(
	async (): Promise<MarketplaceStoreInterface[]> => {
		const response = await fetch(
			MarketplaceConfig.base_url + BASE_PATH
		);

		if (!response.ok) {
			throw new Error(
				`Store API error: ${response.status} ${response.statusText}`
			);
		}

		const data: MarketplaceStoreInterface[] = await response.json();
		return data;
	}
);
