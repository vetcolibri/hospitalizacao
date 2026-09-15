const MIGRATIONS_DIR = new URL("../../persistence/postgres/migrations/", import.meta.url);

export const CONTACT_MIGRATION = Deno.readTextFileSync(
	new URL("20260916_add_hospitalization_contact.sql", MIGRATIONS_DIR),
);

/**
 * Estado legado: hospitalizações anteriores a RF-13, sem qualquer coluna de
 * contacto específico. A migração tem de ser aditiva e deixar estes registos
 * intactos (contacto continua nulo = usar o tutor principal).
 */
export const LEGACY_CONTACT_FIXTURE = `
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

INSERT INTO owners VALUES ('o1','Tutor de teste','900000000',true);

INSERT INTO patients VALUES
 ('p1','PID1','P1','CANINO','SRD','HOSPITALIZADO','2020-01-01','o1'),
 ('p2','PID2','P2','CANINO','SRD','ALTA MEDICA','2020-01-01','o1');

INSERT INTO hospitalizations VALUES
 ('h1',10,'[]','[]','2026-01-10 08:00:00','2026-01-12 18:00:00','Fechada','p1'),
 ('h2',11,'[]','[]','2026-02-01 22:00:00',NULL,'Aberta','p2');

INSERT INTO budgets (budget_id,start_on,end_on,status,hospitalization_id) VALUES
 ('b1','2026-01-10','2026-01-12','PAGO','h1'),
 ('b2','2026-02-01','2026-02-03','NÃO PAGO','h2');
`;
