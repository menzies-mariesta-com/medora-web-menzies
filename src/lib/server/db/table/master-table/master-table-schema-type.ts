import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type {
	bloodTypeTable,
	cityTable,
	countryTable,
	genderTable,
	identityTypeTable,
	maritalStatusTable,
	specializationTable,
	stateTable,
	statusTable,
} from './master-table';

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

export type maritalStatusSchema = InferSelectModel<typeof maritalStatusTable>;
export type maritalStatusSchemaInsert = InferInsertModel<typeof maritalStatusTable>;
export type maritalStatusSchemaUpdate = Partial<maritalStatusSchemaInsert>;

export type SpecializationSchema = InferSelectModel<typeof specializationTable>;
export type SpecializationSchemaInsert = InferInsertModel<typeof specializationTable>;
export type SpecializationSchemaUpdate = Partial<SpecializationSchemaInsert>;

export type StateSchema = InferSelectModel<typeof stateTable>;
export type StateSchemaInsert = InferInsertModel<typeof stateTable>;
export type StateSchemaUpdate = Partial<StateSchemaInsert>;

export type StatusSchema = InferSelectModel<typeof statusTable>;
export type StatusSchemaInsert = InferInsertModel<typeof statusTable>;
export type StatusSchemaUpdate = Partial<StatusSchemaInsert>;
