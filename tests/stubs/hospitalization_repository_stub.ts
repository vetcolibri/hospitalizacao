import { InmemHospitalizationRepository } from "persistence/inmem/inmem_hospitalization_repository.ts";
import { HOSPITALIZATIONS } from "../fake_data.ts";

export class HospitalizationRepositoryStub extends InmemHospitalizationRepository {
	constructor() {
		super(Object.values(HOSPITALIZATIONS.opened));
	}
}
