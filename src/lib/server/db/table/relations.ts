import { relations } from 'drizzle-orm';
import {
	departmentTable,
	hospitalTable,
	moduleTable,
	pageTable,
	roleTable,
	staffDepartmentTable,
	staffHospitalTable,
	staffRoleTable,
	staffTable,
	staffUserGroupTable,
	userGroupModuleTable,
	userGroupPageTable,
	userGroupTable,
} from './information-tables';
import {
	bloodTypeTable,
	cityTable,
	countryTable,
	genderTable,
	identityTypeTable,
	marialStatusTable,
	specializationTable,
	stateTable,
	statusTable,
} from './master-tables';
//Comments
//Staff
// Relations (alphabetical)
export const bloodTypeTableRelations = relations(bloodTypeTable, ({ one, many }) => ({
	staff: many(staffTable),
	status: one(statusTable),
}));

export const cityTableRelations = relations(cityTable, ({ one, many }) => ({
	status: one(statusTable),
	state: one(stateTable),
}));

export const countryTableRelations = relations(countryTable, ({ one, many }) => ({
	status: one(statusTable),
	states: many(stateTable),
}));

export const departmentTableRelations = relations(departmentTable, ({ one, many }) => ({
	hospital: one(hospitalTable),
	status: one(statusTable),
	staff: many(staffDepartmentTable),
}));

export const genderTableRelations = relations(genderTable, ({ one, many }) => ({
	status: one(statusTable),
	staff: many(staffTable),
}));

export const hospitalTableRelations = relations(hospitalTable, ({ one, many }) => ({
	status: one(statusTable),
	departments: many(departmentTable),
	staff: many(staffHospitalTable),
}));

export const identityTypeTableRelations = relations(identityTypeTable, ({ many }) => ({
	staff: many(staffTable),
}));

export const marialStatusTableRelations = relations(marialStatusTable, ({ many }) => ({
	staff: many(staffTable),
}));

export const moduleTableRelations = relations(moduleTable, ({ one, many }) => ({
	status: one(statusTable),
	pages: many(pageTable),
	userGroupModules: many(userGroupModuleTable),
}));

export const pageTableRelations = relations(pageTable, ({ one, many }) => ({
	module: one(moduleTable),
	status: one(statusTable),
	userGroupPages: many(userGroupPageTable),
}));

export const roleTableRelations = relations(roleTable, ({ one, many }) => ({
	status: one(statusTable),
	staff: many(staffTable),
	staffRoles: many(staffRoleTable),
}));

export const staffDepartmentTableRelations = relations(staffDepartmentTable, ({ one }) => ({
	staff: one(staffTable),
	department: one(departmentTable),
}));

export const staffHospitalTableRelations = relations(staffHospitalTable, ({ one }) => ({
	staff: one(staffTable),
	hospital: one(hospitalTable),
}));

export const staffRoleTableRelations = relations(staffRoleTable, ({ one }) => ({
	staff: one(staffTable),
	role: one(roleTable),
}));

export const staffTableRelations = relations(staffTable, ({ one, many }) => ({
	bloodType: one(bloodTypeTable),
	identityType: one(identityTypeTable),
	maritalStatus: one(marialStatusTable),
	gender: one(genderTable),
	role: one(roleTable),
	status: one(statusTable),
	hospitals: many(staffHospitalTable),
	departments: many(staffDepartmentTable),
	userGroups: many(staffUserGroupTable),
	roles: many(staffRoleTable),
	specialization: one(specializationTable),
}));

export const staffUserGroupTableRelations = relations(staffUserGroupTable, ({ one }) => ({
	staff: one(staffTable),
	userGroup: one(userGroupTable),
}));

export const statusTableRelations = relations(statusTable, ({ many }) => ({
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
}));

export const specializationTableRelations = relations(specializationTable, ({ one, many}) => ({
	staff: many(staffTable),
}));

export const stateTableRelations = relations(stateTable, ({ one, many }) => ({
	status: one(statusTable),
	country: one(countryTable),
	cities: many(cityTable),
}));

export const userGroupModuleTableRelations = relations(userGroupModuleTable, ({ one }) => ({
	userGroup: one(userGroupTable),
	module: one(moduleTable),
}));

export const userGroupPageTableRelations = relations(userGroupPageTable, ({ one }) => ({
	userGroup: one(userGroupTable),
	page: one(pageTable),
}));

export const userGroupTableRelations = relations(userGroupTable, ({ one, many }) => ({
	status: one(statusTable),
	modules: many(userGroupModuleTable),
	pages: many(userGroupPageTable),
	staff: many(staffUserGroupTable),
}));
