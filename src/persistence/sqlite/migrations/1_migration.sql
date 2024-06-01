BEGIN TRANSACTION;

-- Migração de dados --

-- Adicionar coluna system_id à tabela patients
ALTER TABLE "patients" ADD COLUMN "system_id" varchar(50) NULL;
UPDATE "patients" SET "system_id" = lower(hex(randomblob(16))) WHERE "system_id" IS NULL;

-- Adicionar restrição de unicidade e definir system_id como NOT NULL
CREATE UNIQUE INDEX "patients_system_id_unique" ON "patients" ("system_id");

--
-- Criar a nova tabela de pacientes
--
CREATE TABLE IF NOT EXISTS "new_patients" (
    "system_id" varchar(50) NOT NULL UNIQUE,
    "patient_id" varchar(50) NOT NULL UNIQUE,
    "name" varchar(50) NOT NULL,
    "specie" varchar(50) NOT NULL,
    "breed" varchar(50) NOT NULL,
    "birth_date" date NOT NULL, 
    "status" varchar(10) NOT NULL,
    "owner_id" varchar(50) NOT NULL REFERENCES "owners" ("owner_id") DEFERRABLE INITIALLY DEFERRED
);

-- Copiar dados da tabela antiga para a nova tabela
INSERT INTO "new_patients" ("patient_id", "name", "specie", "breed", "birth_date", "status", "owner_id", "system_id")
SELECT "patient_id", "name", "specie", "breed", "birth_date", "status", CAST("owner_id" AS TEXT), "system_id"
FROM "patients";

-- Apagar a tabela antiga e renomear a nova tabela
DROP TABLE IF EXISTS "patients";
ALTER TABLE "new_patients" RENAME TO "patients";


-------------------------------------------------

-- Adicionar coluna system_id à tabela hospitalizations
ALTER TABLE "hospitalizations" ADD COLUMN "system_id" varchar(50) NULL;
UPDATE "hospitalizations" SET system_id = (SELECT "system_id" FROM "patients" WHERE "patients"."patient_id" = "hospitalizations"."patient_id");

--
-- Criar a nova tabela de hospitalizações
--
CREATE TABLE IF NOT EXISTS "new_hospitalizations" (
    "hospitalization_id" bigint NOT NULL UNIQUE,
    "system_id" varchar(50) NOT NULL REFERENCES "patients" ("system_id") DEFERRABLE INITIALLY DEFERRED,
    "weight" integer NOT NULL,
    "complaints" text NOT NULL CHECK ((JSON_VALID("complaints") OR "complaints" IS NULL)),
    "diagnostics" text NOT NULL CHECK ((JSON_VALID("diagnostics") OR "diagnostics" IS NULL)),
    "entry_date" datetime NOT NULL,
    "discharge_date" datetime,
    "status" varchar(10) NOT NULL
);

-- Copiar dados da tabela antiga para a nova tabela
INSERT INTO "new_hospitalizations" ("hospitalization_id", "weight", "complaints", "diagnostics", "entry_date", "discharge_date", "status", "system_id")
SELECT "hospitalization_id", "weight", "complaints", "diagnostics", "entry_date", "discharge_date", "status", CAST("system_id" AS TEXT) FROM "hospitalizations";

-- Apagar a tabela antiga e renomear a nova tabela
DROP TABLE IF EXISTS "hospitalizations";
ALTER TABLE "new_hospitalizations" RENAME TO "hospitalizations";


-------------------------------------------------

-- Adicionar coluna system_id à tabela rounds
ALTER TABLE "rounds" ADD COLUMN "system_id" varchar(50) NULL;
UPDATE "rounds" SET system_id = (SELECT "system_id" FROM "patients" WHERE "patients"."patient_id" = "rounds"."patient_id");

-- 
-- Criar a nova tabela de rondas
-- 
CREATE TABLE IF NOT EXISTS "new_rounds" (
    "round_id" varchar(50) NOT NULL UNIQUE,
    "system_id" varchar(50) NOT NULL REFERENCES "patients" ("system_id") DEFERRABLE INITIALLY DEFERRED
);

-- Copiar dados da tabela antiga para a nova tabela
INSERT INTO "new_rounds" ("round_id", "system_id") SELECT "round_id", "system_id" FROM "rounds";

-- Apagar a tabela antiga e renomear a nova tabela
DROP TABLE IF EXISTS "rounds";
ALTER TABLE "new_rounds" RENAME TO "rounds";


-------------------------------------------------

-- Adicionar coluna system_id à tabela alerts
ALTER TABLE "alerts" ADD COLUMN "system_id" varchar(50) NULL;
UPDATE "alerts" SET system_id = (SELECT "system_id" FROM "patients" WHERE "patients"."patient_id" = "alerts"."patient_id");

--
-- Criar a nova tabela de alertas
--
CREATE TABLE IF NOT EXISTS "new_alerts" (
    "alert_id" varchar(50) NOT NULL UNIQUE,
    "parameters" text NOT NULL CHECK ((JSON_VALID("parameters") OR "parameters" IS NULL)),
    "repeat_every" integer NOT NULL,
    "time" datetime NOT NULL,
    "comments" text NOT NULL,
    "status" varchar(10) NOT NULL,
    "system_id" varchar(50) NOT NULL REFERENCES "patients" ("system_id") DEFERRABLE INITIALLY DEFERRED
);

-- Copiar dados da tabela antiga para a nova tabela
INSERT INTO "new_alerts" ("alert_id", "parameters", "repeat_every", "time", "comments", "status", "system_id")
SELECT "alert_id", "parameters", "repeat_every", "time", "comments", "status", CAST("system_id" AS TEXT) FROM "alerts";

-- Apagar a tabela antiga e renomear a nova tabela
DROP TABLE IF EXISTS "alerts";
ALTER TABLE "new_alerts" RENAME TO "alerts";

-------------------------------------------------

-- Remover a coluna days da tabela budgets
ALTER TABLE "budgets" DROP COLUMN "days";

CREATE INDEX IF NOT EXISTS "alerts_system_id_idx" ON "alerts" ("system_id");
CREATE INDEX IF NOT EXISTS "patients_owner_id_idx" ON "patients" ("owner_id");
CREATE INDEX IF NOT EXISTS "hospitalizations_system_id_idx" ON "hospitalizations" ("system_id");
CREATE INDEX IF NOT EXISTS "rounds_system_id_idx" ON "rounds" ("system_id");

COMMIT;


