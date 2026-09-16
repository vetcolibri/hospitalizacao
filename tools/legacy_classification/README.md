# Classificação manual do legado (RF-15 / RF-16)

Ferramentas **read-only por defeito** para classificar as rondas e relatórios
antigos que ficaram com `hospitalization_id IS NULL` (legado por classificar).
Nada aqui adivinha associações: a decisão é sempre humana, identificada e
aprovada pelo CVL.

## Âmbito e limites

- O export só lê **identificadores, `system_id` e timestamps**. Nunca lê nem
  escreve nomes, telefones, comentários, estados de consciência, alimentação,
  descargas ou qualquer conteúdo clínico.
- O export real **não deve ser commitado** (ver `.gitignore`): contém dados do
  dump. Guarde-o fora do repositório (ex.: `/tmp/legacy_export.json`).
- Os scripts **não escrevem nada** sem `--apply` e sem `approved: true`.
- Os backfills SQL (`20260626_backfill_reports_hospitalization.sql`,
  `20260915_backfill_rounds_hospitalization.sql`) continuam a ser a alternativa
  automática, mas são *fail-safe*: abortam se houver ambiguidade. A via manual
  serve precisamente para os casos que o backfill automático não consegue
  decidir.

## Passo 1 — Export (read-only)

```bash
DATABASE_URL="postgres://postgres:<password>@127.0.0.1:54330/cvl_hospitalizacao" \
  deno run -A tools/legacy_classification/export_legacy.ts \
  > /tmp/legacy_export.json
```

Cada registo traz:

- `record_type` (`round` | `report`), `record_id`, `system_id`;
- `starts_at` / `ends_at` (ronda: primeira/última medição; relatório:
  `created_at`);
- `candidates`: episódios do mesmo paciente cujo intervalo contém exactamente o
  registo;
- `patient_hospitalizations`: todos os episódios do paciente, com intervalos,
  para os casos que precisem de avaliação/override.

## Passo 2 — Preencher o mapping (decisão humana)

Copie `mapping.template.json` para fora do repositório e preencha **uma entrada
por registo** do export. Para um caso temporalmente impossível (por exemplo,
medição anterior à entrada por erro de registo), preencha
`override_reason` com a justificação — idealmente confirmada pelo CVL.

Depois de revisto, registe a **aprovação identificada pelo CVL** (não é uma
assinatura criptográfica, é a identificação de quem aprovou e quando):

```json
{
  "version": 1,
  "approved": true,
  "reviewed_by": "<utilizador ou equipa do CVL>",
  "reviewed_at": "<ISO-8601 com fuso, ex.: 2026-09-15T11:00:00.000Z>",
  "entries": [ ... ]
}
```

`reviewed_by` tem de ser não vazio e `reviewed_at` tem de ser ISO-8601 com fuso
explícito e **não pode estar no futuro**. A aprovação sem estes dois campos é
recusada.

## Passo 3 — Dry-run (obrigatório)

```bash
DATABASE_URL="..." deno run -A tools/legacy_classification/apply_mapping.ts /tmp/legacy_mapping.json
```

O validador rejeita e **não escreve nada** se encontrar:

- `MAPPING_VERSION_MISMATCH` — versão desconhecida;
- `MAPPING_NOT_APPROVED` — `approved` não é `true`;
- `REVIEWED_BY_MISSING` — falta o reviewer que aprovou;
- `REVIEWED_AT_INVALID` — data de revisão em falta ou não ISO-8601 com fuso;
- `REVIEWED_AT_FUTURE` — data de revisão no futuro;
- `MISSING_FIELD` / `INVALID_RECORD_TYPE` — entrada incompleta/tipo inválido;
- `RECORD_NOT_FOUND` — id inexistente ou já classificado;
- `PATIENT_MISMATCH` — `system_id` do mapping diferente do registo;
- `HOSPITALIZATION_NOT_FOUND` — episódio inexistente;
- `HOSPITALIZATION_PATIENT_MISMATCH` — episódio de outro paciente;
- `TEMPORALLY_IMPOSSIBLE` — registo fora do intervalo sem `override_reason`;
- `INVALID_DATE` — datas impossíveis de interpretar;
- `DUPLICATE_RECORD` — o mesmo registo aparece mais de uma vez;
- `MAPPING_INCOMPLETE` — sobrou legado sem entrada.

O mapping é **revalidado contra os factos actuais da base de dados**: um export
antigo não serve para aplicar. O plano é apresentado sem qualquer escrita.

### Atomicidade

A leitura dos factos, a validação e **todos** os `UPDATE` correm na **mesma
transacção `SERIALIZABLE`**, aberta antes de qualquer leitura. Não existe janela
TOCTOU entre validar e escrever: o dry-run e qualquer recusa terminam com
`ROLLBACK`; qualquer erro a meio dos `UPDATE` desfaz tudo.

## Passo 4 — Aplicação transaccional

Só depois de o dry-run estar limpo e o mapping aprovado:

```bash
DATABASE_URL="..." deno run -A tools/legacy_classification/apply_mapping.ts /tmp/legacy_mapping.json --apply
```

- corre numa única transacção;
- só actualiza linhas ainda com `hospitalization_id IS NULL`;
- se qualquer `UPDATE` não afectar exactamente 1 linha, faz `ROLLBACK` e falha;
- no fim grava `COMMIT` e reporta `APPLIED` com o número de actualizações.

## Validação pós-aplicação

```sql
SELECT count(*) FROM rounds  WHERE hospitalization_id IS NULL;
SELECT count(*) FROM reports WHERE hospitalization_id IS NULL;
```

Só quando ambos forem `0` se pode avaliar um `SET NOT NULL` (fora do âmbito
destas ferramentas). Até lá, o `NOT NULL` **não** deve ser imposto.

## Testes

```bash
deno test --no-check --allow-all tests/unit/legacy_classification_validator.test.ts
deno test --no-check --allow-all tests/unit/legacy_classification_workflow.test.ts
```
