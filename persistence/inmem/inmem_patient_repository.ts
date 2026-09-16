import { Patient, PatientStatus } from "domain/patient/patient.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { PatientRepository } from "domain/patient/patient_repository.ts";
import { matchScore } from "domain/patient/patient_search.ts";
import { PatientSearchResult } from "domain/patient/patient_search_result.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

export class InmemPatientRepository implements PatientRepository {
	readonly #data: Record<string, Patient> = {};
	readonly #ownerNames: Record<string, string>;

	constructor(patients?: Patient[], ownerNames: Record<string, string> = {}) {
		this.#ownerNames = ownerNames;

		if (!patients) return;

		patients.forEach((p) => this.#data[p.systemId.value] = p);
	}

	findBySystemId(id: ID): Promise<Either<PatientNotFound, Patient>> {
		const patient = this.records.find((p) => p.systemId.equals(id));
		if (!patient) return Promise.resolve(left(new PatientNotFound()));
		return Promise.resolve(right(patient));
	}

	findByPatientId(patientId: ID): Promise<Either<PatientNotFound, Patient>> {
		const patient = this.records.find((p) => p.patientId.equals(patientId));
		if (!patient) return Promise.resolve(left(new PatientNotFound()))
		return Promise.resolve(right(patient));
	}

	findByStatus(status: PatientStatus): Promise<Patient[]> {
	   return Promise.resolve(this.records.filter((p) => p.status === status))
	}

	findNonHospitalized(): Promise<Patient[]> {
		return Promise.resolve(this.records.filter((p) => !p.isHospitalized()));
	}

	search(term: string, limit: number): Promise<PatientSearchResult[]> {
		const normalized = term.trim().toLowerCase();

		const ranked = this.records
			.map((patient) => {
				const ownerName = this.#ownerNames[patient.ownerId.value] ?? "";
				const scores = [
					matchScore(patient.patientId.value, normalized),
					matchScore(patient.ownerId.value, normalized),
					matchScore(patient.name, normalized),
					matchScore(ownerName, normalized),
				];
				const score = Math.max(...scores);

				return { patient, ownerName, score, priority: scores.indexOf(score) };
			})
			.filter((item) => item.score > 0)
			.sort((a, b) => {
				if (a.score !== b.score) return b.score - a.score;
				if (a.priority !== b.priority) return a.priority - b.priority;
				if (a.patient.patientId.value !== b.patient.patientId.value) {
					return a.patient.patientId.value < b.patient.patientId.value ? -1 : 1;
				}
				if (a.patient.systemId.value === b.patient.systemId.value) return 0;
				return a.patient.systemId.value < b.patient.systemId.value ? -1 : 1;
			})
			.slice(0, limit)
			.map(({ patient, ownerName }) => ({ patient, ownerName }));

		return Promise.resolve(ranked);
	}

	lockBySystemId(_patientId: ID): Promise<void> {
		return Promise.resolve(undefined);
	}

	save(patient: Patient): Promise<void> {
		this.#data[patient.systemId.value] = patient;
		return Promise.resolve(undefined);
	}

	update(patient: Patient): Promise<void> {
		this.#data[patient.systemId.value] = patient;
		return Promise.resolve(undefined);
	}

	last(): Promise<Patient> {
		const last = this.records[this.records.length - 1];
		return Promise.resolve(last);
	}

	get records(): Patient[] {
		return Object.values(this.#data);
	}
}
