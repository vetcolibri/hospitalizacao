import { Hospitalization } from "domain/hospitalization/hospitalization.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

export class HospitalizationBuilder {
	#patientId?: string;
	#entryDate?: string;
	#dischargeDate?: string;
	#weight?: number;
	#complaints?: string[];
	#diagnostics?: string[];

	withPatientId(patientId: string): HospitalizationBuilder {
		this.#patientId = patientId;
		return this;
	}

	withEntryDate(entryDate: string): HospitalizationBuilder {
		this.#entryDate = entryDate;
		return this;
	}

	withDischargeDate(dischargeDate?: string): HospitalizationBuilder {
		if (!dischargeDate) return this;
		this.#dischargeDate = dischargeDate;
		return this;
	}

	withWeight(weight: number): HospitalizationBuilder {
		this.#weight = weight;
		return this;
	}

	withComplaints(complaints: string[]): HospitalizationBuilder {
		this.#complaints = complaints;
		return this;
	}

	withDiagnostics(diagnostics: string[]): HospitalizationBuilder {
		this.#diagnostics = diagnostics;
		return this;
	}

	build(): Either<Error, Hospitalization> {
		if (!this.#patientId) return left(new Error("Patient ID is required"));

		if (!this.#entryDate) return left(new Error("Entry date is required"));

		if (!this.#weight) return left(new Error("Weight is required"));

		if (!this.#complaints) return left(new Error("Complaints are required"));

		if (!this.#diagnostics) return left(new Error("Diagnostics are required"));

		const hospitalization = new Hospitalization(
			ID.random(),
			this.#patientId,
			this.#weight,
			this.#complaints,
			this.#diagnostics,
			this.#entryDate,
			this.#dischargeDate,
		);

		return right(hospitalization);
	}
}
