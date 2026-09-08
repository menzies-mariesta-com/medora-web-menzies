/**
 * Read-only master lists for dropdowns (used by `src/routes/api/**` and `+page.server.ts` loaders).
 */
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ne } from 'drizzle-orm';

export async function listGender() {
	return ensureDb()
		.select()
		.from(table.genderTable)
		.where(ne(table.genderTable.statusId, StatusEnum.DELETED))
		.orderBy(table.genderTable.name);
}

export async function listMaritalStatus() {
	return ensureDb()
		.select()
		.from(table.maritalStatusTable)
		.where(ne(table.maritalStatusTable.statusId, StatusEnum.DELETED))
		.orderBy(table.maritalStatusTable.name);
}

export async function listTitle() {
	return ensureDb()
		.select()
		.from(table.titleTable)
		.where(ne(table.titleTable.statusId, StatusEnum.DELETED))
		.orderBy(table.titleTable.name);
}

export async function listIdentityType() {
	return ensureDb()
		.select()
		.from(table.identityTypeTable)
		.where(ne(table.identityTypeTable.statusId, StatusEnum.DELETED))
		.orderBy(table.identityTypeTable.name);
}

export async function listBloodType() {
	return ensureDb()
		.select()
		.from(table.bloodTypeTable)
		.where(ne(table.bloodTypeTable.statusId, StatusEnum.DELETED))
		.orderBy(table.bloodTypeTable.name);
}

export async function listCountry() {
	return ensureDb()
		.select()
		.from(table.countryTable)
		.where(ne(table.countryTable.statusId, StatusEnum.DELETED))
		.orderBy(table.countryTable.name);
}

export async function listState() {
	return ensureDb()
		.select()
		.from(table.stateTable)
		.where(ne(table.stateTable.statusId, StatusEnum.DELETED))
		.orderBy(table.stateTable.name);
}

export async function listCity() {
	return ensureDb()
		.select()
		.from(table.cityTable)
		.where(ne(table.cityTable.statusId, StatusEnum.DELETED))
		.orderBy(table.cityTable.name);
}

export async function listPostalCode() {
	return ensureDb()
		.select()
		.from(table.postalCodeTable)
		.where(ne(table.postalCodeTable.statusId, StatusEnum.DELETED))
		.orderBy(table.postalCodeTable.value);
}

export async function listNationality() {
	return ensureDb()
		.select()
		.from(table.nationalityTable)
		.where(ne(table.nationalityTable.statusId, StatusEnum.DELETED))
		.orderBy(table.nationalityTable.name);
}

export async function listReligion() {
	return ensureDb()
		.select()
		.from(table.religionTable)
		.where(ne(table.religionTable.statusId, StatusEnum.DELETED))
		.orderBy(table.religionTable.name);
}

export async function listSeverity() {
	return ensureDb()
		.select()
		.from(table.severityTable)
		.where(ne(table.severityTable.statusId, StatusEnum.DELETED))
		.orderBy(table.severityTable.name);
}
