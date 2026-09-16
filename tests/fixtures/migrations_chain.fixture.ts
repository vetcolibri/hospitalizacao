const MIGRATIONS_DIR = new URL("../../persistence/postgres/migrations/", import.meta.url);

/**
 * Cadeia canónica de migrations, por ordem lexicográfica do nome (a mesma
 * ordem documentada em persistence/postgres/migrations/README.md).
 */
export const MIGRATIONS_CHAIN = [
	"20260626_associate_reports_hospitalizations.sql",
	"20260626_backfill_reports_hospitalization.sql",
	"20260915_add_rounds_hospitalization_link.sql",
	"20260915_backfill_rounds_hospitalization.sql",
	"20260916_add_hospitalization_contact.sql",
	"20260916_harden_history_fks.sql",
].map((file) => ({
	file,
	sql: Deno.readTextFileSync(new URL(file, MIGRATIONS_DIR)),
}));

/**
 * Base legada ANTES de qualquer associação (estado anterior a 2026-06-26):
 * sem `reports.hospitalization_id`, sem `rounds.hospitalization_id`, sem
 * colunas de contacto e com as três FKs em CASCADE. Todos os registos são
 * associáveis sem ambiguidade, para o backfill poder correr até ao fim.
 */
export const LEGACY_CHAIN_FIXTURE = `
CREATE TABLE owners (
    owner_id VARCHAR(50) NOT NULL UNIQUE, name VARCHAR(50) NOT NULL,
    phone_number VARCHAR(9) NOT NULL, whatsapp BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY(owner_id));

CREATE TABLE patients (
    system_id VARCHAR(50) NOT NULL UNIQUE, patient_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL, specie VARCHAR(50) NOT NULL, breed VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL, birth_date DATE NOT NULL, owner_id VARCHAR(50) NOT NULL,
    PRIMARY KEY(system_id),
    CONSTRAINT fk_patients_owners FOREIGN KEY (owner_id) REFERENCES owners(owner_id) ON DELETE CASCADE);

CREATE TABLE hospitalizations (
    hospitalization_id VARCHAR(50) NOT NULL UNIQUE, weight NUMERIC(5,2) NOT NULL,
    complaints JSON NOT NULL, diagnostics JSON NOT NULL, entry_date TIMESTAMP NOT NULL,
    discharge_date TIMESTAMP, status VARCHAR(50) NOT NULL, system_id VARCHAR(50) NOT NULL,
    PRIMARY KEY(hospitalization_id),
    CONSTRAINT fk_hospitalizations_patients FOREIGN KEY (system_id) REFERENCES patients(system_id) ON DELETE CASCADE);

CREATE TABLE budgets (
    budget_id VARCHAR(50) NOT NULL UNIQUE, start_on TIMESTAMP NOT NULL, end_on TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL, hospitalization_id VARCHAR(50) NOT NULL, PRIMARY KEY(budget_id),
    CONSTRAINT fk_budgets_hospitalizations FOREIGN KEY (hospitalization_id)
        REFERENCES hospitalizations(hospitalization_id) ON DELETE CASCADE);

CREATE TABLE reports (
    report_id VARCHAR(50) NOT NULL UNIQUE, state_of_consciousness JSON NOT NULL,
    food_types JSON NOT NULL, food_level VARCHAR(1), food_date TIMESTAMP NOT NULL,
    comments TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    system_id VARCHAR(50) NOT NULL, PRIMARY KEY(report_id),
    CONSTRAINT fk_reports_patients FOREIGN KEY (system_id) REFERENCES patients(system_id) ON DELETE CASCADE);

CREATE TABLE discharges (
    id SERIAL PRIMARY KEY, type VARCHAR(50) NOT NULL, aspects JSON NOT NULL, report_id VARCHAR(50) NOT NULL,
    CONSTRAINT fk_discharges_reports FOREIGN KEY (report_id) REFERENCES reports(report_id) ON DELETE CASCADE);

CREATE TABLE rounds (
    round_id VARCHAR(50) NOT NULL UNIQUE, system_id VARCHAR(50) NOT NULL, PRIMARY KEY(round_id),
    CONSTRAINT fk_rounds_patients FOREIGN KEY (system_id) REFERENCES patients(system_id) ON DELETE CASCADE);

CREATE TABLE measurements (
    name VARCHAR(50) NOT NULL, value VARCHAR(50) NOT NULL, issued_at TIMESTAMP NOT NULL,
    round_id VARCHAR(50) NOT NULL,
    FOREIGN KEY (round_id) REFERENCES rounds(round_id) ON DELETE CASCADE);

INSERT INTO owners VALUES ('o1','Tutor de teste','900000000',true);
INSERT INTO patients VALUES ('sys1','CLINIC1','Rex','CANINO','bulldog','ALTA MEDICA','2013-07-01','o1');
INSERT INTO hospitalizations VALUES
    ('h1',12,'["Queixa"]','["Diagnostico"]','2026-01-01 08:00:00','2026-01-05 08:00:00','Fechada','sys1'),
    ('h2',14,'["Queixa"]','["Diagnostico"]','2026-02-01 08:00:00',NULL,'Aberta','sys1');
INSERT INTO budgets VALUES ('b1','2026-01-01 08:00:00','2026-01-05 08:00:00','PAGO','h1');
INSERT INTO reports (report_id, state_of_consciousness, food_types, food_level, food_date, comments, created_at, system_id)
    VALUES ('rp1','["alerta"]','["racao"]','A','2026-01-02 09:00:00','r1','2026-01-02 09:00:00','sys1'),
           ('rp2','["alerta"]','["racao"]','A','2026-02-02 09:00:00','r2','2026-02-02 09:00:00','sys1');
INSERT INTO rounds (round_id, system_id) VALUES ('rd1','sys1'),('rd2','sys1');
INSERT INTO measurements (name, value, issued_at, round_id) VALUES
    ('heartRate','100','2026-01-03 09:00:00','rd1'),
    ('heartRate','120','2026-02-03 09:00:00','rd2');
`;
