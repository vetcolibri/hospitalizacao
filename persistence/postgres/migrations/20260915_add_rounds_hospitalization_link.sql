-- RF-15 / RF-16 — Fase 1: liga as rondas à hospitalização.
--
-- Migration estritamente aditiva: adiciona a coluna (nullable), a FK e os
-- indices de suporte ao historico. Nao altera nem apaga registos existentes,
-- por isso pode ser aplicada antes do backfill (20260915_backfill_rounds_hospitalization.sql)
-- e antes de a aplicacao comecar a escrever hospitalization_id nas novas rondas.
--
-- A FK usa ON DELETE RESTRICT de proposito: o historico clinico de uma
-- hospitalizacao (RF-16) nao pode ser eliminado em cascata por engano.

BEGIN;

ALTER TABLE rounds ADD COLUMN IF NOT EXISTS hospitalization_id VARCHAR(50);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_rounds_hospitalizations'
    ) THEN
        ALTER TABLE rounds
            ADD CONSTRAINT fk_rounds_hospitalizations
            FOREIGN KEY (hospitalization_id)
            REFERENCES hospitalizations(hospitalization_id)
            ON DELETE RESTRICT;
    END IF;
END
$$;

-- Hospitalizacoes de um paciente ordenadas pela data de entrada.
CREATE INDEX IF NOT EXISTS idx_hospitalizations_patient_entry_date
    ON hospitalizations (system_id, entry_date);

-- Rondas do episodio clinico.
CREATE INDEX IF NOT EXISTS idx_rounds_hospitalization
    ON rounds (hospitalization_id);

-- Relatorios do episodio, do mais recente para o mais antigo.
-- Condicionado: em bases de dados antigas a coluna so existe depois de
-- 20260626_associate_reports_hospitalizations.sql ter sido aplicada com sucesso.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reports' AND column_name = 'hospitalization_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_reports_hospitalization_created_at
            ON reports (hospitalization_id, created_at);
    ELSE
        RAISE NOTICE 'idx_reports_hospitalization_created_at ignorado: reports.hospitalization_id ainda nao existe (aplicar a migracao 20260626 primeiro)';
    END IF;
END
$$;

-- Orcamento do episodio.
CREATE INDEX IF NOT EXISTS idx_budgets_hospitalization
    ON budgets (hospitalization_id);

COMMIT;
