import { and, eq } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export type DocumentLayoutPresetKey = 'a4_plain' | 'label_100x60' | 'a5_plain';

const PRESETS: Record<
	DocumentLayoutPresetKey,
	Omit<typeof table.hospitalDocumentSettingsTable.$inferInsert, 'hospitalId' | 'name'>
> = {
	a4_plain: {
		marginTop: 10,
		marginBottom: 10,
		marginLeft: 10,
		marginRight: 10,
		paddingTop: 5,
		paddingBottom: 5,
		paddingLeft: 5,
		paddingRight: 5,
		pageSize: 'A4',
		pageOrientation: 'portrait',
		showHeader: false,
		showFooter: false,
		headerHtml: '',
		footerHtml: '',
		statusId: StatusEnum.ACTIVE
	},
	label_100x60: {
		marginTop: 4,
		marginBottom: 4,
		marginLeft: 4,
		marginRight: 4,
		paddingTop: 2,
		paddingBottom: 2,
		paddingLeft: 2,
		paddingRight: 2,
		pageSize: '100mm 60mm',
		pageOrientation: 'portrait',
		showHeader: false,
		showFooter: false,
		headerHtml: '',
		footerHtml: '',
		statusId: StatusEnum.ACTIVE
	},
	a5_plain: {
		marginTop: 8,
		marginBottom: 8,
		marginLeft: 8,
		marginRight: 8,
		paddingTop: 4,
		paddingBottom: 4,
		paddingLeft: 4,
		paddingRight: 4,
		pageSize: 'A5',
		pageOrientation: 'portrait',
		showHeader: false,
		showFooter: false,
		headerHtml: '',
		footerHtml: '',
		statusId: StatusEnum.ACTIVE
	}
};

/** Maps legacy defaultDocumentSettingId from catalog defs to layout presets. */
export function layoutPresetForLegacySettingId(
	legacySettingId?: number | null
): DocumentLayoutPresetKey {
	if (legacySettingId === 7) return 'label_100x60';
	if (legacySettingId === 9) return 'a5_plain';
	return 'a4_plain';
}

/** Idempotent per-hospital layout row (by name). */
export async function ensureHospitalDocumentLayoutPreset(
	hospitalId: string,
	preset: DocumentLayoutPresetKey
): Promise<number> {
	const name = `__preset_${preset}`;
	const [existing] = await ensureDb()
		.select({ id: table.hospitalDocumentSettingsTable.id })
		.from(table.hospitalDocumentSettingsTable)
		.where(
			and(
				eq(table.hospitalDocumentSettingsTable.hospitalId, hospitalId),
				eq(table.hospitalDocumentSettingsTable.name, name)
			)
		)
		.limit(1);
	if (existing) return existing.id;

	const [row] = await ensureDb()
		.insert(table.hospitalDocumentSettingsTable)
		.values({
			...PRESETS[preset],
			name,
			hospitalId
		})
		.returning({ id: table.hospitalDocumentSettingsTable.id });
	if (!row) throw new Error('Failed to create document layout preset');
	return row.id;
}
