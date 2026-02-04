import { relations } from 'drizzle-orm';
import {
	departmentTable,
	hospitalTable,
	moduleTable,
	pageTable,
	roleTable,
	staffTable,
	statusTaggingTable,
	statusTaggingTypeTable,
	userGroupTable,
} from '../information-table/information-table';
import {
	bloodTypeTable,
	cityTable,
	countryTable,
	craftGroupTable,
	genderTable,
	identityTypeTable,
	marialStatusTable,
	specializationTable,
	stateTable,
	statusTable,
	titleTable,
} from './master-table';

// Master table relations (alphabetical)
export const bloodTypeTableRelations = relations(bloodTypeTable, ({ one, many }) => ({
	staff: many(staffTable),
	status: one(statusTable),
}));

export const cityTableRelations = relations(cityTable, ({ one }) => ({
	status: one(statusTable),
	state: one(stateTable),
}));

export const countryTableRelations = relations(countryTable, ({ one, many }) => ({
	status: one(statusTable),
	states: many(stateTable),
}));

export const craftGroupTableRelations = relations(craftGroupTable, ({ one }) => ({
	status: one(statusTable),
}));

export const genderTableRelations = relations(genderTable, ({ one, many }) => ({
	status: one(statusTable),
	staff: many(staffTable),
}));

export const identityTypeTableRelations = relations(identityTypeTable, ({ many }) => ({
	staff: many(staffTable),
}));

export const marialStatusTableRelations = relations(marialStatusTable, ({ many }) => ({
	staff: many(staffTable),
}));

export const specializationTableRelations = relations(specializationTable, ({ many }) => ({
	staff: many(staffTable),
}));

export const stateTableRelations = relations(stateTable, ({ one, many }) => ({
	status: one(statusTable),
	country: one(countryTable),
	cities: many(cityTable),
}));

export const statusTableRelations = relations(statusTable, ({ many }) => ({
	bloodTypes: many(bloodTypeTable),
	modules: many(moduleTable),
	pages: many(pageTable),
	genders: many(genderTable),
	userGroups: many(userGroupTable),
	roles: many(roleTable),
	hospitals: many(hospitalTable),
	departments: many(departmentTable),
	staff: many(staffTable),
	cities: many(cityTable),
	states: many(stateTable),
	countries: many(countryTable),
	titles: many(titleTable),
	statusTaggings: many(statusTaggingTable),
	statusTaggingTypes: many(statusTaggingTypeTable),
	craftGroups: many(craftGroupTable),
}));

export const titleTableRelations = relations(titleTable, ({ one, many }) => ({
	status: one(statusTable),
	staff: many(staffTable),
}));