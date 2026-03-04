import { relations } from 'drizzle-orm';
import {
	appointmentTable,
	categoryTable,
	doctorScheduleTable,
	externalReferTable,
	appointmentBlockTable,
	hospitalBranchTable,
	hospitalDepartmentTable,
	hospitalPatientCodeCounterTable,
	hospitalTable,
	moduleTable,
	pageTable,
	patientAllergyTable,
	patientAttachmentTable,
	patientDiagnosisTable,
	patientInsurance,
	patientTable,
	patientVisitTable,
	insuranceTable,
	staffDepartmentTable,
	serviceItemTable,
	serviceTaggingTable,
	storeTable,
	staffDetailTable,
	subCategoryTable,
	staffBranchTable,
	staffHospitalTable,
	staffTable,
	staffUserGroupTable,
	statusTaggingTable,
	statusTaggingTypeTable,
	userGroupPageTable,
	userGroupTable
} from './information-table';
import {
	cityTable,
	countryTable,
	departmentTable,
	genderTable,
	identityTypeTable,
	maritalStatusTable,
	nationalityTable,
	positionTable,
	postalCodeTable,
	referTypeTable,
	specializationTable,
	staffEmploymentTypeTable,
	bloodTypeTable,
	staffShiftTypeTable,
	staffTypeTable,
	stateTable,
	statusTable,
	titleTable,
	religionTable,
	unitTable,
	visitTypeTable,
	weekdayTable,
	allergyMasterTable
} from '../master-table/master-table';
import { userTable } from '../auth-table/auth-table';

// Information table relations (alphabetical)
export const hospitalTableRelations = relations(
	hospitalTable,
	({ one, many }) => ({
		branches: many(hospitalBranchTable),
		owner: one(userTable, {
			fields: [hospitalTable.ownerId],
			references: [userTable.id]
		}),
		status: one(statusTable, {
			fields: [hospitalTable.statusId],
			references: [statusTable.id]
		}),
		city: one(cityTable, {
			fields: [hospitalTable.cityId],
			references: [cityTable.id]
		}),
		state: one(stateTable, {
			fields: [hospitalTable.stateId],
			references: [stateTable.id]
		}),
		country: one(countryTable, {
			fields: [hospitalTable.countryId],
			references: [countryTable.id]
		}),
		phoneCountry: one(countryTable, {
			fields: [hospitalTable.phoneCountryId],
			references: [countryTable.id]
		}),
		postalCode: one(postalCodeTable, {
			fields: [hospitalTable.postalCodeId],
			references: [postalCodeTable.id]
		}),
		userGroups: many(userGroupTable),
		hospitalDepartments: many(hospitalDepartmentTable),
		patientCodeCounter: one(hospitalPatientCodeCounterTable),
		staffHospitals: many(staffHospitalTable),
		patients: many(patientTable),
		appointments: many(appointmentTable),
		doctorSchedules: many(doctorScheduleTable),
		externalRefers: many(externalReferTable),
		appointmentBlocks: many(appointmentBlockTable),
		categories: many(categoryTable),
		serviceItems: many(serviceItemTable)
	})
);

export const hospitalBranchTableRelations = relations(
	hospitalBranchTable,
	({ one, many }) => ({
		hospital: one(hospitalTable, {
			fields: [hospitalBranchTable.hospitalId],
			references: [hospitalTable.id]
		}),
		status: one(statusTable, {
			fields: [hospitalBranchTable.statusId],
			references: [statusTable.id]
		}),
		city: one(cityTable, {
			fields: [hospitalBranchTable.cityId],
			references: [cityTable.id]
		}),
		state: one(stateTable, {
			fields: [hospitalBranchTable.stateId],
			references: [stateTable.id]
		}),
		country: one(countryTable, {
			fields: [hospitalBranchTable.countryId],
			references: [countryTable.id]
		}),
		phoneCountry: one(countryTable, {
			fields: [hospitalBranchTable.phoneCountryId],
			references: [countryTable.id]
		}),
		postalCode: one(postalCodeTable, {
			fields: [hospitalBranchTable.postalCodeId],
			references: [postalCodeTable.id]
		}),
		appointments: many(appointmentTable),
		doctorSchedules: many(doctorScheduleTable),
		staffBranches: many(staffBranchTable),
		categories: many(categoryTable),
		stores: many(storeTable),
		serviceTaggings: many(serviceTaggingTable)
	})
);

