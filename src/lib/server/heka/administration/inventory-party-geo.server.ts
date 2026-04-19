import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import { and, eq, ne } from 'drizzle-orm';

/**
 * Validates optional geography / phone-country FKs for manufacturer or supplier rows.
 */
export async function assertInventoryPartyGeo(input: {
	countryId?: number | null;
	stateId?: number | null;
	cityId?: number | null;
	postalCodeId?: number | null;
	phoneCountryId?: number | null;
}): Promise<void> {
	if (input.phoneCountryId != null && Number.isFinite(input.phoneCountryId)) {
		const [c] = await ensureDb()
			.select({ id: table.countryTable.id })
			.from(table.countryTable)
			.where(
				and(
					eq(table.countryTable.id, input.phoneCountryId),
					ne(table.countryTable.statusId, StatusEnum.DELETED)
				)
			);
		if (!c) throw new Error('Invalid phone country.');
	}

	if (input.countryId != null && Number.isFinite(input.countryId)) {
		const [c] = await ensureDb()
			.select({ id: table.countryTable.id })
			.from(table.countryTable)
			.where(
				and(
					eq(table.countryTable.id, input.countryId),
					ne(table.countryTable.statusId, StatusEnum.DELETED)
				)
			);
		if (!c) throw new Error('Invalid country.');
	}

	if (input.stateId != null && Number.isFinite(input.stateId)) {
		const [s] = await ensureDb()
			.select({
				id: table.stateTable.id,
				countryId: table.stateTable.countryId
			})
			.from(table.stateTable)
			.where(
				and(
					eq(table.stateTable.id, input.stateId),
					ne(table.stateTable.statusId, StatusEnum.DELETED)
				)
			);
		if (!s) throw new Error('Invalid state.');
		if (
			input.countryId != null &&
			Number.isFinite(input.countryId) &&
			s.countryId !== input.countryId
		) {
			throw new Error('State does not belong to the selected country.');
		}
	}

	if (input.cityId != null && Number.isFinite(input.cityId)) {
		const [ct] = await ensureDb()
			.select({
				id: table.cityTable.id,
				stateId: table.cityTable.stateId
			})
			.from(table.cityTable)
			.where(
				and(
					eq(table.cityTable.id, input.cityId),
					ne(table.cityTable.statusId, StatusEnum.DELETED)
				)
			);
		if (!ct) throw new Error('Invalid city.');
		if (
			input.stateId != null &&
			Number.isFinite(input.stateId) &&
			ct.stateId !== input.stateId
		) {
			throw new Error('City does not belong to the selected state.');
		}
	}

	if (input.postalCodeId != null && Number.isFinite(input.postalCodeId)) {
		const [pc] = await ensureDb()
			.select({
				id: table.postalCodeTable.id,
				cityId: table.postalCodeTable.cityId
			})
			.from(table.postalCodeTable)
			.where(
				and(
					eq(table.postalCodeTable.id, input.postalCodeId),
					ne(table.postalCodeTable.statusId, StatusEnum.DELETED)
				)
			);
		if (!pc) throw new Error('Invalid postal code.');
		if (
			input.cityId != null &&
			Number.isFinite(input.cityId) &&
			pc.cityId !== input.cityId
		) {
			throw new Error('Postal code does not belong to the selected city.');
		}
	}
}
