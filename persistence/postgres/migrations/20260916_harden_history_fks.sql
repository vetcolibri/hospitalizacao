-- RF-16 — protege o histórico clínico de uma hospitalização contra eliminação
-- em cascata.
--
-- Encerrar uma hospitalização NUNCA pode apagar os seus dados. Se alguém
-- tentar eliminar o episódio (por engano ou por limpeza de dados), o banco tem
-- de BLOQUEAR enquanto existirem orçamento, rondas/exames ou relatórios ligados
-- a esse episódio. Só depois de remover explicitamente os filhos (com revisão
-- humana) é que o episódio pode ser eliminado.
--
-- A migração normaliza as três chaves estrangeiras para ON DELETE RESTRICT:
--   * reports.hospitalization_id -> hospitalizations
--   * rounds.hospitalization_id  -> hospitalizations
--   * budgets.hospitalization_id -> hospitalizations
--
-- É estritamente idempotente e não altera dados: apenas troca a regra da FK
-- quando ela ainda estiver em CASCADE (ou outra regra diferente de RESTRICT).

BEGIN;

DO $$
BEGIN
    -- reports (só normaliza se a coluna já existir; em BDs antigas pode faltar).
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reports' AND column_name = 'hospitalization_id'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'fk_reports_hospitalizations' AND confdeltype <> 'r'
        ) THEN
            ALTER TABLE reports DROP CONSTRAINT fk_reports_hospitalizations;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_reports_hospitalizations'
        ) THEN
            ALTER TABLE reports
                ADD CONSTRAINT fk_reports_hospitalizations
                FOREIGN KEY (hospitalization_id)
                REFERENCES hospitalizations(hospitalization_id)
                ON DELETE RESTRICT;
        END IF;
    END IF;

    -- rounds
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rounds' AND column_name = 'hospitalization_id'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'fk_rounds_hospitalizations' AND confdeltype <> 'r'
        ) THEN
            ALTER TABLE rounds DROP CONSTRAINT fk_rounds_hospitalizations;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_rounds_hospitalizations'
        ) THEN
            ALTER TABLE rounds
                ADD CONSTRAINT fk_rounds_hospitalizations
                FOREIGN KEY (hospitalization_id)
                REFERENCES hospitalizations(hospitalization_id)
                ON DELETE RESTRICT;
        END IF;
    END IF;

    -- budgets
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_budgets_hospitalizations' AND confdeltype <> 'r'
    ) THEN
        ALTER TABLE budgets DROP CONSTRAINT fk_budgets_hospitalizations;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_budgets_hospitalizations'
    ) THEN
        ALTER TABLE budgets
            ADD CONSTRAINT fk_budgets_hospitalizations
            FOREIGN KEY (hospitalization_id)
            REFERENCES hospitalizations(hospitalization_id)
            ON DELETE RESTRICT;
    END IF;
END
$$;

COMMIT;