export const hospitalPatientCodeCounterTableRelations = relations(
	hospitalPatientCodeCounterTable,
	({ one }) => ({
		hospital: one(hospitalTable, {
			fields: [hospitalPatientCodeCounterTable.hospitalId],
			references: [hospitalTable.id]
		})
	})
);

export const hospitalDepartmentTableRelations = relations(
	hospitalDepartmentTable,
	({ one }) => ({
		hospital: one(hospitalTable, {
			fields: [hospitalDepartmentTable.hospitalId],
			references: [hospitalTable.id]
		}),
		department: one(departmentTable, {
			fields: [hospitalDepartmentTable.departmentId],
			references: [departmentTable.id]
		})
	})
);

export const moduleTableRelations = relations(
	moduleTable,
	({ one, many }) => ({
		status: one(statusTable, {
			fields: [moduleTable.statusId],
			references: [statusTable.id]
		}),
		pages: many(pageTable)
	})
);

export const pageTableRelations = relations(
	pageTable,
	({ one, many }) => ({
		// Explicitly specify relation fields to avoid ambiguity when resolving
		// relations like "pageTable.module" in Drizzle.
		module: one(moduleTable, {
			fields: [pageTable.moduleId],
			references: [moduleTable.id]
		}),
		status: one(statusTable, {
			fields: [pageTable.statusId],
			references: [statusTable.id]
		}),
		parent: one(pageTable, {
			fields: [pageTable.parentId],
			references: [pageTable.id],
			relationName: 'pageParent'
		}),
		children: many(pageTable, { relationName: 'pageParent' }),
		userGroupPages: many(userGroupPageTable)
	})
);

export const staffDepartmentTableRelations = relations(
	staffDepartmentTable,
	({ one }) => ({
		staff: one(staffTable, {
			fields: [staffDepartmentTable.staffId],
			references: [staffTable.id]
		}),
		department: one(departmentTable, {
			fields: [staffDepartmentTable.departmentId],
			references: [departmentTable.id]
		})
	})
);

export const staffDetailTableRelations = relations(
	staffDetailTable,
	({ one }) => ({
		bloodType: one(bloodTypeTable, {
			fields: [staffDetailTable.bloodTypeId],
			references: [bloodTypeTable.id]
		}),
		staff: one(staffTable),
		status: one(statusTable, {
			fields: [staffDetailTable.statusId],
			references: [statusTable.id]
		})
	})
);

export const doctorScheduleTableRelations = relations(
	doctorScheduleTable,
	({ one }) => ({
		doctor: one(staffTable, {
			fields: [doctorScheduleTable.staffId],
			references: [staffTable.id]
		}),
		hospital: one(hospitalTable, {
			fields: [doctorScheduleTable.hospitalId],
			references: [hospitalTable.id]
		}),
		branch: one(hospitalBranchTable, {
			fields: [doctorScheduleTable.branchId],
			references: [hospitalBranchTable.id]
		}),
		weekday: one(weekdayTable, {
			fields: [doctorScheduleTable.weekdayId],
			references: [weekdayTable.id]
		}),
		status: one(statusTable, {
			fields: [doctorScheduleTable.statusId],
			references: [statusTable.id]
		})
	})
);

export const externalReferTableRelations = relations(
	externalReferTable,
	({ one, many }) => ({
		referType: one(referTypeTable, {
			fields: [externalReferTable.referTypeId],
			references: [referTypeTable.id]
		}),
		hospital: one(hospitalTable, {
			fields: [externalReferTable.hospitalId],
			references: [hospitalTable.id]
		}),
		title: one(titleTable, {
			fields: [externalReferTable.titleId],
			references: [titleTable.id]
		}),
		country: one(countryTable, {
			fields: [externalReferTable.countryId],
			references: [countryTable.id]
		}),
		phoneCountry: one(countryTable, {
			fields: [externalReferTable.phoneCountryId],
			references: [countryTable.id]
		}),
		state: one(stateTable, {
			fields: [externalReferTable.stateId],
			references: [stateTable.id]
		}),
		city: one(cityTable, {
			fields: [externalReferTable.cityId],
			references: [cityTable.id]
		}),
		postalCode: one(postalCodeTable, {
			fields: [externalReferTable.postalCodeId],
			references: [postalCodeTable.id]
		}),
		status: one(statusTable, {
			fields: [externalReferTable.statusId],
			references: [statusTable.id]
		}),
		appointments: many(appointmentTable)
	})
);

