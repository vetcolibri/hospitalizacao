BEGIN TRANSACTION;

-- Migração: 2_migration.sql

--
-- Criar a tabela de relatórios
--
CREATE TABLE IF NOT EXISTS "reports" (
    "report_id" varchar(50) NOT NULL UNIQUE,
    "state_of_consciousness" text NOT NULL CHECK ((JSON_VALID("state_of_consciousness") OR "state_of_consciousness" IS NULL)),
    "food_type" text NOT NULL CHECK ((JSON_VALID("food_type") OR "food_type" IS NULL)),
    "food_level" varchar(1) NOT NULL,
    "food_date" datetime NOT NULL,
    "discharge_type" varchar(25) NOT NULL,
    "discharge_aspect" varchar(25) NOT NULL,
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

COMMIT;