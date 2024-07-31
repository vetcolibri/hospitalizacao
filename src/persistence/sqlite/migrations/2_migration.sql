BEGIN TRANSACTION;

-- Migração: 2_migration.sql

--
-- Criar a tabela de relatórios
--
CREATE TABLE IF NOT EXISTS "reports" (
    "report_id" varchar(50) NOT NULL UNIQUE,
    "state_of_consciousness" text NOT NULL CHECK ((JSON_VALID("state_of_consciousness") OR "state_of_consciousness" IS NULL)),
    "food_types" text NOT NULL CHECK ((JSON_VALID("food_types") OR "food_types" IS NULL)),
    "food_level" varchar(1) NOT NULL,
    "food_date" datetime NOT NULL,
    "discharge_types" text NOT NULL CHECK ((JSON_VALID("discharge_types") OR "discharge_types" IS NULL)),
    "discharge_aspects" text NOT NULL CHECK ((JSON_VALID("discharge_aspects") OR "discharge_aspects" IS NULL)),
    "comments" text NOT NULL,
    "system_id" varchar(50) NOT NULL REFERENCES "patients" ("system_id") DEFERRABLE INITIALLY DEFERRED
);

--
-- Criar índice para o campo system_id
--
CREATE INDEX IF NOT EXISTS "reports_system_id_idx" ON "reports" ("system_id");


--
-- Adicionar a coluna "whatsapp" na tabela "owners"
--

ALTER TABLE "owners" ADD COLUMN "whatsapp" boolean NOT NULL DEFAULT 0;
ALTER TABLE "reports" ADD COLUMN "created_at" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;

COMMIT;