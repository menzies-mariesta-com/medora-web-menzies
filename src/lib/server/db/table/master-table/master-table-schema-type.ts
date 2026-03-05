import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type {
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
	severityTable,
	staffEmploymentTypeTable,
	staffShiftTypeTable,
	staffTypeTable,
	stateTable,
	statusTable,
	titleTable,
	unitTable,
	unitTypeTable,
	visitTypeTable,
	weekdayTable
} from './master-table';
import type { Infer } from 'zod';

// Master Tables (alphabetical)
export type BloodTypeSchema = InferSelectModel<typeof bloodTypeTable>;
export type BloodTypeSchemaInsert = InferInsertModel<
	typeof bloodTypeTable
>;
export type BloodTypeSchemaUpdate = Partial<BloodTypeSchemaInsert>;

export type CitySchema = InferSelectModel<typeof cityTable>;
export type CitySchemaInsert = InferInsertModel<typeof cityTable>;
export type CitySchemaUpdate = Partial<CitySchemaInsert>;

export type CountrySchema = InferSelectModel<typeof countryTable>;
export type CountrySchemaInsert = InferInsertModel<
	typeof countryTable
>;
export type CountrySchemaUpdate = Partial<CountrySchemaInsert>;

export type DepartmentSchema = InferSelectModel<
	typeof departmentTable
>;
export type DepartmentSchemaInsert = InferInsertModel<
	typeof departmentTable
>;
export type DepartmentSchemaUpdate = Partial<DepartmentSchemaInsert>;

export type GenderSchema = InferSelectModel<typeof genderTable>;
export type GenderSchemaInsert = InferInsertModel<typeof genderTable>;
export type GenderSchemaUpdate = Partial<GenderSchemaInsert>;

export type IdentityTypeSchema = InferSelectModel<
	typeof identityTypeTable
>;
export type IdentityTypeSchemaInsert = InferInsertModel<
	typeof identityTypeTable
>;
export type IdentityTypeSchemaUpdate =
	Partial<IdentityTypeSchemaInsert>;

export type MaritalStatusSchema = InferSelectModel<
	typeof maritalStatusTable
>;
export type MaritalStatusSchemaInsert = InferInsertModel<
	typeof maritalStatusTable
>;
export type MaritalStatusSchemaUpdate =
	Partial<MaritalStatusSchemaInsert>;

export type NationalitySchema = InferSelectModel<
	typeof nationalityTable
>;
export type NationalitySchemaInsert = InferInsertModel<
	typeof nationalityTable
>;
export type NationalitySchemaUpdate =
	Partial<NationalitySchemaInsert>;

export type PositionSchema = InferSelectModel<typeof positionTable>;
export type PositionSchemaInsert = InferInsertModel<
	typeof positionTable
>;
export type PositionSchemaUpdate = Partial<PositionSchemaInsert>;

export type PostalCodeSchema = InferSelectModel<
	typeof postalCodeTable
>;
export type PostalCodeSchemaInsert = InferInsertModel<
	typeof postalCodeTable
>;
export type PostalCodeSchemaUpdate = Partial<PostalCodeSchemaInsert>;

export type SpecializationSchema = InferSelectModel<
	typeof specializationTable
>;
export type SpecializationSchemaInsert = InferInsertModel<
	typeof specializationTable
>;
export type SpecializationSchemaUpdate =
	Partial<SpecializationSchemaInsert>;

export type StateSchema = InferSelectModel<typeof stateTable>;
export type StateSchemaInsert = InferInsertModel<typeof stateTable>;
export type StateSchemaUpdate = Partial<StateSchemaInsert>;

export type StatusSchema = InferSelectModel<typeof statusTable>;
export type StatusSchemaInsert = InferInsertModel<typeof statusTable>;
export type StatusSchemaUpdate = Partial<StatusSchemaInsert>;

export type CraftGroupSchema = InferSelectModel<
	typeof craftGroupTable
>;
export type CraftGroupSchemaInsert = InferInsertModel<
	typeof craftGroupTable
>;
export type CraftGroupSchemaUpdate = Partial<CraftGroupSchemaInsert>;

export type StaffEmploymentTypeSchema = InferSelectModel<
	typeof staffEmploymentTypeTable
>;
export type StaffEmploymentTypeSchemaInsert = InferInsertModel<
	typeof staffEmploymentTypeTable
>;
export type StaffEmploymentTypeSchemaUpdate =
	Partial<StaffEmploymentTypeSchemaInsert>;

export type StaffShiftTypeSchema = InferSelectModel<
	typeof staffShiftTypeTable
>;
export type StaffShiftTypeSchemaInsert = InferInsertModel<
	typeof staffShiftTypeTable
>;
export type StaffShiftTypeSchemaUpdate =
	Partial<StaffShiftTypeSchemaInsert>;

export type StaffTypeSchema = InferSelectModel<typeof staffTypeTable>;
export type StaffTypeSchemaInsert = InferInsertModel<
	typeof staffTypeTable
>;
export type StaffTypeSchemaUpdate = Partial<StaffTypeSchemaInsert>;

export type TitleSchema = InferSelectModel<typeof titleTable>;
export type TitleSchemaInsert = InferInsertModel<typeof titleTable>;
export type TitleSchemaUpdate = Partial<TitleSchemaInsert>;

export type ReferTypeSchema = InferSelectModel<typeof referTypeTable>;
export type ReferTypeSchemaInsert = InferInsertModel<
	typeof referTypeTable
>;
export type ReferTypeSchemaUpdate = Partial<ReferTypeSchemaInsert>;

export type ReligionSchema = InferSelectModel<typeof religionTable>;
export type ReligionSchemaInsert = InferInsertModel<
	typeof religionTable
>;
export type ReligionSchemaUpdate = Partial<ReligionSchemaInsert>;

export type SeveritySchema = InferSelectModel<typeof severityTable>;
export type SeveritySchemaInsert = InferInsertModel<typeof severityTable>;
export type SeveritySchemaUpdate = Partial<SeveritySchemaInsert>;

export type WeekdaySchema = InferSelectModel<typeof weekdayTable>;
export type WeekdaySchemaInsert = InferInsertModel<
	typeof weekdayTable
>;
export type WeekdaySchemaUpdate = Partial<WeekdaySchemaInsert>;

export type UnitTypeSchema = InferSelectModel<typeof unitTypeTable>;
export type UnitTypeSchemaInsert = InferInsertModel<
	typeof unitTypeTable
>;
export type UnitTypeSchemaUpdate = Partial<UnitTypeSchemaInsert>;

export type UnitSchema = InferSelectModel<typeof unitTable>;
export type UnitSchemaInsert = InferInsertModel<typeof unitTable>;
export type UnitSchemaUpdate = Partial<UnitSchemaInsert>;

export type VisitTypeSchema = InferSelectModel<typeof visitTypeTable>;
export type VisitTypeSchemaInsert = InferInsertModel<
	typeof visitTypeTable
>;
export type VisitTypeSchemaUpdate = Partial<VisitTypeSchemaInsert>;
