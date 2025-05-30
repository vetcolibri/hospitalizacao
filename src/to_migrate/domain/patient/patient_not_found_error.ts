export class PatientNotFound extends Error {
	constructor() {
		super("O paciente não foi encontrado.");
	}
}
