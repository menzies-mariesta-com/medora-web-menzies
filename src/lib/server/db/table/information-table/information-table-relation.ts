import { relations } from 'drizzle-orm';
import {
	hospitalDepartmentTable,
	hospitalTable,
	moduleTable,
	pageTable,
	staffDepartmentTable,
	staffDetailTable,
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
	maritalStatusTable,
	nationalityTable,
	positionTable,
	postalCodeTable,
	specializationTable,
	staffEmploymentTypeTable,
	staffShiftTypeTable,
	staffTypeTable,
	stateTable,
	statusTable,
	titleTable,
} from '../master-table/master-table';
import { userTable } from '../auth-table/auth-table';

// Information table relations (alphabetical)
export const hospitalTableRelations = relations(hospitalTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [hospitalTable.statusId],
		references: [statusTable.id],
	}),
	city: one(cityTable, {
		fields: [hospitalTable.cityId],
		references: [cityTable.id],
	}),
	state: one(stateTable, {
		fields: [hospitalTable.stateId],
		references: [stateTable.id],
	}),
	country: one(countryTable, {
		fields: [hospitalTable.countryId],
		references: [countryTable.id],
	}),
	userGroups: many(userGroupTable),
	hospitalDepartments: many(hospitalDepartmentTable),
	staffHospitals:many(staffHospitalTable),
}));

export const hospitalDepartmentTableRelations = relations(hospitalDepartmentTable, ({ one }) => ({
	hospital: one(hospitalTable, {
		fields: [hospitalDepartmentTable.hospitalId],
		references: [hospitalTable.id],
	}),
	department: one(departmentTable, {
		fields: [hospitalDepartmentTable.departmentId],
		references: [departmentTable.id],
	}),
}));

export const moduleTableRelations = relations(moduleTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [moduleTable.statusId],
		references: [statusTable.id],
	}),
	pages: many(pageTable),
}));

export const pageTableRelations = relations(pageTable, ({ one, many }) => ({
	// Explicitly specify relation fields to avoid ambiguity when resolving
	// relations like "pageTable.module" in Drizzle.
	module: one(moduleTable, {
		fields: [pageTable.moduleId],
		references: [moduleTable.id],
	}),
	status: one(statusTable, {
		fields: [pageTable.statusId],
		references: [statusTable.id],
	}),
	parent: one(pageTable, {
		fields: [pageTable.parentId],
		references: [pageTable.id],
		relationName: 'pageParent',
	}),
	children: many(pageTable, { relationName: 'pageParent' }),
	userGroupPages: many(userGroupPageTable),
}));

export const staffDepartmentTableRelations = relations(staffDepartmentTable, ({ one }) => ({
	staff: one(staffTable, {
		fields: [staffDepartmentTable.staffId],
		references: [staffTable.id],
	}),
	department: one(departmentTable, {
		fields: [staffDepartmentTable.departmentId],
		references: [departmentTable.id],
	}),
}));

export const staffDetailTableRelations = relations(staffDetailTable, ({ one }) => ({
	bloodType: one(bloodTypeTable, {
		fields: [staffDetailTable.bloodTypeId],
		references: [bloodTypeTable.id],
	}),
	staff: one(staffTable),
	status: one(statusTable, {
		fields: [staffDetailTable.statusId],
		references: [statusTable.id],
	}),
}));

export const staffHospitalTableRelations = relations(staffHospitalTable, ({ one }) => ({
	staff: one(staffTable, {
		fields: [staffHospitalTable.staffId],
		references: [staffTable.id],
	}),
	hospital: one(hospitalTable, {
		fields: [staffHospitalTable.hospitalId],
		references: [hospitalTable.id],
	}),
}));

