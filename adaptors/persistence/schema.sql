BEGIN;

--
-- Criar a tabela dos donos
-- 
CREATE TABLE IF NOT EXISTS "owners" (
    "owner_id" varchar(20) NOT NULL UNIQUE,
    "owner_name" varchar(50) NOT NULL,
    "phone_number" varchar(9) NOT NULL
);

--
-- Criar a tabela de alertas
--
CREATE TABLE IF NOT EXISTS "patients" (
    "patient_id" varchar(50) NOT NULL UNIQUE,
    "name" varchar(50) NOT NULL,
    "specie" varchar(50) NOT NULL,
    "breed" varchar(50) NOT NULL,
    "birth_date" date NOT NULL, 
    "status" varchar(10) NOT NULL,
    "owner_id" bigint NOT NULL REFERENCES "owners" ("owner_id") DEFERRABLE INITIALLY DEFERRED

);


--
-- Criar a tabela de alertas
--
CREATE TABLE IF NOT EXISTS "alerts" (
    "alert_id" varchar(50) NOT NULL UNIQUE,
    "parameters" text NOT NULL CHECK ((JSON_VALID("parameters") OR "parameters" IS NULL)),
    "repeat_every" integer NOT NULL,
    "time" datetime NOT NULL,
    "comments" text NOT NULL,
    "status" varchar(10) NOT NULL,
    "patient_id" bigint NOT NULL REFERENCES "patients" ("patient_id") DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS "alerts_patient_id_idx" ON "alerts" ("patient_id");
CREATE INDEX IF NOT EXISTS "patients_owner_id_idx" ON "patients" ("owner_id");

COMMIT;
