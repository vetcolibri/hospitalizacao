# Migrations — cadeia, rollout e rollback

Guia reprodutível para aplicar (rollout) e reverter (rollback) as migrations do
Postgres. Complementa `schema.sql` (instalação nova) e o workflow de
classificação manual em `../../tools/legacy_classification/README.md`.

## Migrations

Cada migration é **idempotente** e deve ser aplicada com `ON_ERROR_STOP=1`
(aborta ao primeiro erro). A **ordem de aplicação é por fases**, não a
lexicográfica: primeiro as aditivas/hardening (A), só depois os backfills (B).

| Fase | Ficheiro | Tipo | Efeito |
|------|----------|------|--------|
| A | `20260626_associate_reports_hospitalizations.sql` | aditiva | `reports.hospitalization_id` (nullable) + FK RESTRICT + índice |
| A | `20260915_add_rounds_hospitalization_link.sql` | aditiva | `rounds.hospitalization_id` (nullable) + FK RESTRICT + índices |
| A | `20260916_add_hospitalization_contact.sql` | aditiva | `contact_name` / `contact_phone_number` / `contact_whatsapp` (nullable) + CHECK de excepção completa |
| A | `20260916_harden_history_fks.sql` | hardening | normaliza para `ON DELETE RESTRICT` as FKs `reports`/`rounds`/`budgets` → `hospitalizations` |
| B | `20260626_backfill_reports_hospitalization.sql` | backfill fail-safe | associa relatórios por intervalo temporal **exacto** e só então `SET NOT NULL`; **aborta sem alterar nada** se houver 0 ou 2+ candidatos |
| B | `20260915_backfill_rounds_hospitalization.sql` | backfill fail-safe | associa rondas por intervalo temporal **exacto** das medições e só então `SET NOT NULL`; aborta se ambíguo/impossível |

Regras estruturais da cadeia:

- **Aditivas/hardening sempre primeiro.** Todas as colunas e FKs da fase A
  existem antes de qualquer backfill; o esquema fica consistente mesmo que um
  backfill aborte.
- **Os backfills só depois, e um de cada vez.** Se um falhar, o seguinte **não**
  é tentado.
- **O backfill é fail-safe.** Se existir legado ambíguo/impossível, aborta a
  transacção inteira e **não** altera dados. É o gatilho para a classificação
  manual.
- **`SET NOT NULL` só depois de `hospitalization_id IS NULL` contar 0.**
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

### Forma recomendada — script

O script resolve as migrations pela sua própria localização (funciona de
qualquer `cwd`), valida o argumento, exige `psql` e **nunca imprime o URL**:

```bash
./migrate.sh 'postgres://postgres:<password>@<host>:5432/cvl_hospitalizacao'
```

Aplica a fase A (aditivas/hardening) e só depois os backfills da fase B. Se um
backfill recusar legado por classificar, sai não-zero, **não tenta o backfill
seguinte** e aponta para `tools/legacy_classification/README.md`. Pode ser
reexecutado depois de aplicar um mapping aprovado (migrations idempotentes).

### Forma manual (equivalente)

Se não puder usar o script, aplicar exactamente nesta ordem e abortar ao
primeiro erro:

```bash
export DATABASE_URL="postgres://postgres:<password>@<host>:5432/cvl_hospitalizacao"

# Fase A — aditivas/hardening
echo "== Fase A"
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f 20260626_associate_reports_hospitalizations.sql
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f 20260915_add_rounds_hospitalization_link.sql
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f 20260916_add_hospitalization_contact.sql
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f 20260916_harden_history_fks.sql

# Fase B — backfills fail-safe (só depois da fase A)
echo "== Fase B"
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f 20260626_backfill_reports_hospitalization.sql
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f 20260915_backfill_rounds_hospitalization.sql
```

Se um backfill abortar com `associação ... abortada`, **nada foi alterado por
esse backfill**: seguir o workflow de classificação manual, repetir o backfill e
só então continuar. Nunca forçar a associação.

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

Testes automáticos (criam bases descartáveis):

```bash
deno test --no-check --allow-all tests/integration/migrations_chain_restore.test.ts
deno test --no-check --allow-all tests/integration/migrate_script.test.ts
```

## Rollback

> Reverter migrations de histórico **não recupera dados apagados**; só muda
> esquema/regras. Fazer sempre backup antes.

| Migration | Rollback | Segurança |
|-----------|----------|-----------|
| B2 `rounds` `SET NOT NULL` | `ALTER TABLE rounds ALTER COLUMN hospitalization_id DROP NOT NULL;` | Seguro; a coluna e a FK mantêm-se. |
| B1 `reports` `SET NOT NULL` | `ALTER TABLE reports ALTER COLUMN hospitalization_id DROP NOT NULL;` | Seguro; a coluna e a FK mantêm-se. |
| A4 hardening | Repor a regra anterior da FK de orçamento: `ALTER TABLE budgets DROP CONSTRAINT fk_budgets_hospitalizations; ALTER TABLE budgets ADD CONSTRAINT fk_budgets_hospitalizations FOREIGN KEY (hospitalization_id) REFERENCES hospitalizations(hospitalization_id) ON DELETE CASCADE;` | Seguro tecnicamente, mas **reintroduz perda de dados em cascata**. Emergência apenas. `reports`/`rounds` já eram RESTRICT antes, não mudam. |
| A3 contacto | `ALTER TABLE hospitalizations DROP CONSTRAINT IF EXISTS chk_hospitalizations_contact_complete; ALTER TABLE hospitalizations DROP COLUMN IF EXISTS contact_name, DROP COLUMN IF EXISTS contact_phone_number, DROP COLUMN IF EXISTS contact_whatsapp;` | Seguro; perde só as excepções de contacto opcionais. |
| A2 `rounds` link | **Não reverter.** | Remover a coluna perderia a associação das rondas. Repor do backup se indispensável. |
| A1 `reports` link | **Não reverter.** | Remover a coluna perderia a associação dos relatórios. Repor do backup se indispensável. |
| Backup | Restaurar: `pg_restore --clean --if-exists --dbname="$DATABASE_URL" /tmp/cvl_before_migrations.dump` | Última linha de defesa. |

### Ordem de rollback (estritamente inversa do rollout)

O rollout é `A1 → A2 → A3 → A4 → B1 → B2`; o rollback é exactamente o inverso:

1. **B2 `rounds` `SET NOT NULL`:** `DROP NOT NULL`.
2. **B1 `reports` `SET NOT NULL`:** `DROP NOT NULL`.
3. **A4 hardening:** repor a FK de orçamento (emergência).
4. **A3 contacto:** remover as três colunas e o CHECK.
5. **A2 `rounds` link:** **não é reversível em segurança**; parar aqui e, se for
   mesmo necessário voltar atrás, restaurar o backup (não apagar a coluna).
6. **A1 `reports` link:** **não é reversível em segurança**; restaurar o backup.

Os passos 5 e 6 são os únicos que interrompem a sequência, porque apagar uma
coluna de associação destruiria dados clínicos. Fora desse caso, cada passo é o
inverso do passo correspondente do rollout. Na prática, a partir do passo 5 o
procedimento preferido é **restaurar o backup**, não continuar a reverter
migrations.