export const staffTableRelations = relations(staffTable, ({ one, many }) => ({
	user: one(userTable, {
		fields: [staffTable.userId],
		references: [userTable.id],
	}),
	identityType: one(identityTypeTable, {
		fields: [staffTable.identityTypeId],
		references: [identityTypeTable.id],
	}),
	maritalStatus: one(maritalStatusTable, {
		fields: [staffTable.maritalStatusId],
		references: [maritalStatusTable.id],
	}),
	gender: one(genderTable, {
		fields: [staffTable.genderId],
		references: [genderTable.id],
	}),
	status: one(statusTable, {
		fields: [staffTable.statusId],
		references: [statusTable.id],
	}),
	city: one(cityTable, {
		fields: [staffTable.cityId],
		references: [cityTable.id],
	}),
	state: one(stateTable, {
		fields: [staffTable.stateId],
		references: [stateTable.id],
	}),
	country: one(countryTable, {
		fields: [staffTable.countryId],
		references: [countryTable.id],
	}),
	title: one(titleTable, {
		fields: [staffTable.titleId],
		references: [titleTable.id],
	}),
	staffEmploymentType: one(staffEmploymentTypeTable, {
		fields: [staffTable.staffEmploymentTypeId],
		references: [staffEmploymentTypeTable.id],
	}),
	staffType: one(staffTypeTable, {
		fields: [staffTable.staffTypeId],
		references: [staffTypeTable.id],
	}),
	nationality: one(nationalityTable, {
		fields: [staffTable.nationalityId],
		references: [nationalityTable.id],
	}),
	position: one(positionTable, {
		fields: [staffTable.positionId],
		references: [positionTable.id],
	}),
	postalCode: one(postalCodeTable, {
		fields: [staffTable.postalCodeId],
		references: [postalCodeTable.id],
	}),
	specialization: one(specializationTable, {
		fields: [staffTable.specializationId],
		references: [specializationTable.id],
	}),
	staffDetail: one(staffDetailTable, {
		fields: [staffTable.staffDetailId],
		references: [staffDetailTable.id],
	}),
	staffHospitals: many(staffHospitalTable),
	staffDepartments: many(staffDepartmentTable),
	staffUserGroups: many(staffUserGroupTable),
}));

export const staffUserGroupTableRelations = relations(staffUserGroupTable, ({ one }) => ({
	staff: one(staffTable, {
		fields: [staffUserGroupTable.staffId],
		references: [staffTable.id],
	}),
	userGroup: one(userGroupTable, {
		fields: [staffUserGroupTable.userGroupId],
		references: [userGroupTable.id],
	}),
}));

export const statusTaggingTableRelations = relations(statusTaggingTable, ({ one }) => ({
	statusTaggingType: one(statusTaggingTypeTable, {
		fields: [statusTaggingTable.statusTaggingTypeId],
		references: [statusTaggingTypeTable.id],
	}),
	status: one(statusTable, {
		fields: [statusTaggingTable.statusId],
		references: [statusTable.id],
	}),
}));

export const statusTaggingTypeTableRelations = relations(statusTaggingTypeTable, ({ one, many }) => ({
	statusTagging: many(statusTaggingTable),
	status: one(statusTable, {
		fields: [statusTaggingTypeTable.statusId],
		references: [statusTable.id],
	}),
}));

export const userGroupPageTableRelations = relations(userGroupPageTable, ({ one }) => ({
	userGroup: one(userGroupTable, {
		fields: [userGroupPageTable.userGroupId],
		references: [userGroupTable.id],
	}),
	page: one(pageTable, {
		fields: [userGroupPageTable.pageId],
		references: [pageTable.id],
	}),
}));

export const userGroupTableRelations = relations(userGroupTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [userGroupTable.statusId],
		references: [statusTable.id],
	}),
	hospital: one(hospitalTable, {
		fields: [userGroupTable.hospitalId],
		references: [hospitalTable.id],
	}),
	staff: many(staffUserGroupTable),
	userGroupPages: many(userGroupPageTable),
	staffUserGroups: many(staffUserGroupTable),
}));