export const appointmentTableRelations = relations(
	appointmentTable,
	({ one }) => ({
		hospital: one(hospitalTable, {
			fields: [appointmentTable.hospitalId],
			references: [hospitalTable.id]
		}),
		branch: one(hospitalBranchTable, {
			fields: [appointmentTable.branchId],
			references: [hospitalBranchTable.id]
		}),
		patient: one(patientTable, {
			fields: [appointmentTable.patientId],
			references: [patientTable.id]
		}),
		staff: one(staffTable, {
			fields: [appointmentTable.staffId],
			references: [staffTable.id]
		}),
		patientTitle: one(titleTable, {
			fields: [appointmentTable.patientTitleId],
			references: [titleTable.id]
		}),
		referType: one(referTypeTable, {
			fields: [appointmentTable.referTypeId],
			references: [referTypeTable.id]
		}),
		externalRefer: one(externalReferTable, {
			fields: [appointmentTable.externalReferId],
			references: [externalReferTable.id]
		}),
		statusTagging: one(statusTaggingTable, {
			fields: [appointmentTable.statusTaggingId],
			references: [statusTaggingTable.id]
		}),
		status: one(statusTable, {
			fields: [appointmentTable.statusId],
			references: [statusTable.id]
		})
	})
);

export const appointmentBlockTableRelations = relations(
	appointmentBlockTable,
	({ one }) => ({
		staff: one(staffTable, {
			fields: [appointmentBlockTable.staffId],
			references: [staffTable.id]
		}),
		hospital: one(hospitalTable, {
			fields: [appointmentBlockTable.hospitalId],
			references: [hospitalTable.id]
		}),
		status: one(statusTable, {
			fields: [appointmentBlockTable.statusId],
			references: [statusTable.id]
		})
	})
);

export const patientVisitTableRelations = relations(
	patientVisitTable,
	({ one, many }) => ({
		patient: one(patientTable, {
			fields: [patientVisitTable.patientId],
			references: [patientTable.id]
		}),
		hospital: one(hospitalTable, {
			fields: [patientVisitTable.hospitalId],
			references: [hospitalTable.id]
		}),
		branch: one(hospitalBranchTable, {
			fields: [patientVisitTable.branchId],
			references: [hospitalBranchTable.id]
		}),
		appointment: one(appointmentTable, {
			fields: [patientVisitTable.appointmentId],
			references: [appointmentTable.id]
		}),
		doctor: one(staffTable, {
			fields: [patientVisitTable.doctorId],
			references: [staffTable.id]
		}),
		visitType: one(visitTypeTable, {
			fields: [patientVisitTable.visitTypeId],
			references: [visitTypeTable.id]
		}),
		status: one(statusTable, {
			fields: [patientVisitTable.statusId],
			references: [statusTable.id]
		}),
		diagnoses: many(patientDiagnosisTable)
	})
);

export const patientDiagnosisTableRelations = relations(
	patientDiagnosisTable,
	({ one }) => ({
		patient: one(patientTable, {
			fields: [patientDiagnosisTable.patientId],
			references: [patientTable.id]
		}),
		hospital: one(hospitalTable, {
			fields: [patientDiagnosisTable.hospitalId],
			references: [hospitalTable.id]
		}),
		visit: one(patientVisitTable, {
			fields: [patientDiagnosisTable.visitId],
			references: [patientVisitTable.id]
		}),
		status: one(statusTable, {
			fields: [patientDiagnosisTable.statusId],
			references: [statusTable.id]
		}),
		heightUnit: one(unitTable, {
			fields: [patientDiagnosisTable.heightUnitId],
			references: [unitTable.id]
		}),
		weightUnit: one(unitTable, {
			fields: [patientDiagnosisTable.weightUnitId],
			references: [unitTable.id]
		}),
		bpUnit: one(unitTable, {
			fields: [patientDiagnosisTable.bpUnitId],
			references: [unitTable.id]
		}),
		pulseUnit: one(unitTable, {
			fields: [patientDiagnosisTable.pulseUnitId],
			references: [unitTable.id]
		}),
		temperatureUnit: one(unitTable, {
			fields: [patientDiagnosisTable.temperatureUnitId],
			references: [unitTable.id]
		}),
		spO2Unit: one(unitTable, {
			fields: [patientDiagnosisTable.spO2UnitId],
			references: [unitTable.id]
		}),
		respirationUnit: one(unitTable, {
			fields: [patientDiagnosisTable.respirationUnitId],
			references: [unitTable.id]
		}),
		rbsUnit: one(unitTable, {
			fields: [patientDiagnosisTable.rbsUnitId],
			references: [unitTable.id]
		})
	})
);

