-- RF-15 / RF-16 — Fase 1: liga os relatórios à hospitalização (parte ADITIVA).
--
-- Migration estritamente aditiva e idempotente: adiciona a coluna (nullable), a
-- FK e o indice de suporte, SEM tocar nos relatorios legados. Os relatorios
-- existentes ficam com hospitalization_id a NULL ate ao backfill separado
-- (20260626_backfill_reports_hospitalization.sql), que exige classificacao
-- manual dos casos impossiveis/ambiguos.
--
-- Isto desbloqueia a operacao corrente: a aplicacao passa a gravar TODO o
-- relatorio novo ja associado ao episodio activo, mesmo que centenas de
-- relatorios historicos continuem por classificar.
--
-- A FK usa ON DELETE RESTRICT de proposito: o historico clinico de uma
-- hospitalizacao (RF-16) nao pode ser eliminado em cascata por engano. Se
-- existir uma constraint com regra diferente (ex.: CASCADE), e normalizada de
-- forma segura (drop + re-add), sem alterar dados.

BEGIN;

ALTER TABLE reports ADD COLUMN IF NOT EXISTS hospitalization_id VARCHAR(50);

DO $$
BEGIN
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
END
$$;

-- Relatorios do episodio, do mais recente para o mais antigo.
CREATE INDEX IF NOT EXISTS idx_reports_hospitalization_created_at
    ON reports (hospitalization_id, created_at);

COMMIT;
