import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type {
	bloodTypeTable,
	cityTable,
	countryTable,
	departmentTable,
	genderTable,
	hospitalTable,
	identityTypeTable,
	marialStatusTable,
	moduleTable,
	pageTable,
	roleTable,
	specializationTable,
	staffDepartmentTable,
	staffHospitalTable,
	staffRoleTable,
	staffTable,
	staffUserGroupTable,
	stateTable,
	statusTable,
	userGroupModuleTable,
	userGroupPageTable,
	userGroupTable,
} from './schema';

// Master Tables (alphabetical)
export type BloodTypeSchema = InferSelectModel<typeof bloodTypeTable>;
export type BloodTypeSchemaInsert = InferInsertModel<typeof bloodTypeTable>;
export type BloodTypeSchemaUpdate = Partial<BloodTypeSchemaInsert>;

export type CitySchema = InferSelectModel<typeof cityTable>;
export type CitySchemaInsert = InferInsertModel<typeof cityTable>;
export type CitySchemaUpdate = Partial<CitySchemaInsert>;

export type CountrySchema = InferSelectModel<typeof countryTable>;
export type CountrySchemaInsert = InferInsertModel<typeof countryTable>;
export type CountrySchemaUpdate = Partial<CountrySchemaInsert>;

export type GenderSchema = InferSelectModel<typeof genderTable>;
export type GenderSchemaInsert = InferInsertModel<typeof genderTable>;
export type GenderSchemaUpdate = Partial<GenderSchemaInsert>;

export type IdentityTypeSchema = InferSelectModel<typeof identityTypeTable>;
export type IdentityTypeSchemaInsert = InferInsertModel<typeof identityTypeTable>;
export type IdentityTypeSchemaUpdate = Partial<IdentityTypeSchemaInsert>;

export type MarialStatusSchema = InferSelectModel<typeof marialStatusTable>;
export type MarialStatusSchemaInsert = InferInsertModel<typeof marialStatusTable>;
export type MarialStatusSchemaUpdate = Partial<MarialStatusSchemaInsert>;

export type SpecializationSchema = InferSelectModel<typeof specializationTable>;
export type SpecializationSchemaInsert = InferInsertModel<typeof specializationTable>;
export type SpecializationSchemaUpdate = Partial<SpecializationSchemaInsert>;

export type StateSchema = InferSelectModel<typeof stateTable>;
export type StateSchemaInsert = InferInsertModel<typeof stateTable>;
export type StateSchemaUpdate = Partial<StateSchemaInsert>;

export type StatusSchema = InferSelectModel<typeof statusTable>;
export type StatusSchemaInsert = InferInsertModel<typeof statusTable>;
export type StatusSchemaUpdate = Partial<StatusSchemaInsert>;

// Information Tables (alphabetical)
export type DepartmentSchema = InferSelectModel<typeof departmentTable>;
export type DepartmentSchemaInsert = InferInsertModel<typeof departmentTable>;
export type DepartmentSchemaUpdate = Partial<DepartmentSchemaInsert>;

export type HospitalSchema = InferSelectModel<typeof hospitalTable>;
export type HospitalSchemaInsert = InferInsertModel<typeof hospitalTable>;
export type HospitalSchemaUpdate = Partial<HospitalSchemaInsert>;

export type ModuleSchema = InferSelectModel<typeof moduleTable>;
export type ModuleSchemaInsert = InferInsertModel<typeof moduleTable>;
export type ModuleSchemaUpdate = Partial<ModuleSchemaInsert>;

export type PageSchema = InferSelectModel<typeof pageTable>;
export type PageSchemaInsert = InferInsertModel<typeof pageTable>;
export type PageSchemaUpdate = Partial<PageSchemaInsert>;

export type RoleSchema = InferSelectModel<typeof roleTable>;
export type RoleSchemaInsert = InferInsertModel<typeof roleTable>;
export type RoleSchemaUpdate = Partial<RoleSchemaInsert>;

export type StaffDepartmentSchema = InferSelectModel<typeof staffDepartmentTable>;
export type StaffDepartmentSchemaInsert = InferInsertModel<typeof staffDepartmentTable>;
export type StaffDepartmentSchemaUpdate = Partial<StaffDepartmentSchemaInsert>;

export type StaffHospitalSchema = InferSelectModel<typeof staffHospitalTable>;
export type StaffHospitalSchemaInsert = InferInsertModel<typeof staffHospitalTable>;
export type StaffHospitalSchemaUpdate = Partial<StaffHospitalSchemaInsert>;

export type StaffRoleSchema = InferSelectModel<typeof staffRoleTable>;
export type StaffRoleSchemaInsert = InferInsertModel<typeof staffRoleTable>;
export type StaffRoleSchemaUpdate = Partial<StaffRoleSchemaInsert>;

export type StaffSchema = InferSelectModel<typeof staffTable>;
export type StaffSchemaInsert = InferInsertModel<typeof staffTable>;
export type StaffSchemaUpdate = Partial<StaffSchemaInsert>;

export type StaffUserGroupSchema = InferSelectModel<typeof staffUserGroupTable>;
export type StaffUserGroupSchemaInsert = InferInsertModel<typeof staffUserGroupTable>;
export type StaffUserGroupSchemaUpdate = Partial<StaffUserGroupSchemaInsert>;

export type UserGroupModuleSchema = InferSelectModel<typeof userGroupModuleTable>;
export type UserGroupModuleSchemaInsert = InferInsertModel<typeof userGroupModuleTable>;
export type UserGroupModuleSchemaUpdate = Partial<UserGroupModuleSchemaInsert>;

export type UserGroupPageSchema = InferSelectModel<typeof userGroupPageTable>;
export type UserGroupPageSchemaInsert = InferInsertModel<typeof userGroupPageTable>;
export type UserGroupPageSchemaUpdate = Partial<UserGroupPageSchemaInsert>;

export type UserGroupSchema = InferSelectModel<typeof userGroupTable>;
export type UserGroupSchemaInsert = InferInsertModel<typeof userGroupTable>;
export type UserGroupSchemaUpdate = Partial<UserGroupSchemaInsert>;
