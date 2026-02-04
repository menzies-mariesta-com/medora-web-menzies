import { relations } from 'drizzle-orm';
import {
	hospitalDepartmentTable,
	hospitalTable,
	moduleTable,
	pageTable,
	roleTable,
	staffDepartmentTable,
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
	departmentTable,
	genderTable,
	identityTypeTable,
	marialStatusTable,
	specializationTable,
	stateTable,
	staffTypeTable,
	statusTable,
	titleTable,
} from './master-table';

// Master table relations (alphabetical)
export const bloodTypeTableRelations = relations(bloodTypeTable, ({ one, many }) => ({
	staffs: many(staffTable),
	status: one(statusTable),
}));

export const cityTableRelations = relations(cityTable, ({ one, many }) => ({
	status: one(statusTable),
	state: one(stateTable),
	staffs: many(staffTable),
}));

export const countryTableRelations = relations(countryTable, ({ one, many }) => ({
	status: one(statusTable),
	states: many(stateTable),
	staffs: many(staffTable),
}));

export const craftGroupTableRelations = relations(craftGroupTable, ({ one, many }) => ({
	status: one(statusTable),
	specializations: many(specializationTable),
}));

export const departmentTableRelations = relations(departmentTable, ({ one, many }) => ({
	status: one(statusTable),
	staffDepartments: many(staffDepartmentTable),
	hospitalDepartments: many(hospitalDepartmentTable),
}));

export const genderTableRelations = relations(genderTable, ({ one, many }) => ({
	status: one(statusTable),
	staffs: many(staffTable),
}));

export const identityTypeTableRelations = relations(identityTypeTable, ({ many }) => ({
	staffs: many(staffTable),
}));

export const marialStatusTableRelations = relations(marialStatusTable, ({ many }) => ({
	staffs: many(staffTable),
}));

export const specializationTableRelations = relations(specializationTable, ({ one, many }) => ({
	craftGroup: one(craftGroupTable),
	staffs: many(staffTable),
}));

export const stateTableRelations = relations(stateTable, ({ one, many }) => ({
	status: one(statusTable),
	country: one(countryTable),
	cities: many(cityTable),
	staffs: many(staffTable),
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
	staffs: many(staffTable),
	staffTypes: many(staffTypeTable),
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
	staffs: many(staffTable),
}));

export const staffTypeTableRelations = relations(staffTypeTable, ({ one, many }) => ({
	status: one(statusTable),
	staffs: many(staffTable),
}));