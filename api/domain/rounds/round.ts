import { Parameter } from "../parameters/parameter.ts";
import { Patient } from "../patients/patient.ts";

export class Round {
	readonly patient: Patient;
	readonly parameters: Parameter[];

	constructor(patient: Patient) {
		this.patient = patient;
		this.parameters = [];
	}

	getPatient(): Patient {
		return this.patient;
	}

	getParameter(name: string) {
		return this.parameters.find((parameter) => parameter.name === name);
	}

	addParameter(parameter: Parameter): void {
		this.parameters.push(parameter);
	}

	totalParameters(): number {
		return this.parameters.length;
	}
}
