/**
 * Read-only master lists for dropdowns (used by `src/routes/api/**` and `+page.server.ts` loaders).
 */
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { activeEntityStatusEq } from '$lib/server/medora/paginated-entity-status-filter.server';

export async function listGender() {
	return ensureDb()
		.select()
		.from(table.genderTable)
		.where(activeEntityStatusEq(table.genderTable.statusId))
		.orderBy(table.genderTable.name);
}

export async function listMaritalStatus() {
	return ensureDb()
		.select()
		.from(table.maritalStatusTable)
		.where(activeEntityStatusEq(table.maritalStatusTable.statusId))
		.orderBy(table.maritalStatusTable.name);
}

export async function listTitle() {
	return ensureDb()
		.select()
		.from(table.titleTable)
		.where(activeEntityStatusEq(table.titleTable.statusId))
		.orderBy(table.titleTable.name);
}

export async function listIdentityType() {
	return ensureDb()
		.select()
		.from(table.identityTypeTable)
		.where(activeEntityStatusEq(table.identityTypeTable.statusId))
		.orderBy(table.identityTypeTable.name);
}

export async function listBloodType() {
	return ensureDb()
		.select()
		.from(table.bloodTypeTable)
		.where(activeEntityStatusEq(table.bloodTypeTable.statusId))
		.orderBy(table.bloodTypeTable.name);
}

export async function listCountry() {
	return ensureDb()
		.select()
		.from(table.countryTable)
		.where(activeEntityStatusEq(table.countryTable.statusId))
		.orderBy(table.countryTable.name);
}

export async function listState() {
	return ensureDb()
		.select()
		.from(table.stateTable)
		.where(activeEntityStatusEq(table.stateTable.statusId))
		.orderBy(table.stateTable.name);
}

export async function listCity() {
	return ensureDb()
		.select()
		.from(table.cityTable)
		.where(activeEntityStatusEq(table.cityTable.statusId))
		.orderBy(table.cityTable.name);
}

export async function listPostalCode() {
	return ensureDb()
		.select()
		.from(table.postalCodeTable)
		.where(activeEntityStatusEq(table.postalCodeTable.statusId))
		.orderBy(table.postalCodeTable.value);
}

export async function listNationality() {
	return ensureDb()
		.select()
		.from(table.nationalityTable)
		.where(activeEntityStatusEq(table.nationalityTable.statusId))
		.orderBy(table.nationalityTable.name);
}

export async function listReligion() {
	return ensureDb()
		.select()
		.from(table.religionTable)
		.where(activeEntityStatusEq(table.religionTable.statusId))
		.orderBy(table.religionTable.name);
}

export async function listSeverity() {
	return ensureDb()
		.select()
		.from(table.severityTable)
		.where(activeEntityStatusEq(table.severityTable.statusId))
		.orderBy(table.severityTable.name);
}
