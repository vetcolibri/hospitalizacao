export class PatientAlreadyHospitalized extends Error {
	constructor(name: string) {
		super(`Paciente ${name} está hospitalizado`);
	}
}
