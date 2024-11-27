export class PatientNotHospitalized extends Error {
	constructor() {
		super("O paciente não está hospitalizado.");
	}
}
