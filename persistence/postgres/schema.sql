--
-- Criar a tabela owners
-- 

CREATE TABLE IF NOT EXISTS owners (
    owner_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    phone_number VARCHAR(9) NOT NULL,
    whatsapp BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY(owner_id)
);

--
-- Criar a tabela patients
-- 

CREATE TABLE IF NOT EXISTS patients (
	system_id VARCHAR(50) NOT NULL UNIQUE,
	patient_id VARCHAR(50) not null unique,
    name VARCHAR(50) NOT NULL,
    specie VARCHAR(50) NOT NULL,
    breed VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    birth_date DATE NOT NULL,
    owner_id VARCHAR(50) NOT NULL, 
    PRIMARY KEY(system_id),
    CONSTRAINT fk_patients_owners FOREIGN KEY (owner_id) REFERENCES owners(owner_id) ON DELETE CASCADE
);

--
-- Criar a tabela hospitalizations
-- 

CREATE TABLE IF NOT EXISTS hospitalizations (
    hospitalization_id VARCHAR(50) NOT NULL UNIQUE,
    weight NUMERIC(5,2) NOT NULL,
    complaints JSON NOT NULL,
    diagnostics JSON NOT NULL,
    entry_date TIMESTAMP NOT NULL,
    discharge_date TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    system_id VARCHAR(50) NOT NULL,
    PRIMARY KEY(hospitalization_id),
    CONSTRAINT fk_hospitalizations_patients FOREIGN KEY (system_id) REFERENCES patients(system_id) ON DELETE CASCADE
);

--
-- Criar a tabela budgets
-- 

CREATE TABLE IF NOT EXISTS budgets (
    budget_id VARCHAR(50) NOT NULL UNIQUE,
    start_on TIMESTAMP NOT NULL,
    end_on TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL,
    hospitalization_id VARCHAR(50) NOT NULL,
    PRIMARY KEY(budget_id),
    CONSTRAINT fk_budgets_hospitalizations FOREIGN KEY (hospitalization_id) REFERENCES hospitalizations(hospitalization_id) ON DELETE CASCADE
);



--
-- Criar a tabela reports
-- 

CREATE TABLE IF NOT EXISTS reports (
	report_id VARCHAR(50) NOT NULL UNIQUE,
	state_of_consciousness JSON NOT NULL,
	food_types JSON NOT NULL,
	food_level VARCHAR(1),
	food_date TIMESTAMP NOT NULL,
    comments TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    system_id VARCHAR(50) NOT NULL,
    PRIMARY KEY(report_id),
    CONSTRAINT fk_reports_patients FOREIGN KEY (system_id) REFERENCES patients(system_id) ON DELETE CASCADE
);

--
-- Criar a tabela discharges
-- 

CREATE TABLE IF NOT EXISTS discharges (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    aspects JSON NOT NULL,
    report_id VARCHAR(50) NOT NULL,
    CONSTRAINT fk_discharges_reports FOREIGN KEY (report_id) REFERENCES reports(report_id) ON DELETE CASCADE
);

--
-- Criar a tabela rounds
--

CREATE TABLE IF NOT EXISTS rounds (
    round_id VARCHAR(50) NOT NULL UNIQUE,
    system_id VARCHAR(50) NOT NULL,
    PRIMARY KEY(round_id),
    CONSTRAINT fk_rounds_patients FOREIGN KEY (system_id) REFERENCES patients(system_id) ON DELETE CASCADE
);


--
-- Criar a tabela measurements
--

CREATE TABLE IF NOT EXISTS measurements (
    name VARCHAR(50) NOT NULL,
    value VARCHAR(50) NOT NULL,
    issued_at TIMESTAMP NOT NULL,
    round_id VARCHAR(50) NOT NULL,
    FOREIGN KEY (round_id) REFERENCES rounds(round_id) ON DELETE CASCADE
);


--
-- Criar a tabela alerts
--

CREATE TABLE IF NOT EXISTS alerts (
    alert_id VARCHAR(50) NOT NULL UNIQUE,
    parameters JSON NOT NULL,
    repeat_every INT NOT NULL,
    time TIMESTAMP NOT NULL,
    comments TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    system_id VARCHAR(50) NOT NULL,
    PRIMARY KEY(alert_id),
    CONSTRAINT fk_alerts_patients FOREIGN KEY (system_id) REFERENCES patients(system_id) ON DELETE CASCADE
);