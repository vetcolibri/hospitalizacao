import { InmemPatientRepository } from "persistence/inmem/inmem_patient_repository.ts";
import { PATIENTS } from "../fake_data.ts";

export class PatientRepositoryStub extends InmemPatientRepository {
	constructor() {
		const discharged = Object.entries(PATIENTS.discharged).map(([_, v]) => v.patient);
		super(Object.values(PATIENTS.hospitalized).concat(discharged));
	}
}
