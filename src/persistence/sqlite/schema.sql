BEGIN;

--
-- Criar a tabela dos donos
-- 
CREATE TABLE IF NOT EXISTS "owners" (
    "owner_id" varchar(50) NOT NULL UNIQUE,
    "owner_name" varchar(50) NOT NULL,
    "phone_number" varchar(9) NOT NULL
);

--
-- Criar a tabela de pacientes
--
CREATE TABLE IF NOT EXISTS "patients" (
    "system_id" varchar(50) NOT NULL UNIQUE,
    "patient_id" varchar(50) NOT NULL UNIQUE,
    "name" varchar(50) NOT NULL,
    "specie" varchar(50) NOT NULL,
    "breed" varchar(50) NOT NULL,
    "birth_date" date NOT NULL, 
    "status" varchar(10) NOT NULL,
    "owner_id" varchar(50) NOT NULL REFERENCES "owners" ("owner_id") DEFERRABLE INITIALLY DEFERRED
);

--
-- Criar a tabela de hospitalizações
--
CREATE TABLE IF NOT EXISTS "hospitalizations" (
    "hospitalization_id" bigint NOT NULL UNIQUE,
    "weight" integer NOT NULL,
    "complaints" text NOT NULL CHECK ((JSON_VALID("complaints") OR "complaints" IS NULL)),
    "diagnostics" text NOT NULL CHECK ((JSON_VALID("diagnostics") OR "diagnostics" IS NULL)),
    "entry_date" datetime NOT NULL,
    "discharge_date" datetime,
    "status" varchar(10) NOT NULL,
    "system_id" varchar(50) NOT NULL REFERENCES "patients" ("system_id") DEFERRABLE INITIALLY DEFERRED
);

--
-- Criar a tabela de orçamentos
--
CREATE TABLE IF NOT EXISTS "budgets" (
    "budget_id" varchar(50) NOT NULL UNIQUE,
    "start_on" datetime NOT NULL,
    "end_on" datetime NOT NULL,
    "status" varchar(50) NOT NULL,
    "days" integer NOT NULL,
    "hospitalization_id" varchar(50) NOT NULL REFERENCES "hospitalizations" ("hospitalization_id") DEFERRABLE INITIALLY DEFERRED
);

-- 
-- Criar a tabela de rondas
-- 
CREATE TABLE IF NOT EXISTS "rounds" (
    "round_id" varchar(50) NOT NULL UNIQUE,
    "system_id" varchar(50) NOT NULL REFERENCES "patients" ("system_id") DEFERRABLE INITIALLY DEFERRED
);

--
-- Criar a tabela das medições
--
CREATE TABLE IF NOT EXISTS "measurements" (
    "name" varchar(50) NOT NULL,
    "value" varchar(50) NOT NULL,
    "issued_at" datetime NOT NULL,
    "round_id" varchar(50) NOT NULL REFERENCES "rounds" ("round_id") DEFERRABLE INITIALLY DEFERRED
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
    "system_id" varchar(50) NOT NULL REFERENCES "patients" ("system_id") DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS "alerts_system_id_idx" ON "alerts" ("system_id");
CREATE INDEX IF NOT EXISTS "patients_owner_id_idx" ON "patients" ("owner_id");
CREATE INDEX IF NOT EXISTS "hospitalizations_system_id_idx" ON "hospitalizations" ("system_id");
CREATE INDEX IF NOT EXISTS "budgets_hospitalization_id_idx" ON "budgets" ("hospitalization_id");
CREATE INDEX IF NOT EXISTS "rounds_system_id_idx" ON "rounds" ("system_id");
CREATE INDEX IF NOT EXISTS "measurements_round_id_idx" ON "measurements" ("round_id");

COMMIT;
