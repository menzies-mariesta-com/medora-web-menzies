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
} from '../master-table/master-tables';

// Information table relations (alphabetical)
export const departmentTableRelations = relations(departmentTable, ({ one, many }) => ({
	hospital: one(hospitalTable),
	status: one(statusTable),
	staff: many(staffDepartmentTable),
}));

export const hospitalTableRelations = relations(hospitalTable, ({ one, many }) => ({
	status: one(statusTable),
	city: one(cityTable),
	state: one(stateTable),
	country: one(countryTable),
	departments: many(departmentTable),
	staff: many(staffHospitalTable),
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
	status: one(statusTable),
	city: one(cityTable),
	state: one(stateTable),
	country: one(countryTable),
	role: one(roleTable),
	specialization: one(specializationTable),
	hospitals: many(staffHospitalTable),
	departments: many(staffDepartmentTable),
	userGroups: many(staffUserGroupTable),
	roles: many(staffRoleTable),
}));

export const staffUserGroupTableRelations = relations(staffUserGroupTable, ({ one }) => ({
	staff: one(staffTable),
	userGroup: one(userGroupTable),
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
