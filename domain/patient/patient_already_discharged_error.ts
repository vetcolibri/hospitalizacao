export class PatientAlreadyDischarged extends Error {
	constructor(name: string) {
		super(`Paciente ${name} já recebeu alta médica`);
	}
}
