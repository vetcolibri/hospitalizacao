import { Client } from "deps";
import { Patient, PatientStatus } from "domain/patient/patient.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { PatientRepository } from "domain/patient/patient_repository.ts";
import { PatientSearchResult } from "domain/patient/patient_search_result.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

interface PatientModel {
	system_id: string;
	patient_id: string;
	name: string;
	breed: string;
	specie: string;
	birth_date: string;
	owner_id: string;
	status: string;
}

function patientFactory(model: PatientModel): Patient {
	return Patient.restore({
		systemId: model.system_id,
		patientId: model.patient_id,
		name: model.name,
		breed: model.breed,
		specie: model.specie,
		birthDate: model.birth_date,
		ownerId: model.owner_id,
		status: model.status,
	});
}

export class PostgresPatientRepository implements PatientRepository {
	constructor(private client: Client) {}

	async lockBySystemId(patientId: ID): Promise<void> {
		// Bloqueia a ficha do paciente até ao fim da transacção, serializando a
		// abertura de hospitalizações concorrentes para o mesmo paciente.
		await this.client.queryObject(
			"SELECT system_id FROM patients WHERE system_id = $SYSTEM_ID FOR UPDATE",
			{ system_id: patientId.value },
		);
	}

	async findBySystemId(patientId: ID): Promise<Either<PatientNotFound, Patient>> {
		const result = await this.client.queryObject<PatientModel>(
			"SELECT * FROM patients WHERE system_id = $SYSTEM_ID limit 1",
			{ system_id: patientId.value },
		);

		if (result.rows.length === 0) return left(new PatientNotFound());

		return right(patientFactory(result.rows[0]));
	}

	async save(patient: Patient): Promise<void> {
		await this.client.queryObject(
			"INSERT INTO patients (system_id, patient_id, name, breed, specie, birth_date, owner_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
			[
				patient.systemId.value,
				patient.patientId.value,
				patient.name,
				patient.breed,
				patient.specie,
				patient.birthDate.value.toISOString(),
				patient.ownerId.value,
				patient.status,
			],
		);
	}

	async update(patient: Patient): Promise<void> {
		await this.client.queryObject(
			"UPDATE patients SET status = $STATUS WHERE system_id = $SYSTEM_ID",
			{
				status: patient.status,
				system_id: patient.systemId.value,
			},
		);
	}

	async findByStatus(status: PatientStatus): Promise<Patient[]> {
		const result = await this.client.queryObject<PatientModel>(
			"SELECT * FROM patients WHERE status = $STATUS",
			{ status: String(status) },
		);

		return result.rows.map(patientFactory);
	}

	async findNonHospitalized(): Promise<Patient[]> {
		const result = await this.client.queryObject<PatientModel>(
			"SELECT * FROM patients WHERE status <> $HOSPITALIZED",
			{ hospitalized: PatientStatus.Hospitalized },
		);

		return result.rows.map(patientFactory);
	}

	/**
	 * Pesquisa unificada (ID/nome do paciente e ID/nome do tutor).
	 *
	 * - `lower(...)` + `starts_with` + `strpos` = comparação LITERAL e
	 *   case-insensitive: `%` e `_` no termo são caracteres normais, nunca
	 *   wildcards (não se usa LIKE).
	 * - relevância exacto (3) > prefixo (2) > parcial (1); em empate a prioridade
	 *   é ID paciente > ID tutor > nome paciente > nome tutor;
	 * - `LIMIT` limita a 10: nunca carrega a tabela toda.
	 */
	async search(term: string, limit: number): Promise<PatientSearchResult[]> {
		const normalized = term.trim().toLowerCase();

		const result = await this.client.queryObject<PatientModel & { owner_name: string }>(
			`WITH match AS (
				SELECT
					p.system_id, p.patient_id, p.name, p.breed, p.specie, p.birth_date, p.owner_id, p.status,
					o.name AS owner_name,
					CASE WHEN lower(p.patient_id) = $1 THEN 3 WHEN starts_with(lower(p.patient_id), $1) THEN 2 WHEN strpos(lower(p.patient_id), $1) > 0 THEN 1 ELSE 0 END AS m_patient_id,
					CASE WHEN lower(o.owner_id) = $1 THEN 3 WHEN starts_with(lower(o.owner_id), $1) THEN 2 WHEN strpos(lower(o.owner_id), $1) > 0 THEN 1 ELSE 0 END AS m_owner_id,
					CASE WHEN lower(p.name) = $1 THEN 3 WHEN starts_with(lower(p.name), $1) THEN 2 WHEN strpos(lower(p.name), $1) > 0 THEN 1 ELSE 0 END AS m_patient_name,
					CASE WHEN lower(o.name) = $1 THEN 3 WHEN starts_with(lower(o.name), $1) THEN 2 WHEN strpos(lower(o.name), $1) > 0 THEN 1 ELSE 0 END AS m_owner_name
				FROM patients p
				INNER JOIN owners o ON o.owner_id = p.owner_id
			),
			scored AS (
				SELECT *, GREATEST(m_patient_id, m_owner_id, m_patient_name, m_owner_name) AS score FROM match
			)
			SELECT system_id, patient_id, name, breed, specie, birth_date, owner_id, status, owner_name
			FROM scored
			WHERE score > 0
			ORDER BY score DESC,
				CASE WHEN m_patient_id = score THEN 0 WHEN m_owner_id = score THEN 1 WHEN m_patient_name = score THEN 2 ELSE 3 END ASC,
				patient_id ASC, system_id ASC
			LIMIT $2::int`,
			[normalized, limit],
		);

		return result.rows.map((row) => ({
			patient: patientFactory(row),
			ownerName: row.owner_name,
		}));
	}

	last(): Promise<Patient> {
		throw new Error("Method not implemented.");
	}

	async findByPatientId(patientId: ID): Promise<Either<PatientNotFound, Patient>> {
		const result = await this.client.queryObject<PatientModel>(
			"SELECT patient_id, system_id, name, breed, specie, birth_date, owner_id, status FROM patients WHERE patient_id = $PATIENT_ID",
			{ patient_id: patientId.value },
		);

		if (result.rows.length === 0) return left(new PatientNotFound());

		return right(patientFactory(result.rows[0]));
	}
}
