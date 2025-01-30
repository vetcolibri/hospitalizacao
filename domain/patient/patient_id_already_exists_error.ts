export class PatientIdAlreadyExists extends Error {
	constructor() {
		super("ID do paciente já foi registrado.");
	}
}
