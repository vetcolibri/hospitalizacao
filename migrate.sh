#!/usr/bin/env bash
#
# migrate.sh — aplica a cadeia de migrations a uma base de dados antiga.
#
# Uso:
#   ./migrate.sh '<postgresql-url>'
#
# Seguro por defeito:
#   - valida exactamente um argumento e o scheme postgres://postgresql://;
#   - nunca imprime nem regista o URL (nem em caso de erro);
#   - aplica PRIMEIRO as migrations aditivas/hardening e SÓ DEPOIS os backfills;
#   - se um backfill fail-safe recusar legado ambíguo/impossível, sai não-zero,
#     não tenta o backfill seguinte e aponta para
#     tools/legacy_classification/README.md — nunca adivinha associações.
#
# Pode ser reexecutado com segurança: as migrations são idempotentes.
# Requer: bash e psql. O destino é decidido apenas pelo URL recebido.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/persistence/postgres/migrations"

usage() {
	printf 'Uso: %s %s\n' "${0##*/}" "'postgresql-url'" >&2
	printf 'Exemplo: ./migrate.sh "postgresql://utilizador:password@host:5432/base"\n' >&2
}

fail() {
	printf 'ERRO: %s\n' "$1" >&2
	exit "${2:-1}"
}

# --- 1) validar exactamente um argumento e o scheme (sem expor credenciais) --
if [ "$#" -ne 1 ]; then
	usage
	exit 2
fi

url="$1"

case "$url" in
	postgres://* | postgresql://*) ;;
	*)
		printf 'ERRO: o argumento tem de ser um URL postgres:// ou postgresql://.\n' >&2
		exit 2
		;;
esac

# --- 2) exigir psql ----------------------------------------------------------
command -v psql >/dev/null 2>&1 || fail "psql não encontrado no PATH." 3

# --- helpers -----------------------------------------------------------------
run_migration() {
	local file="$1"
	printf '==> %s\n' "$file"
	if ! psql "$url" -X -q -w -v ON_ERROR_STOP=1 -f "$MIGRATIONS_DIR/$file"; then
		fail "a migration $file falhou." 1
	fi
}

run_backfill() {
	local file="$1"
	printf '==> %s\n' "$file"
	if ! psql "$url" -X -q -w -v ON_ERROR_STOP=1 -f "$MIGRATIONS_DIR/$file"; then
		printf '\n' >&2
		printf 'ERRO: o backfill %s recusou legado por classificar (ambíguo ou impossível).\n' "$file" >&2
		printf 'Nenhum registo foi alterado por este backfill e o backfill seguinte NÃO foi tentado.\n' >&2
		printf 'Classifique manualmente seguindo tools/legacy_classification/README.md\n' >&2
		exit 1
	fi
}

# --- 3) aditivas/hardening PRIMEIRO (ordem operacional segura) ---------------
run_migration "20260626_associate_reports_hospitalizations.sql"
run_migration "20260915_add_rounds_hospitalization_link.sql"
run_migration "20260916_add_hospitalization_contact.sql"
run_migration "20260916_harden_history_fks.sql"

# --- 4) backfills fail-safe SÓ DEPOIS ----------------------------------------
run_backfill "20260626_backfill_reports_hospitalization.sql"
run_backfill "20260915_backfill_rounds_hospitalization.sql"

printf 'OK: migrations aplicadas.\n'
