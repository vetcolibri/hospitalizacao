-- RF-15 / RF-16 — Fase 1: associa as rondas históricas à hospitalização correcta.
--
-- Regra de associação (sem adivinhar):
--   uma ronda pertence à hospitalização do MESMO doente cujo intervalo
--   [entry_date, coalesce(discharge_date, today)] contém, com granularidade de
--   DIA, todas as datas das suas medições.
--   O dia é a granularidade usada porque as hospitalizações deste dump não têm
--   hora fiável (99 fechadas sem discharge_date); a hora exacta deixaria de
--   fora episódios claramente válidos.
--
-- A migração é fail-safe: se existir pelo menos uma ronda sem hospitalização
-- possível (0 candidatos) ou ambígua (2+ candidatos), falha com diagnóstico e
-- o BEGIN/COMMIT garante que NENHUM dado é alterado. As rondas problemáticas
-- têm de ser resolvidas manualmente (datas da hospitalização) antes de repetir.
--
-- Idempotente: só avalia rondas ainda por associar.

BEGIN;

-- Candidatos de cada ronda por dia das medições vs. intervalo da hospitalização.
CREATE TEMP TABLE round_windows ON COMMIT DROP AS
SELECT
    r.round_id,
    r.system_id,
    min(m.issued_at)::date AS first_measurement_day,
    max(m.issued_at)::date AS last_measurement_day,
    count(m.name) AS measurement_count
FROM rounds r
LEFT JOIN measurements m ON m.round_id = r.round_id
WHERE r.hospitalization_id IS NULL
GROUP BY r.round_id, r.system_id;

CREATE TEMP TABLE round_candidates ON COMMIT DROP AS
SELECT
    w.round_id,
    w.first_measurement_day,
    w.last_measurement_day,
    w.measurement_count,
    w.system_id,
    h.hospitalization_id
FROM round_windows w
JOIN hospitalizations h
    ON h.system_id = w.system_id
    AND w.first_measurement_day >= h.entry_date::date
    AND w.last_measurement_day <= coalesce(h.discharge_date, current_date)::date;

-- Diagnóstico antes de escrever seja o que for.
DO $$
DECLARE
    total_rounds integer;
    ambiguous integer;
    impossible integer;
    detail text;
BEGIN
    SELECT count(*) INTO total_rounds FROM round_windows;

    SELECT count(*) INTO ambiguous
    FROM (
        SELECT round_id FROM round_candidates GROUP BY round_id HAVING count(*) > 1
    ) a;

    SELECT count(*) INTO impossible
    FROM round_windows w
    WHERE NOT EXISTS (SELECT 1 FROM round_candidates c WHERE c.round_id = w.round_id);

    IF ambiguous = 0 AND impossible = 0 THEN
        RAISE NOTICE 'rounds hospitalization backfill: % rondas associáveis sem ambiguidade', total_rounds;
        RETURN;
    END IF;

    SELECT string_agg(problem, E'\n') INTO detail
    FROM (
        (SELECT 'AMBIGUA round=' || c.round_id || ' doente=' || c.system_id
            || ' dia=' || c.first_measurement_day
            || ' hospitalizacoes=[' || string_agg(c.hospitalization_id, ',' ORDER BY c.hospitalization_id) || ']'
            AS problem
        FROM round_candidates c
        GROUP BY c.round_id, c.system_id, c.first_measurement_day
        HAVING count(*) > 1
        LIMIT 20)

        UNION ALL

        (SELECT 'IMPOSSIVEL round=' || w.round_id || ' doente=' || w.system_id
            || ' dias=[' || coalesce(w.first_measurement_day::text,'sem-medicoes') || '..'
            || coalesce(w.last_measurement_day::text,'sem-medicoes') || ']'
            AS problem
        FROM round_windows w
        WHERE NOT EXISTS (SELECT 1 FROM round_candidates c WHERE c.round_id = w.round_id)
        LIMIT 20)
    ) problems;

    RAISE EXCEPTION
        E'associação de rondas a hospitalizações abortada: % rondas ambíguas, % sem hospitalização no intervalo das medições.\nNenhum registo foi alterado. Resolver as datas das hospitalizações (ou as rondas) e repetir.\nExemplos (max 20 por tipo):\n%',
        ambiguous, impossible, coalesce(detail, '(detalhe indisponível)');
END
$$;

-- Só chegamos aqui com exactly one candidate per round.
UPDATE rounds r
SET hospitalization_id = c.hospitalization_id
FROM (
    SELECT DISTINCT ON (round_id) round_id, hospitalization_id
    FROM round_candidates
    ORDER BY round_id, hospitalization_id
) c
WHERE r.round_id = c.round_id
    AND r.hospitalization_id IS NULL;

ALTER TABLE rounds ALTER COLUMN hospitalization_id SET NOT NULL;

COMMIT;