export const staffHospitalTableRelations = relations(
	staffHospitalTable,
	({ one }) => ({
		staff: one(staffTable, {
			fields: [staffHospitalTable.staffId],
			references: [staffTable.id]
		}),
		hospital: one(hospitalTable, {
			fields: [staffHospitalTable.hospitalId],
			references: [hospitalTable.id]
		})
	})
);

export const staffBranchTableRelations = relations(
	staffBranchTable,
	({ one }) => ({
		staff: one(staffTable, {
			fields: [staffBranchTable.staffId],
			references: [staffTable.id]
		}),
		branch: one(hospitalBranchTable, {
			fields: [staffBranchTable.branchId],
			references: [hospitalBranchTable.id]
		})
	})
);

export const staffTableRelations = relations(
	staffTable,
	({ one, many }) => ({
		user: one(userTable, {
			fields: [staffTable.userId],
			references: [userTable.id]
		}),
		identityType: one(identityTypeTable, {
			fields: [staffTable.identityTypeId],
			references: [identityTypeTable.id]
		}),
		maritalStatus: one(maritalStatusTable, {
			fields: [staffTable.maritalStatusId],
			references: [maritalStatusTable.id]
		}),
		gender: one(genderTable, {
			fields: [staffTable.genderId],
			references: [genderTable.id]
		}),
		status: one(statusTable, {
			fields: [staffTable.statusId],
			references: [statusTable.id]
		}),
		city: one(cityTable, {
			fields: [staffTable.cityId],
			references: [cityTable.id]
		}),
		state: one(stateTable, {
			fields: [staffTable.stateId],
			references: [stateTable.id]
		}),
		country: one(countryTable, {
			fields: [staffTable.countryId],
			references: [countryTable.id]
		}),
		phonePrimaryCountry: one(countryTable, {
			fields: [staffTable.phonePrimaryCountryId],
			references: [countryTable.id]
		}),
		phoneSecondaryCountry: one(countryTable, {
			fields: [staffTable.phoneSecondaryCountryId],
			references: [countryTable.id]
		}),
		title: one(titleTable, {
			fields: [staffTable.titleId],
			references: [titleTable.id]
		}),
		staffEmploymentType: one(staffEmploymentTypeTable, {
			fields: [staffTable.staffEmploymentTypeId],
			references: [staffEmploymentTypeTable.id]
		}),
		staffType: one(staffTypeTable, {
			fields: [staffTable.staffTypeId],
			references: [staffTypeTable.id]
		}),
		nationality: one(nationalityTable, {
			fields: [staffTable.nationalityId],
			references: [nationalityTable.id]
		}),
		position: one(positionTable, {
			fields: [staffTable.positionId],
			references: [positionTable.id]
		}),
		postalCode: one(postalCodeTable, {
			fields: [staffTable.postalCodeId],
			references: [postalCodeTable.id]
		}),
		specialization: one(specializationTable, {
			fields: [staffTable.specializationId],
			references: [specializationTable.id]
		}),
		staffDetail: one(staffDetailTable, {
			fields: [staffTable.staffDetailId],
			references: [staffDetailTable.id]
		}),
		staffBranches: many(staffBranchTable),
		staffHospitals: many(staffHospitalTable),
		staffDepartments: many(staffDepartmentTable),
		staffUserGroups: many(staffUserGroupTable),
		doctorSchedules: many(doctorScheduleTable),
		appointments: many(appointmentTable),
		appointmentBlocks: many(appointmentBlockTable)
	})
);

