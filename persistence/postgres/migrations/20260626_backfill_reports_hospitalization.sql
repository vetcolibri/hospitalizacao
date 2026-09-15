-- RF-15 / RF-16 — Fase 1: associa os relatorios historicos a hospitalizacao correcta.
--
-- Regra de associacao (sem adivinhar): intervalo temporal EXACTO.
--   um relatorio pertence a hospitalizacao do MESMO doente cujo intervalo
--   [entry_date, coalesce(discharge_date, now())] contem, ao segundo,
--   o seu created_at.
--   Nao ha casamento por dia: um relatorio criado antes da hora de entrada
--   (ou depois da hora de alta) fica fora do intervalo e e tratado como
--   impossivel, porque associa-lo ao episodio "do mesmo dia" poderia colar
--   dados clinicos ao episodio errado.
--
-- A migracao e fail-safe: se existir pelo menos um relatorio sem hospitalizacao
-- possivel (0 candidatos) ou ambigua (2+ candidatos), falha com diagnostico e
-- o BEGIN/COMMIT garante que NENHUM dado e alterado. Os relatorios problematicos
-- tem de ser classificados manualmente (datas da hospitalizacao ou do relatorio)
-- antes de repetir.
--
-- Idempotente: so avalia relatorios ainda por associar. A parte aditiva
-- (coluna + FK RESTRICT + indice) vive em
-- 20260626_associate_reports_hospitalizations.sql.

BEGIN;

CREATE TEMP TABLE report_candidates ON COMMIT DROP AS
SELECT
    r.report_id,
    r.system_id,
    r.created_at,
    h.hospitalization_id
FROM reports r
JOIN hospitalizations h
    ON h.system_id = r.system_id
    AND r.created_at >= h.entry_date
    AND r.created_at <= coalesce(h.discharge_date, statement_timestamp())
WHERE r.hospitalization_id IS NULL;

-- Diagnostico antes de escrever seja o que for.
DO $$
DECLARE
    total integer;
    ambiguous integer;
    impossible integer;
    detail text;
BEGIN
    SELECT count(*) INTO total FROM reports WHERE hospitalization_id IS NULL;

    SELECT count(*) INTO ambiguous
    FROM (
        SELECT report_id FROM report_candidates GROUP BY report_id HAVING count(*) > 1
    ) a;

    SELECT count(*) INTO impossible
    FROM reports r
    WHERE r.hospitalization_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM report_candidates c WHERE c.report_id = r.report_id);

    IF ambiguous = 0 AND impossible = 0 THEN
        RAISE NOTICE 'reports hospitalization backfill: % relatórios associáveis sem ambiguidade', total;
        RETURN;
    END IF;

    SELECT string_agg(problem, E'\n') INTO detail
    FROM (
        (SELECT 'AMBIGUA report=' || c.report_id || ' doente=' || c.system_id
            || ' created_at=' || c.created_at::text
            || ' hospitalizacoes=[' || string_agg(c.hospitalization_id, ',' ORDER BY c.hospitalization_id) || ']'
            AS problem
        FROM report_candidates c
        GROUP BY c.report_id, c.system_id, c.created_at
        HAVING count(*) > 1
        LIMIT 20)

        UNION ALL

        (SELECT 'IMPOSSIVEL report=' || r.report_id || ' doente=' || r.system_id
            || ' created_at=' || r.created_at::text
            AS problem
        FROM reports r
        WHERE r.hospitalization_id IS NULL
          AND NOT EXISTS (SELECT 1 FROM report_candidates c WHERE c.report_id = r.report_id)
        LIMIT 20)
    ) problems;

    RAISE EXCEPTION
        E'associação de relatórios a hospitalizações abortada: % relatórios ambíguos, % fora do intervalo temporal exacto.\nNenhum registo foi alterado. Resolver as datas (hospitalização e/ou relatório) e repetir.\nExemplos (max 20 por tipo):\n%',
        ambiguous, impossible, coalesce(detail, '(detalhe indisponível)');
END
$$;

-- Aqui so chegamos quando cada relatorio tem exactamente uma candidata.
UPDATE reports r
SET hospitalization_id = c.hospitalization_id
FROM (
    SELECT DISTINCT ON (report_id) report_id, hospitalization_id
    FROM report_candidates
    ORDER BY report_id, hospitalization_id
) c
WHERE r.report_id = c.report_id
    AND r.hospitalization_id IS NULL;

ALTER TABLE reports ALTER COLUMN hospitalization_id SET NOT NULL;

COMMIT;
