const MIGRATIONS_DIR = new URL("../../persistence/postgres/migrations/", import.meta.url);

export const REPORTS_MIGRATION = {
	link: Deno.readTextFileSync(
		new URL("20260626_associate_reports_hospitalizations.sql", MIGRATIONS_DIR),
	),
	backfill: Deno.readTextFileSync(
		new URL("20260626_backfill_reports_hospitalization.sql", MIGRATIONS_DIR),
	),
};

/**
 * Estado legado: relatórios anteriores à associação (RF-15), sem
 * `reports.hospitalization_id`. Inclui os três casos que obrigam a
 * classificação manual, exactamente como no dump real:
 *
 *  rp_strict -> created_at dentro do intervalo exacto de h1 (associável)
 *  rp_day    -> created_at 90min ANTES da entrada de h2, no mesmo dia:
 *               fica fora do intervalo exacto e por isso é IMPOSSÍVEL
 *  rp_ambig  -> created_at dentro de h3 e h4 sobrepostas -> AMBÍGUA
 *  rp_orphan -> fora do intervalo de qualquer internamento -> IMPOSSÍVEL
 */
export const LEGACY_REPORTS_FIXTURE = `
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

INSERT INTO owners VALUES ('o1','Tutor de teste','900000000',true);

INSERT INTO patients VALUES
 ('p1','PID1','P1','CANINO','SRD','HOSPITALIZADO','2020-01-01','o1'),
 ('p2','PID2','P2','CANINO','SRD','HOSPITALIZADO','2020-01-01','o1'),
 ('p3','PID3','P3','FELINO','SRD','HOSPITALIZADO','2020-01-01','o1');

INSERT INTO hospitalizations VALUES
 ('h1',10,'[]','[]','2026-01-10 08:00:00','2026-01-12 18:00:00','Fechada','p1'),
 ('h2',11,'[]','[]','2026-02-01 22:00:00','2026-02-03 02:00:00','Fechada','p2'),
 ('h3',12,'[]','[]','2026-03-01 00:00:00','2026-03-09 00:00:00','Fechada','p3'),
 ('h4',13,'[]','[]','2026-03-05 00:00:00',NULL,'Aberta','p3');

INSERT INTO budgets (budget_id,start_on,end_on,status,hospitalization_id) VALUES
 ('b1','2026-01-10','2026-01-12','PAGO','h1'),
 ('b2','2026-02-01','2026-02-03','PAGO','h2'),
 ('b3','2026-03-01','2026-03-09','PAGO','h3'),
 ('b4','2026-03-05','2026-03-09','PENDENTE','h4');

INSERT INTO reports (report_id,state_of_consciousness,food_types,food_level,food_date,comments,created_at,system_id) VALUES
 ('rp_strict','"alerta"','"racao"','A','2026-01-11 09:00:00','ok','2026-01-11 09:00:00','p1'),
 ('rp_day','"alerta"','"racao"','A','2026-02-01 20:30:00','ok','2026-02-01 20:30:00','p2'),
 ('rp_ambig','"alerta"','"racao"','A','2026-03-06 10:00:00','ok','2026-03-06 10:00:00','p3'),
 ('rp_orphan','"alerta"','"racao"','A','2026-05-01 10:00:00','ok','2026-05-01 10:00:00','p1');

INSERT INTO discharges (type,aspects,report_id) VALUES ('Urina','"Normal"','rp_strict');
`;
