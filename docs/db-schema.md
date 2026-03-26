```mermaid
erDiagram
  %% NOTE
  %% - Source: Drizzle `pgTable(...)` schemas under `src/lib/server/db/table/**`
  %% - This focuses on PK/FK relationships (not every column).

  %% =========================
  %% Auth tables
  %% =========================
  user {
    text id PK
    int role_id FK
  }
  session {
    text id PK
    text user_id FK
  }
  account {
    text id PK
    text user_id FK
  }
  verification {
    text id PK
  }
  role {
    int id PK
    int status_id FK
  }

  %% =========================
  %% Master tables (lookup)
  %% =========================
  status {
    int id PK
  }
  country {
    int id PK
    int status_id FK
  }
  state {
    int id PK
    int country_id FK
    int status_id FK
  }
  city {
    int id PK
    int state_id FK
    int status_id FK
  }
  postal_code {
    int id PK
    int city_id FK
    int status_id FK
  }
  craft_group {
    int id PK
    int status_id FK
  }
  specialization {
    int id PK
    int craft_group_id FK
    int status_id FK
  }
  unit_type {
    int id PK
    int status_id FK
  }
  unit {
    int id PK
    int unit_type_id FK
    int status_id FK
  }
  title {
    int id PK
    int status_id FK
  }
  gender {
    int id PK
    int status_id FK
  }
  marital_status {
    int id PK
    int status_id FK
  }
  nationality {
    int id PK
    int status_id FK
  }
  religion {
    int id PK
    int status_id FK
  }
  identity_type {
    int id PK
    int status_id FK
  }
  blood_type {
    int id PK
    int status_id FK
  }
  department {
    int id PK
    int status_id FK
  }
  position {
    int id PK
    int status_id FK
  }
  staff_employment_type {
    int id PK
    int status_id FK
  }
  staff_shift_type {
    int id PK
    int status_id FK
  }
  staff_type {
    int id PK
    int status_id FK
  }
  weekday {
    int id PK
    int status_id FK
  }
  visit_type {
    int id PK
    int status_id FK
  }
  category {
    int id PK
    int status_id FK
  }
  diagnosis_type {
    int id PK
    int status_id FK
  }
  form_name {
    int id PK
    int status_id FK
  }
  refer_type {
    int id PK
    int status_id FK
  }
  severity {
    int id PK
    int status_id FK
  }

  %% =========================
  %% Information tables (business)
  %% =========================
  hospital {
    uuid id PK
    text owner_id FK
    int phone_country_id FK
    int postal_code_id FK
    int city_id FK
    int state_id FK
    int country_id FK
    int status_id FK
  }
  hospital_branch {
    uuid id PK
    uuid hospital_id FK
    int phone_country_id FK
    int postal_code_id FK
    int city_id FK
    int state_id FK
    int country_id FK
    int status_id FK
  }
  hospital_patient_code_counter {
    uuid hospital_id PK
  }
  hospital_visit_code_counter {
    uuid hospital_id FK
    uuid branch_id FK
    int visit_type_id FK
    int year
  }
  hospital_department {
    int id PK
    uuid hospital_id FK
    int department_id FK
  }
  module {
    int id PK
    int status_id FK
  }
  page {
    int id PK
    int module_id FK
    int status_id FK
  }
  staff_detail {
    int id PK
    int blood_type_id FK
    int status_id FK
  }
  staff {
    uuid id PK
    text user_id FK
    int title_id FK
    int identity_type_id FK
    int staff_employment_type_id FK
    int staff_type_id FK
    int staff_detail_id FK
    int city_id FK
    int state_id FK
    int country_id FK
    int marital_status_id FK
    int nationality_id FK
    int position_id FK
    int postal_code_id FK
    int specialization_id FK
    int gender_id FK
    int status_id FK
  }
  staff_department {
    int id PK
    uuid staff_id FK
    int department_id FK
  }
  staff_hospital {
    int id PK
    uuid staff_id FK
    uuid hospital_id FK
  }
  staff_branch {
    int id PK
    uuid staff_id FK
    uuid branch_id FK
  }
  user_group {
    int id PK
    uuid hospital_id FK
    int status_id FK
  }
  staff_user_group {
    int id PK
    uuid staff_id FK
    int user_group_id FK
  }
  user_group_page {
    int id PK
    int user_group_id FK
    int page_id FK
  }
  status_tagging_type {
    int id PK
    int status_id FK
  }
  status_tagging {
    int id PK
    int status_tagging_type_id FK
    int status_id FK
  }
  patient {
    uuid id PK
    uuid hospital_id FK
    text user_id FK
    int title_id FK
    int father_title_id FK
    int guardian_title_id FK
    int guardian_phone_country_id FK
    int phone_primary_country_id FK
    int phone_secondary_country_id FK
    int marital_status_id FK
    int gender_id FK
    int identity_type_id FK
    int blood_type_id FK
    int city_id FK
    int state_id FK
    int country_id FK
    int postal_code_id FK
    int nationality_id FK
    int religion_id FK
    int status_id FK
  }
  patient_attachment {
    int id PK
    uuid patient_id FK
    int status_id FK
  }
  insurance_table {
    uuid id PK
    int status_id FK
  }
  patient_insurance {
    int id PK
    uuid patient_id FK
    uuid insurance_id FK
  }
  allergy {
    int id PK
    int status_id FK
  }
  patient_allergy {
    int id PK
    int visit_id FK
    uuid patient_id FK
    int allergy_id FK
    int severity_id FK
    int status_id FK
  }
  document_type {
    int id PK
    int status_id FK
  }
  document_setting {
    int id PK
    int document_type_id FK
    uuid hospital_id FK
    int status_id FK
  }
  document {
    int id PK
    int document_type_id FK
    int document_setting_id FK
    int status_id FK
  }
  patient_document {
    int id PK
    int visit_id FK
    uuid patient_id FK
    int document_id FK
    int patient_attachment_id FK
    int status_id FK
  }
  doctor_schedule {
    int id PK
    uuid staff_id FK
    uuid hospital_id FK
    uuid branch_id FK
    int weekday_id FK
    int status_id FK
  }
  external_refer {
    int id PK
    int refer_type_id FK
    uuid hospital_id FK
    int title_id FK
    int country_id FK
    int state_id FK
    int city_id FK
    int postal_code_id FK
    int phone_country_id FK
    int status_id FK
  }
  appointment {
    int id PK
    uuid hospital_id FK
    uuid branch_id FK
    uuid patient_id FK
    uuid staff_id FK
    int patient_title_id FK
    int refer_type_id FK
    int external_refer_id FK
    int status_tagging_id FK
    int status_id FK
  }
  appointment_block {
    int id PK
    uuid staff_id FK
    uuid hospital_id FK
    int status_id FK
  }
  patient_visit {
    int id PK
    uuid patient_id FK
    uuid hospital_id FK
    uuid branch_id FK
    int appointment_id FK
    uuid doctor_id FK
    int visit_type_id FK
    int status_id FK
  }
  patient_diagnosis {
    int id PK
    uuid patient_id FK
    uuid hospital_id FK
    int visit_id FK
    int height_unit_id FK
    int weight_unit_id FK
    int bp_unit_id FK
    int pulse_unit_id FK
    int temperature_unit_id FK
    int sp_o2_unit_id FK
    int respiration_unit_id FK
    int rbs_unit_id FK
    int status_id FK
  }
  diagnosis {
    int id PK
    uuid branch_id FK
    uuid patient_id FK
    int visit_id FK
    int diagnosis_type_id FK
    int status_id FK
  }
  patient_form_entry {
    int id PK
    uuid branch_id FK
    uuid patient_id FK
    int visit_id FK
    int form_name_id FK
    int status_id FK
  }
  sub_category {
    int id PK
    int category_id FK
    int status_id FK
  }
  service_item {
    int id PK
    uuid hospital_id FK
    int sub_category_id FK
    int status_id FK
  }
  service_tagging {
    int id PK
    uuid branch_id FK
    int service_id FK
    int status_id FK
  }
  service_order {
    int id PK
    uuid branch_id FK
    int visit_id FK
    int status_id FK
  }
  service_order_detail {
    int id PK
    int service_order_id FK
    int service_id FK
    uuid advising_doctor_id FK
    text cancel_by FK
    int status_id FK
  }
  store {
    int id PK
    uuid branch_id FK
    int status_id FK
  }
  support_ticket {
    int id PK
    text requester_id FK
    uuid hospital_id FK
    text assigned_to_user_id FK
  }
  refer_history {
    int id PK
    int visit_id FK
    uuid from_branch_id FK
    uuid to_branch_id FK
    uuid from_refer_doctorid FK
    uuid to_refer_doctorid FK
    text cancel_by FK
  }

  %% =========================
  %% Notification tables
  %% =========================
  notification {
    int id PK
    uuid recipient_staff_id FK
    uuid hospital_id FK
    int visit_id FK
    int refer_history_id FK
    int status_id FK
    text created_by FK
    text updated_by FK
    text deleted_by FK
  }

  %% =========================
  %% Marketplace tables
  %% =========================
  marketplace_app {
    int id PK
    int status_id FK
  }
  marketplace_app_form {
    int id PK
    int app_id FK
    int status_id FK
  }
  marketplace_allowed_file_extension {
    int id PK
    int status_id FK
  }
  marketplace_app_archive {
    int id PK
    int app_id FK
    int file_extension_id FK
    int status_id FK
  }

  %% =========================
  %% Relationships (FK edges)
  %% =========================
  status ||--o{ role : "status_id"
  role ||--o{ user : "role_id"
  user ||--o{ session : "user_id"
  user ||--o{ account : "user_id"

  status ||--o{ country : "status_id"
  country ||--o{ state : "country_id"
  status ||--o{ state : "status_id"
  state ||--o{ city : "state_id"
  status ||--o{ city : "status_id"
  city ||--o{ postal_code : "city_id"
  status ||--o{ postal_code : "status_id"
  craft_group ||--o{ specialization : "craft_group_id"
  status ||--o{ specialization : "status_id"
  unit_type ||--o{ unit : "unit_type_id"
  status ||--o{ unit_type : "status_id"
  status ||--o{ unit : "status_id"

  status ||--o{ title : "status_id"
  status ||--o{ gender : "status_id"
  status ||--o{ marital_status : "status_id"
  status ||--o{ nationality : "status_id"
  status ||--o{ religion : "status_id"
  status ||--o{ identity_type : "status_id"
  status ||--o{ blood_type : "status_id"
  status ||--o{ department : "status_id"
  status ||--o{ position : "status_id"
  status ||--o{ staff_employment_type : "status_id"
  status ||--o{ staff_shift_type : "status_id"
  status ||--o{ staff_type : "status_id"
  status ||--o{ weekday : "status_id"
  status ||--o{ visit_type : "status_id"
  status ||--o{ category : "status_id"
  status ||--o{ diagnosis_type : "status_id"
  status ||--o{ form_name : "status_id"
  status ||--o{ refer_type : "status_id"
  status ||--o{ severity : "status_id"

  user ||--o{ hospital : "owner_id"
  hospital ||--o{ hospital_branch : "hospital_id"
  country ||--o{ hospital : "country_id"
  state ||--o{ hospital : "state_id"
  city ||--o{ hospital : "city_id"
  postal_code ||--o{ hospital : "postal_code_id"
  status ||--o{ hospital : "status_id"
  country ||--o{ hospital_branch : "country_id"
  state ||--o{ hospital_branch : "state_id"
  city ||--o{ hospital_branch : "city_id"
  postal_code ||--o{ hospital_branch : "postal_code_id"
  status ||--o{ hospital_branch : "status_id"

  hospital ||--o{ hospital_patient_code_counter : "hospital_id"
  hospital ||--o{ hospital_visit_code_counter : "hospital_id"
  hospital_branch ||--o{ hospital_visit_code_counter : "branch_id"
  visit_type ||--o{ hospital_visit_code_counter : "visit_type_id"
  hospital ||--o{ hospital_department : "hospital_id"
  department ||--o{ hospital_department : "department_id"

  status ||--o{ module : "status_id"
  module ||--o{ page : "module_id"
  status ||--o{ page : "status_id"

  status ||--o{ staff_detail : "status_id"
  blood_type ||--o{ staff_detail : "blood_type_id"

  user ||--o{ staff : "user_id"
  title ||--o{ staff : "title_id"
  identity_type ||--o{ staff : "identity_type_id"
  staff_employment_type ||--o{ staff : "staff_employment_type_id"
  staff_type ||--o{ staff : "staff_type_id"
  staff_detail ||--o{ staff : "staff_detail_id"
  city ||--o{ staff : "city_id"
  state ||--o{ staff : "state_id"
  country ||--o{ staff : "country_id"
  marital_status ||--o{ staff : "marital_status_id"
  nationality ||--o{ staff : "nationality_id"
  position ||--o{ staff : "position_id"
  postal_code ||--o{ staff : "postal_code_id"
  specialization ||--o{ staff : "specialization_id"
  gender ||--o{ staff : "gender_id"
  status ||--o{ staff : "status_id"

  staff ||--o{ staff_department : "staff_id"
  department ||--o{ staff_department : "department_id"
  staff ||--o{ staff_hospital : "staff_id"
  hospital ||--o{ staff_hospital : "hospital_id"
  staff ||--o{ staff_branch : "staff_id"
  hospital_branch ||--o{ staff_branch : "branch_id"

  hospital ||--o{ user_group : "hospital_id"
  status ||--o{ user_group : "status_id"
  staff ||--o{ staff_user_group : "staff_id"
  user_group ||--o{ staff_user_group : "user_group_id"
  user_group ||--o{ user_group_page : "user_group_id"
  page ||--o{ user_group_page : "page_id"

  status ||--o{ status_tagging_type : "status_id"
  status_tagging_type ||--o{ status_tagging : "status_tagging_type_id"
  status ||--o{ status_tagging : "status_id"

  hospital ||--o{ patient : "hospital_id"
  user ||--o{ patient : "user_id"
  title ||--o{ patient : "title_id"
  title ||--o{ patient : "father_title_id"
  title ||--o{ patient : "guardian_title_id"
  country ||--o{ patient : "guardian_phone_country_id"
  country ||--o{ patient : "phone_primary_country_id"
  country ||--o{ patient : "phone_secondary_country_id"
  marital_status ||--o{ patient : "marital_status_id"
  gender ||--o{ patient : "gender_id"
  identity_type ||--o{ patient : "identity_type_id"
  blood_type ||--o{ patient : "blood_type_id"
  city ||--o{ patient : "city_id"
  state ||--o{ patient : "state_id"
  country ||--o{ patient : "country_id"
  postal_code ||--o{ patient : "postal_code_id"
  nationality ||--o{ patient : "nationality_id"
  religion ||--o{ patient : "religion_id"
  status ||--o{ patient : "status_id"

  patient ||--o{ patient_attachment : "patient_id"
  status ||--o{ patient_attachment : "status_id"

  status ||--o{ insurance_table : "status_id"
  patient ||--o{ patient_insurance : "patient_id"
  insurance_table ||--o{ patient_insurance : "insurance_id"

  status ||--o{ allergy : "status_id"
  patient_visit ||--o{ patient_allergy : "visit_id"
  patient ||--o{ patient_allergy : "patient_id"
  allergy ||--o{ patient_allergy : "allergy_id"
  severity ||--o{ patient_allergy : "severity_id"
  status ||--o{ patient_allergy : "status_id"

  status ||--o{ document_type : "status_id"
  document_type ||--o{ document_setting : "document_type_id"
  hospital ||--o{ document_setting : "hospital_id"
  status ||--o{ document_setting : "status_id"
  document_type ||--o{ document : "document_type_id"
  document_setting ||--o{ document : "document_setting_id"
  status ||--o{ document : "status_id"
  patient_visit ||--o{ patient_document : "visit_id"
  patient ||--o{ patient_document : "patient_id"
  document ||--o{ patient_document : "document_id"
  patient_attachment ||--o{ patient_document : "patient_attachment_id"
  status ||--o{ patient_document : "status_id"

  staff ||--o{ doctor_schedule : "staff_id"
  hospital ||--o{ doctor_schedule : "hospital_id"
  hospital_branch ||--o{ doctor_schedule : "branch_id"
  weekday ||--o{ doctor_schedule : "weekday_id"
  status ||--o{ doctor_schedule : "status_id"

  refer_type ||--o{ external_refer : "refer_type_id"
  hospital ||--o{ external_refer : "hospital_id"
  title ||--o{ external_refer : "title_id"
  country ||--o{ external_refer : "country_id"
  state ||--o{ external_refer : "state_id"
  city ||--o{ external_refer : "city_id"
  postal_code ||--o{ external_refer : "postal_code_id"
  country ||--o{ external_refer : "phone_country_id"
  status ||--o{ external_refer : "status_id"

  hospital ||--o{ appointment : "hospital_id"
  hospital_branch ||--o{ appointment : "branch_id"
  patient ||--o{ appointment : "patient_id"
  staff ||--o{ appointment : "staff_id"
  title ||--o{ appointment : "patient_title_id"
  refer_type ||--o{ appointment : "refer_type_id"
  external_refer ||--o{ appointment : "external_refer_id"
  status_tagging ||--o{ appointment : "status_tagging_id"
  status ||--o{ appointment : "status_id"

  staff ||--o{ appointment_block : "staff_id"
  hospital ||--o{ appointment_block : "hospital_id"
  status ||--o{ appointment_block : "status_id"

  patient ||--o{ patient_visit : "patient_id"
  hospital ||--o{ patient_visit : "hospital_id"
  hospital_branch ||--o{ patient_visit : "branch_id"
  appointment ||--o{ patient_visit : "appointment_id"
  staff ||--o{ patient_visit : "doctor_id"
  visit_type ||--o{ patient_visit : "visit_type_id"
  status ||--o{ patient_visit : "status_id"

  patient ||--o{ patient_diagnosis : "patient_id"
  hospital ||--o{ patient_diagnosis : "hospital_id"
  patient_visit ||--o{ patient_diagnosis : "visit_id"
  unit ||--o{ patient_diagnosis : "height_unit_id"
  unit ||--o{ patient_diagnosis : "weight_unit_id"
  unit ||--o{ patient_diagnosis : "bp_unit_id"
  unit ||--o{ patient_diagnosis : "pulse_unit_id"
  unit ||--o{ patient_diagnosis : "temperature_unit_id"
  unit ||--o{ patient_diagnosis : "sp_o2_unit_id"
  unit ||--o{ patient_diagnosis : "respiration_unit_id"
  unit ||--o{ patient_diagnosis : "rbs_unit_id"
  status ||--o{ patient_diagnosis : "status_id"

  hospital_branch ||--o{ diagnosis : "branch_id"
  patient ||--o{ diagnosis : "patient_id"
  patient_visit ||--o{ diagnosis : "visit_id"
  diagnosis_type ||--o{ diagnosis : "diagnosis_type_id"
  status ||--o{ diagnosis : "status_id"

  hospital_branch ||--o{ patient_form_entry : "branch_id"
  patient ||--o{ patient_form_entry : "patient_id"
  patient_visit ||--o{ patient_form_entry : "visit_id"
  form_name ||--o{ patient_form_entry : "form_name_id"
  status ||--o{ patient_form_entry : "status_id"

  category ||--o{ sub_category : "category_id"
  status ||--o{ sub_category : "status_id"
  hospital ||--o{ service_item : "hospital_id"
  sub_category ||--o{ service_item : "sub_category_id"
  status ||--o{ service_item : "status_id"
  hospital_branch ||--o{ service_tagging : "branch_id"
  service_item ||--o{ service_tagging : "service_id"
  status ||--o{ service_tagging : "status_id"
  hospital_branch ||--o{ service_order : "branch_id"
  patient_visit ||--o{ service_order : "visit_id"
  status ||--o{ service_order : "status_id"
  service_order ||--o{ service_order_detail : "service_order_id"
  service_item ||--o{ service_order_detail : "service_id"
  staff ||--o{ service_order_detail : "advising_doctor_id"
  user ||--o{ service_order_detail : "cancel_by"
  status ||--o{ service_order_detail : "status_id"

  hospital_branch ||--o{ store : "branch_id"
  status ||--o{ store : "status_id"

  user ||--o{ support_ticket : "requester_id"
  user ||--o{ support_ticket : "assigned_to_user_id"
  hospital ||--o{ support_ticket : "hospital_id"

  patient_visit ||--o{ refer_history : "visit_id"
  hospital_branch ||--o{ refer_history : "from_branch_id"
  hospital_branch ||--o{ refer_history : "to_branch_id"
  staff ||--o{ refer_history : "from_refer_doctorid"
  staff ||--o{ refer_history : "to_refer_doctorid"
  user ||--o{ refer_history : "cancel_by"

  staff ||--o{ notification : "recipient_staff_id"
  hospital ||--o{ notification : "hospital_id"
  patient_visit ||--o{ notification : "visit_id"
  refer_history ||--o{ notification : "refer_history_id"
  status ||--o{ notification : "status_id"
  user ||--o{ notification : "created_by"
  user ||--o{ notification : "updated_by"
  user ||--o{ notification : "deleted_by"

  status ||--o{ marketplace_app : "status_id"
  marketplace_app ||--o{ marketplace_app_form : "app_id"
  status ||--o{ marketplace_app_form : "status_id"
  status ||--o{ marketplace_allowed_file_extension : "status_id"
  marketplace_app ||--o{ marketplace_app_archive : "app_id"
  marketplace_allowed_file_extension ||--o{ marketplace_app_archive : "file_extension_id"
  status ||--o{ marketplace_app_archive : "status_id"
```

