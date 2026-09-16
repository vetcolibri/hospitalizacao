# Migrations — cadeia, rollout e rollback

Guia reprodutível para aplicar (rollout) e reverter (rollback) as migrations do
Postgres. Complementa `schema.sql` (instalação nova) e o workflow de
classificação manual em `../../tools/legacy_classification/README.md`.

## Cadeia canónica

Ordem lexicográfica do nome do ficheiro. Cada migration é **idempotente** e
deve ser aplicada com `ON_ERROR_STOP=1` (aborta ao primeiro erro).

| # | Ficheiro | Tipo | Efeito |
|---|----------|------|--------|
| 1 | `20260626_associate_reports_hospitalizations.sql` | aditiva | `reports.hospitalization_id` (nullable) + FK RESTRICT + índice |
| 2 | `20260626_backfill_reports_hospitalization.sql` | backfill fail-safe | associa relatórios por intervalo temporal **exacto** e só então `SET NOT NULL`; **aborta sem alterar nada** se houver 0 ou 2+ candidatos |
| 3 | `20260915_add_rounds_hospitalization_link.sql` | aditiva | `rounds.hospitalization_id` (nullable) + FK RESTRICT + índices |
| 4 | `20260915_backfill_rounds_hospitalization.sql` | backfill fail-safe | associa rondas por intervalo temporal **exacto** das medições e só então `SET NOT NULL`; aborta se ambíguo/impossível |
| 5 | `20260916_add_hospitalization_contact.sql` | aditiva | `contact_name` / `contact_phone_number` / `contact_whatsapp` (nullable) + CHECK de excepção completa |
| 6 | `20260916_harden_history_fks.sql` | hardening | normaliza para `ON DELETE RESTRICT` as FKs `reports`/`rounds`/`budgets` → `hospitalizations` |

Regras estruturais da cadeia:

- **Aditivas primeiro, backfill depois.** As colunas nascem nullable para a
  aplicação poder continuar a operar antes de classificar o legado.
- **O backfill é fail-safe.** Se existir legado ambíguo/impossível, aborta a
  transacção inteira e **não** altera dados. É o gatilho para a classificação
  manual.
- **`SET NOT NULL` só depois de `hospitalization_id IS NULL` contar 0.**
- **A ordem 3 antes de 1 não é obrigatória** (a migration 3 só cria o índice de
  relatórios se a coluna existir), mas mantém-se a ordem da tabela para
  reprodutibilidade.
- `schema.sql` já reflecte o estado final; numa instalação nova, aplicá-lo e
  depois a cadeia é um no-op idempotente.

## Pré-requisitos

1. **Backup verificado** da base de dados:
   ```bash
   pg_dump --format=custom --file=/tmp/cvl_before_migrations.dump "$DATABASE_URL"
   ```
2. Janela de manutenção: o backfill (2 e 4) bloqueia escrita enquanto corre.
3. `psql` disponível no ambiente de destino.

## Rollout

```bash
export DATABASE_URL="postgres://postgres:<password>@<host>:5432/cvl_hospitalizacao"

# 1..6, por ordem, abortando ao primeiro erro
for f in \
  20260626_associate_reports_hospitalizations.sql \
  20260626_backfill_reports_hospitalization.sql \
  20260915_add_rounds_hospitalization_link.sql \
  20260915_backfill_rounds_hospitalization.sql \
  20260916_add_hospitalization_contact.sql \
  20260916_harden_history_fks.sql
do
  echo "== $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "persistence/postgres/migrations/$f"
done
```

Se o passo 2 ou 4 abortar com `associação ... abortada`, **nada foi alterado**:
seguir o workflow de classificação manual, repetir o backfill e só então
continuar. Nunca forçar a associação.

## Verificação pós-rollout

```sql
-- 0 = pronto para NOT NULL / classificação concluída
SELECT count(*) FROM rounds  WHERE hospitalization_id IS NULL;
SELECT count(*) FROM reports WHERE hospitalization_id IS NULL;

-- FKs de histórico em RESTRICT ('r')
SELECT conname, confdeltype::text FROM pg_constraint
 WHERE conname IN (
   'fk_reports_hospitalizations',
   'fk_rounds_hospitalizations',
   'fk_budgets_hospitalizations'
 );

-- Colunas de contacto nullable
SELECT column_name, is_nullable FROM information_schema.columns
 WHERE table_name = 'hospitalizations' AND column_name LIKE 'contact_%';
```

Teste automático da cadeia: `deno test --no-check --allow-all
tests/integration/migrations_chain_restore.test.ts` (cria uma base descartável).

## Rollback

> Reverter migrations de histórico **não recupera dados apagados**; só muda
> esquema/regras. Fazer sempre backup antes.

| Migration | Rollback | Segurança |
|-----------|----------|-----------|
| 6 (hardening) | Repor a regra anterior da FK de orçamento: `ALTER TABLE budgets DROP CONSTRAINT fk_budgets_hospitalizations; ALTER TABLE budgets ADD CONSTRAINT fk_budgets_hospitalizations FOREIGN KEY (hospitalization_id) REFERENCES hospitalizations(hospitalization_id) ON DELETE CASCADE;` | Seguro tecnicamente, mas **reintroduz perda de dados em cascata**. Emergência apenas. `reports`/`rounds` já eram RESTRICT antes. |
| 5 (contacto) | `ALTER TABLE hospitalizations DROP CONSTRAINT IF EXISTS chk_hospitalizations_contact_complete; ALTER TABLE hospitalizations DROP COLUMN IF EXISTS contact_name, DROP COLUMN IF EXISTS contact_phone_number, DROP COLUMN IF EXISTS contact_whatsapp;` | Seguro; perde só as excepções de contacto opcionais. |
| 4 / 2 (`SET NOT NULL`) | `ALTER TABLE rounds ALTER COLUMN hospitalization_id DROP NOT NULL;` / `ALTER TABLE reports ALTER COLUMN hospitalization_id DROP NOT NULL;` | Seguro; as colunas e FKs mantêm-se. |
| 3 / 1 (aditivas) | **Não reverter.** Remover a coluna perderia a associação clínica já construída. Se for indispensável, parar a aplicação e restaurar do backup. | Perigoso. |
| 0 (backup) | Restaurar: `pg_restore --clean --if-exists --dbname="$DATABASE_URL" /tmp/cvl_before_migrations.dump` | Última linha de defesa. |

### Ordem de rollback recomendada

Se for necessário reverter um rollout completo, pela ordem inversa:
`6 → 5 → 4 (DROP NOT NULL) → 3/1 (parar; restaurar backup se indispensável) → 2 (DROP NOT NULL)`.
Na prática, para um incidente de produção o caminho preferido é **restaurar o
backup** em vez de reverter migrations de associação.
