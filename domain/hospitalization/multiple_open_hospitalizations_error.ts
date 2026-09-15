export class MultipleOpenHospitalizations extends Error {
	constructor() {
		super(
			"O paciente tem mais de uma hospitalização activa. Resolver as hospitalizações sobrepostas antes de registar a ronda.",
		);
	}
}
