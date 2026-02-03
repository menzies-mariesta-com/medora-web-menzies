import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type {
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
} from './information-table';

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

/** Payload for creating a staff profile linked to a Better Auth user (used by createMyStaffProfile). */
export type CreateStaffProfilePayload = {
	firstName?: string;
	middleName?: string;
	lastName?: string;
	email?: string;
	phonePrimary?: string;
	countryId?: string | number;
	genderId?: string | number;
};

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