export const staffUserGroupTableRelations = relations(
	staffUserGroupTable,
	({ one }) => ({
		staff: one(staffTable, {
			fields: [staffUserGroupTable.staffId],
			references: [staffTable.id]
		}),
		userGroup: one(userGroupTable, {
			fields: [staffUserGroupTable.userGroupId],
			references: [userGroupTable.id]
		})
	})
);

export const statusTaggingTableRelations = relations(
	statusTaggingTable,
	({ one, many }) => ({
		statusTaggingType: one(statusTaggingTypeTable, {
			fields: [statusTaggingTable.statusTaggingTypeId],
			references: [statusTaggingTypeTable.id]
		}),
		status: one(statusTable, {
			fields: [statusTaggingTable.statusId],
			references: [statusTable.id]
		}),
		appointments: many(appointmentTable)
	})
);

export const statusTaggingTypeTableRelations = relations(
	statusTaggingTypeTable,
	({ one, many }) => ({
		statusTagging: many(statusTaggingTable),
		status: one(statusTable, {
			fields: [statusTaggingTypeTable.statusId],
			references: [statusTable.id]
		})
	})
);

export const userGroupPageTableRelations = relations(
	userGroupPageTable,
	({ one }) => ({
		userGroup: one(userGroupTable, {
			fields: [userGroupPageTable.userGroupId],
			references: [userGroupTable.id]
		}),
		page: one(pageTable, {
			fields: [userGroupPageTable.pageId],
			references: [pageTable.id]
		})
	})
);

export const userGroupTableRelations = relations(
	userGroupTable,
	({ one, many }) => ({
		status: one(statusTable, {
			fields: [userGroupTable.statusId],
			references: [statusTable.id]
		}),
		hospital: one(hospitalTable, {
			fields: [userGroupTable.hospitalId],
			references: [hospitalTable.id]
		}),
		staff: many(staffUserGroupTable),
		userGroupPages: many(userGroupPageTable),
		staffUserGroups: many(staffUserGroupTable)
	})
);

export const patientTableRelations = relations(
	patientTable,
	({ one, many }) => ({
		hospital: one(hospitalTable, {
			fields: [patientTable.hospitalId],
			references: [hospitalTable.id]
		}),
		user: one(userTable, {
			fields: [patientTable.userId],
			references: [userTable.id]
		}),
		maritalStatus: one(maritalStatusTable, {
			fields: [patientTable.maritalStatusId],
			references: [maritalStatusTable.id]
		}),
		gender: one(genderTable, {
			fields: [patientTable.genderId],
			references: [genderTable.id]
		}),
		title: one(titleTable, {
			fields: [patientTable.titleId],
			references: [titleTable.id]
		}),
		identityType: one(identityTypeTable, {
			fields: [patientTable.identityTypeId],
			references: [identityTypeTable.id]
		}),
		bloodType: one(bloodTypeTable, {
			fields: [patientTable.bloodTypeId],
			references: [bloodTypeTable.id]
		}),
		city: one(cityTable, {
			fields: [patientTable.cityId],
			references: [cityTable.id]
		}),
		state: one(stateTable, {
			fields: [patientTable.stateId],
			references: [stateTable.id]
		}),
		country: one(countryTable, {
			fields: [patientTable.countryId],
			references: [countryTable.id]
		}),
		phonePrimaryCountry: one(countryTable, {
			fields: [patientTable.phonePrimaryCountryId],
			references: [countryTable.id]
		}),
		phoneSecondaryCountry: one(countryTable, {
			fields: [patientTable.phoneSecondaryCountryId],
			references: [countryTable.id]
		}),
		fatherTitle: one(titleTable, {
			fields: [patientTable.fatherTitleId],
			references: [titleTable.id]
		}),
		guardianTitle: one(titleTable, {
			fields: [patientTable.guardianTitleId],
			references: [titleTable.id]
		}),
		guardianPhoneCountry: one(countryTable, {
			fields: [patientTable.guardianPhoneCountryId],
			references: [countryTable.id]
		}),
		postalCode: one(postalCodeTable, {
			fields: [patientTable.postalCodeId],
			references: [postalCodeTable.id]
		}),
		nationality: one(nationalityTable, {
			fields: [patientTable.nationalityId],
			references: [nationalityTable.id]
		}),
		religion: one(religionTable, {
			fields: [patientTable.religionId],
			references: [religionTable.id]
		}),
		status: one(statusTable, {
			fields: [patientTable.statusId],
			references: [statusTable.id]
		}),
		attachments: many(patientAttachmentTable),
		insurances: many(patientInsurance),
		allergies: many(patientAllergyTable),
		appointments: many(appointmentTable),
		visits: many(patientVisitTable),
		diagnoses: many(patientDiagnosisTable)
	})
);

