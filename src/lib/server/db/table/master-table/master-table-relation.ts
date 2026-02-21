import { relations } from 'drizzle-orm';
import {
	appointmentTable,
	doctorScheduleTable,
	externalReferTable,
	hospitalDepartmentTable,
	hospitalTable,
	moduleTable,
	pageTable,
	patientTable,
	staffDepartmentTable,
	staffDetailTable,
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
	maritalStatusTable,
	nationalityTable,
	positionTable,
	postalCodeTable,
	referTypeTable,
	religionTable,
	specializationTable,
	staffEmploymentTypeTable,
	staffShiftTypeTable,
	staffTypeTable,
	stateTable,
	statusTable,
	titleTable,
	weekdayTable,
} from './master-table';

// Master table relations (alphabetical)
export const bloodTypeTableRelations = relations(bloodTypeTable, ({ one, many }) => ({
	staffs: many(staffTable),
	patients: many(patientTable),
	status: one(statusTable, {
		fields: [bloodTypeTable.statusId],
		references: [statusTable.id],
	}),
}));

export const cityTableRelations = relations(cityTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [cityTable.statusId],
		references: [statusTable.id],
	}),
	state: one(stateTable, {
		fields: [cityTable.stateId],
		references: [stateTable.id],
	}),
	postalCodes: many(postalCodeTable),
	staffs: many(staffTable),
	patients: many(patientTable),
}));

export const countryTableRelations = relations(countryTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [countryTable.statusId],
		references: [statusTable.id],
	}),
	states: many(stateTable),
	staffs: many(staffTable),
	patients: many(patientTable),
}));

export const craftGroupTableRelations = relations(craftGroupTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [craftGroupTable.statusId],
		references: [statusTable.id],
	}),
	specializations: many(specializationTable),
}));

export const departmentTableRelations = relations(departmentTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [departmentTable.statusId],
		references: [statusTable.id],
	}),
	staffDepartments: many(staffDepartmentTable),
	hospitalDepartments: many(hospitalDepartmentTable),
	staffs: many(staffTable),
}));

export const genderTableRelations = relations(genderTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [genderTable.statusId],
		references: [statusTable.id],
	}),
	staffs: many(staffTable),
	patients: many(patientTable),
}));

export const identityTypeTableRelations = relations(identityTypeTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [identityTypeTable.statusId],
		references: [statusTable.id],
	}),
	staffs: many(staffTable),
	patients: many(patientTable),
}));

export const maritalStatusTableRelations = relations(maritalStatusTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [maritalStatusTable.statusId],
		references: [statusTable.id],
	}),
	staffs: many(staffTable),
	patients: many(patientTable),
}));

export const specializationTableRelations = relations(specializationTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [specializationTable.statusId],
		references: [statusTable.id],
	}),
	craftGroup: one(craftGroupTable, {
		fields: [specializationTable.craftGroupId],
		references: [craftGroupTable.id],
	}),
	staffs: many(staffTable),
}));

export const stateTableRelations = relations(stateTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [stateTable.statusId],
		references: [statusTable.id],
	}),
	country: one(countryTable, {
		fields: [stateTable.countryId],
		references: [countryTable.id],
	}),
	cities: many(cityTable),
	staffs: many(staffTable),
	patients: many(patientTable),
}));

export const statusTableRelations = relations(statusTable, ({ many }) => ({
	bloodTypes: many(bloodTypeTable),
	modules: many(moduleTable),
	pages: many(pageTable),
	genders: many(genderTable),
	userGroups: many(userGroupTable),
	hospitals: many(hospitalTable),
	departments: many(departmentTable),
	staffs: many(staffTable),
	staffEmploymentTypes: many(staffEmploymentTypeTable),
	staffShiftTypes: many(staffShiftTypeTable),
	nationalities: many(nationalityTable),
	referTypes: many(referTypeTable),
	religions: many(religionTable),
	positions: many(positionTable),
	cities: many(cityTable),
	states: many(stateTable),
	countries: many(countryTable),
	titles: many(titleTable),
	statusTaggings: many(statusTaggingTable),
	statusTaggingTypes: many(statusTaggingTypeTable),
	craftGroups: many(craftGroupTable),
	staffDetails: many(staffDetailTable),
	patients: many(patientTable),
}));

export const titleTableRelations = relations(titleTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [titleTable.statusId],
		references: [statusTable.id],
	}),
	staffs: many(staffTable),
	patients: many(patientTable),
}));

export const staffEmploymentTypeTableRelations = relations(staffEmploymentTypeTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [staffEmploymentTypeTable.statusId],
		references: [statusTable.id],
	}),
	staffs: many(staffTable),
}));

export const staffTypeTableRelations = relations(staffTypeTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [staffTypeTable.statusId],
		references: [statusTable.id],
	}),
	staffs: many(staffTable),
}));

export const staffShiftTypeTableRelations = relations(staffShiftTypeTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [staffShiftTypeTable.statusId],
		references: [statusTable.id],
	}),
	staffs: many(staffTable),
}));

export const postalCodeTableRelations = relations(postalCodeTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [postalCodeTable.statusId],
		references: [statusTable.id],
	}),
	city: one(cityTable, {
		fields: [postalCodeTable.cityId],
		references: [cityTable.id],
	}),
	staffs: many(staffTable),
	patients: many(patientTable),
	hospitals: many(hospitalTable),
}));

export const nationalityTableRelations = relations(nationalityTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [nationalityTable.statusId],
		references: [statusTable.id],
	}),
	staffs: many(staffTable),
	patients: many(patientTable),
}));

export const referTypeTableRelations = relations(referTypeTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [referTypeTable.statusId],
		references: [statusTable.id],
	}),
	externalRefers: many(externalReferTable),
	appointments: many(appointmentTable),
}));

export const religionTableRelations = relations(religionTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [religionTable.statusId],
		references: [statusTable.id],
	}),
	staffs: many(staffTable),
	patients: many(patientTable),
}));

export const positionTableRelations = relations(positionTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [positionTable.statusId],
		references: [statusTable.id],
	}),
	staffs: many(staffTable),
}));

export const weekdayTableRelations = relations(weekdayTable, ({ one, many }) => ({
	status: one(statusTable, {
		fields: [weekdayTable.statusId],
		references: [statusTable.id],
	}),
	doctorSchedules: many(doctorScheduleTable),
}));