export class PatientAlreadyHospitalizedError extends Error {
	constructor(name: string) {
		super(`Paciente ${name} está hospitalizado`);
	}
}
