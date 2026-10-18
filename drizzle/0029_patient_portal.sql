INSERT INTO role (id, name, status_id)
VALUES (5, 'Patient', 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status_id = EXCLUDED.status_id;

CREATE TABLE IF NOT EXISTS patient_device_token (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES hospital(id) ON DELETE CASCADE,
  installation_id text NOT NULL,
  fcm_token text NOT NULL,
  platform varchar(32) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS patient_device_token_installation_user_uidx
  ON patient_device_token (installation_id, user_id);

CREATE INDEX IF NOT EXISTS patient_device_token_patient_id_idx
  ON patient_device_token (patient_id);

CREATE TABLE IF NOT EXISTS patient_portal_audit (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  patient_id uuid NOT NULL,
  hospital_id uuid NOT NULL,
  endpoint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_portal_audit_patient_id_idx
  ON patient_portal_audit (patient_id);
