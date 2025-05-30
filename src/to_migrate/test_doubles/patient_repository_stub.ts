import { InmemPatientRepository } from "@infra/persistence/inmem/inmem_patient_repository.ts";
import { PATIENTS } from "@testDoubles/patients_test_data.ts";

export class PatientRepositoryStub extends InmemPatientRepository {
	constructor() {
		super(PATIENTS);
	}
}
