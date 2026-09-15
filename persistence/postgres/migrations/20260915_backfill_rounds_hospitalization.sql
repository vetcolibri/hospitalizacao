-- RF-15 / RF-16 — Fase 1: associa as rondas históricas à hospitalização correcta.
--
-- Regra de associação (sem adivinhar): intervalo temporal EXACTO.
--   uma ronda pertence à hospitalização do MESMO doente cujo intervalo
--   [entry_date, coalesce(discharge_date, now())] contém, ao segundo,
--   todas as datas das suas medições.
--   Não há casamento por dia: uma medição registada antes da hora de entrada
--   (ou depois da hora de alta) fica fora do intervalo e é tratada como
--   impossível, porque atribuí-la ao episódio "do mesmo dia" poderia colar
--   dados clínicos ao episódio errado.
--
-- A migração é fail-safe: se existir pelo menos uma ronda sem hospitalização
-- possível (0 candidatos) ou ambígua (2+ candidatos), falha com diagnóstico e
-- o BEGIN/COMMIT garante que NENHUM dado é alterado. As rondas problemáticas
-- têm de ser resolvidas manualmente (datas da hospitalização ou da medição)
-- antes de repetir.
--
-- Idempotente: só avalia rondas ainda por associar.

BEGIN;

-- Candidatos de cada ronda: timestamps exactos das medições vs. intervalo da
-- hospitalização.
CREATE TEMP TABLE round_windows ON COMMIT DROP AS
SELECT
    r.round_id,
    r.system_id,
    min(m.issued_at) AS first_measurement,
    max(m.issued_at) AS last_measurement
FROM rounds r
LEFT JOIN measurements m ON m.round_id = r.round_id
WHERE r.hospitalization_id IS NULL
GROUP BY r.round_id, r.system_id;

CREATE TEMP TABLE round_candidates ON COMMIT DROP AS
SELECT
    w.round_id,
    w.first_measurement,
    w.last_measurement,
    w.system_id,
    h.hospitalization_id
FROM round_windows w
JOIN hospitalizations h
    ON h.system_id = w.system_id
    AND w.first_measurement >= h.entry_date
    AND w.last_measurement <= coalesce(h.discharge_date, statement_timestamp());

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
            || ' medições=[' || min(c.first_measurement)::text || ' .. ' || max(c.last_measurement)::text || ']'
            || ' hospitalizacoes=[' || string_agg(c.hospitalization_id, ',' ORDER BY c.hospitalization_id) || ']'
            AS problem
        FROM round_candidates c
        GROUP BY c.round_id, c.system_id
        HAVING count(*) > 1
        LIMIT 20)

        UNION ALL

        (SELECT 'IMPOSSIVEL round=' || w.round_id || ' doente=' || w.system_id
            || ' medições=[' || coalesce(w.first_measurement::text,'sem-medicoes') || ' .. '
            || coalesce(w.last_measurement::text,'sem-medicoes') || ']'
            AS problem
        FROM round_windows w
        WHERE NOT EXISTS (SELECT 1 FROM round_candidates c WHERE c.round_id = w.round_id)
        LIMIT 20)
    ) problems;

    RAISE EXCEPTION
        E'associação de rondas a hospitalizações abortada: % rondas ambíguas, % fora do intervalo temporal exacto das medições.\nNenhum registo foi alterado. Resolver as datas (hospitalização e/ou medição) e repetir.\nExemplos (max 20 por tipo):\n%',
        ambiguous, impossible, coalesce(detail, '(detalhe indisponível)');
END
$$;

-- Aqui so chegamos quando cada ronda tem exactamente uma candidata.
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
