import { query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { MarketplaceStoreInterface } from '$lib/model/interface/third-party-api/marketplace/marketplace-store.interface';
import { StatusEnum } from '$lib/model/enum/db-link';

export const getStore = query(
	async (): Promise<MarketplaceStoreInterface[]> => {
		const [apps, archives] = await Promise.all([
			ensureDb()
				.select()
				.from(table.marketplaceAppTable)
				.orderBy(table.marketplaceAppTable.name),
			ensureDb()
				.select()
				.from(table.marketplaceAppArchiveTable)
				.orderBy(table.marketplaceAppArchiveTable.createdAt)
		]);

		return apps
			.filter((app: any) => app.statusId === StatusEnum.ACTIVE)
			.map((app: any) => {
				const appArchives = archives.filter(
					(archive: any) =>
						archive.appId === app.id &&
						archive.statusId === StatusEnum.ACTIVE
				);
				const latestArchive = appArchives[appArchives.length - 1];
				return {
					id: String(app.id),
					packageId: app.code,
					name: app.name,
					description: '',
					iconUrl: '',
					homepageUrl: latestArchive?.downloadUrl ?? '',
					createdAt: app.createdAt ?? '',
					updatedAt: app.updatedAt ?? ''
				};
			});
	}
);