export const patientAttachmentTableRelations = relations(
	patientAttachmentTable,
	({ one }) => ({
		patient: one(patientTable, {
			fields: [patientAttachmentTable.patientId],
			references: [patientTable.id]
		}),
		status: one(statusTable, {
			fields: [patientAttachmentTable.statusId],
			references: [statusTable.id]
		})
	})
);

export const insuranceTableRelations = relations(
	insuranceTable,
	({ one, many }) => ({
		status: one(statusTable, {
			fields: [insuranceTable.statusId],
			references: [statusTable.id]
		}),
		patientInsurances: many(patientInsurance)
	})
);

export const patientInsuranceTableRelations = relations(
	patientInsurance,
	({ one }) => ({
		patient: one(patientTable, {
			fields: [patientInsurance.patientId],
			references: [patientTable.id]
		}),
		insurance: one(insuranceTable, {
			fields: [patientInsurance.insuranceId],
			references: [insuranceTable.id]
		})
	})
);

export const patientAllergyTableRelations = relations(
	patientAllergyTable,
	({ one }) => ({
		patient: one(patientTable, {
			fields: [patientAllergyTable.patientId],
			references: [patientTable.id]
		}),
		allergyType: one(allergyMasterTable, {
			fields: [patientAllergyTable.allergyTypeId],
			references: [allergyMasterTable.allergyTypeId]
		}),
		status: one(statusTable, {
			fields: [patientAllergyTable.statusId],
			references: [statusTable.id]
		})
	})
);

export const categoryTableRelations = relations(
	categoryTable,
	({ one, many }) => ({
		hospital: one(hospitalTable, {
			fields: [categoryTable.hospitalId],
			references: [hospitalTable.id]
		}),
		branch: one(hospitalBranchTable, {
			fields: [categoryTable.branchId],
			references: [hospitalBranchTable.id]
		}),
		status: one(statusTable, {
			fields: [categoryTable.statusId],
			references: [statusTable.id]
		}),
		subCategories: many(subCategoryTable)
	})
);

export const subCategoryTableRelations = relations(
	subCategoryTable,
	({ one, many }) => ({
		category: one(categoryTable, {
			fields: [subCategoryTable.categoryId],
			references: [categoryTable.id]
		}),
		status: one(statusTable, {
			fields: [subCategoryTable.statusId],
			references: [statusTable.id]
		}),
		serviceItems: many(serviceItemTable)
	})
);

export const serviceItemTableRelations = relations(
	serviceItemTable,
	({ one, many }) => ({
		hospital: one(hospitalTable, {
			fields: [serviceItemTable.hospitalId],
			references: [hospitalTable.id]
		}),
		subCategory: one(subCategoryTable, {
			fields: [serviceItemTable.subCategoryId],
			references: [subCategoryTable.id]
		}),
		status: one(statusTable, {
			fields: [serviceItemTable.statusId],
			references: [statusTable.id]
		}),
		serviceTaggings: many(serviceTaggingTable)
	})
);

export const serviceTaggingTableRelations = relations(
	serviceTaggingTable,
	({ one }) => ({
		branch: one(hospitalBranchTable, {
			fields: [serviceTaggingTable.branchId],
			references: [hospitalBranchTable.id]
		}),
		serviceItem: one(serviceItemTable, {
			fields: [serviceTaggingTable.serviceId],
			references: [serviceItemTable.id]
		}),
		status: one(statusTable, {
			fields: [serviceTaggingTable.statusId],
			references: [statusTable.id]
		})
	})
);

export const storeTableRelations = relations(
	storeTable,
	({ one }) => ({
		branch: one(hospitalBranchTable, {
			fields: [storeTable.branchId],
			references: [hospitalBranchTable.id]
		}),
		status: one(statusTable, {
			fields: [storeTable.statusId],
			references: [statusTable.id]
		}),
		updatedBy: one(userTable, {
			fields: [storeTable.updatedBy],
			references: [userTable.id]
		})
	})
);
