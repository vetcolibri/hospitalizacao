const MIGRATIONS_DIR = new URL("../../persistence/postgres/migrations/", import.meta.url);

/**
 * RF-16 — estado anterior à protecção do histórico: as três FKs para
 * hospitalizações ainda estão em ON DELETE CASCADE. A migração tem de as
 * normalizar para RESTRICT sem tocar nos dados.
 *
 * Enquanto a migração ainda não existir, o conteúdo é vazio e o teste falha
 * no passo que exige RESTRICT (RED).
 */
export const HARDEN_HISTORY_FKS_MIGRATION = (() => {
	try {
		return Deno.readTextFileSync(
			new URL("20260916_harden_history_fks.sql", MIGRATIONS_DIR),
		);
	} catch {
		return "";
	}
})();

export const LEGACY_CASCADE_FIXTURE = `
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
    system_id VARCHAR(50) NOT NULL, hospitalization_id VARCHAR(50),
    PRIMARY KEY(report_id),
    CONSTRAINT fk_reports_hospitalizations FOREIGN KEY (hospitalization_id)
        REFERENCES hospitalizations(hospitalization_id) ON DELETE CASCADE);

CREATE TABLE rounds (
    round_id VARCHAR(50) NOT NULL UNIQUE, system_id VARCHAR(50) NOT NULL,
    hospitalization_id VARCHAR(50), PRIMARY KEY(round_id),
    CONSTRAINT fk_rounds_hospitalizations FOREIGN KEY (hospitalization_id)
        REFERENCES hospitalizations(hospitalization_id) ON DELETE CASCADE);

INSERT INTO owners VALUES ('o-rf16','Tutor RF16','900000000',true);
INSERT INTO patients VALUES ('sys-rf16','RF16-CLINIC','Rex RF16','CANINO','bulldog','ALTA MEDICA','2013-07-01','o-rf16');
INSERT INTO hospitalizations VALUES ('h-rf16',12.5,'["Queixa"]','["Diagnostico"]','2026-01-01 08:00:00','2026-01-05 08:00:00','Fechada','sys-rf16');
INSERT INTO budgets VALUES ('b-rf16','2026-01-01 08:00:00','2026-01-05 08:00:00','PAGO','h-rf16');
INSERT INTO reports (report_id, state_of_consciousness, food_types, food_level, food_date, comments, system_id, hospitalization_id)
    VALUES ('rep-rf16','["alerta"]','["racao"]','A','2026-01-02 09:00:00','Relatorio RF16','sys-rf16','h-rf16');
INSERT INTO rounds (round_id, system_id, hospitalization_id) VALUES ('round-rf16','sys-rf16','h-rf16');
`;
