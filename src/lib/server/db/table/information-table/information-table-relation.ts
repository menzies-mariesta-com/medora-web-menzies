import { relations } from 'drizzle-orm';
import {
	hospitalDepartmentTable,
	hospitalTable,
	moduleTable,
	pageTable,
	roleTable,
	staffDepartmentTable,
	staffHospitalTable,
	staffTable,
	staffUserGroupTable,
	statusTaggingTable,
	statusTaggingTypeTable,
	userGroupPageTable,
	userGroupTable,
} from './information-table';
import {
	bloodTypeTable,
	cityTable,
	countryTable,
	departmentTable,
	genderTable,
	identityTypeTable,
	marialStatusTable,
	specializationTable,
	staffTypeTable,
	stateTable,
	statusTable,
	titleTable,
} from '../master-table/master-table';
import { userTable } from '../auth-table/auth-table';

// Information table relations (alphabetical)
export const hospitalTableRelations = relations(hospitalTable, ({ one, many }) => ({
	status: one(statusTable),
	city: one(cityTable),
	state: one(stateTable),
	country: one(countryTable),
	userGroups: many(userGroupTable),
	hospitalDepartments: many(hospitalDepartmentTable),
	staffHospitals:many(staffHospitalTable),
}));

export const hospitalDepartmentTableRelations = relations(hospitalDepartmentTable, ({ one }) => ({
	hospital: one(hospitalTable),
	department: one(departmentTable),
}));

export const moduleTableRelations = relations(moduleTable, ({ one, many }) => ({
	status: one(statusTable),
	pages: many(pageTable),
}));

export const pageTableRelations = relations(pageTable, ({ one, many }) => ({
	module: one(moduleTable),
	status: one(statusTable),
	parent: one(pageTable, {
		fields: [pageTable.parentId],
		references: [pageTable.id],
		relationName: 'pageParent',
	}),
	children: many(pageTable, { relationName: 'pageParent' }),
	userGroupPages: many(userGroupPageTable),
}));

export const roleTableRelations = relations(roleTable, ({ one }) => ({
	status: one(statusTable),
}));

export const staffDepartmentTableRelations = relations(staffDepartmentTable, ({ one }) => ({
	staff: one(staffTable),
	department: one(departmentTable),
}));

export const staffHospitalTableRelations = relations(staffHospitalTable, ({ one }) => ({
	staff: one(staffTable),
	hospital: one(hospitalTable),
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
	user: one(userTable),
	title: one(titleTable),
	staffType: one(staffTypeTable),
	specialization: one(specializationTable),
	staffHospitals: many(staffHospitalTable),
	staffDepartments: many(staffDepartmentTable),
	staffUserGroups: many(staffUserGroupTable),
}));

export const staffUserGroupTableRelations = relations(staffUserGroupTable, ({ one }) => ({
	staff: one(staffTable),
	userGroup: one(userGroupTable),
}));

export const statusTaggingTableRelations = relations(statusTaggingTable, ({ one }) => ({
	statusTaggingType: one(statusTaggingTypeTable),
	status: one(statusTable),
}));

export const statusTaggingTypeTableRelations = relations(statusTaggingTypeTable, ({ one, many }) => ({
	statusTagging: many(statusTaggingTable),
	status: one(statusTable),
}));

export const userGroupPageTableRelations = relations(userGroupPageTable, ({ one }) => ({
	userGroup: one(userGroupTable),
	page: one(pageTable),
}));

export const userGroupTableRelations = relations(userGroupTable, ({ one, many }) => ({
	status: one(statusTable),
	hospital: one(hospitalTable),
	staff: many(staffUserGroupTable),
	userGroupPages: many(userGroupPageTable),
	staffUserGroups: many(staffUserGroupTable),
}));
