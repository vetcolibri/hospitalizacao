import { HospitalizationRepository } from "domain/patients/hospitalizations/hospitalization_repository.ts";
import {
	Hospitalization,
	HospitalizationStatus,
} from "domain/patients/hospitalizations/hospitalization.ts";
import { ID } from "shared/id.ts";
import { DB } from "deps";
import { EntityFactory } from "shared/factory.ts";

const factory = new EntityFactory();

export class SQLiteHospitalizationRepository implements HospitalizationRepository {
	#db: DB;

	constructor(db: DB) {
		this.#db = db;
	}

	getAllOpened(): Promise<Hospitalization[]> {
		const rows = this.#db.queryEntries(
			"SELECT * FROM hospitalizations WHERE status = :open",
			{ open: HospitalizationStatus.Open },
		);

		const hospitalizations = rows.map((row) => factory.createHospitalization(row));

		return Promise.resolve(hospitalizations);
	}

	save(hospitalization: Hospitalization): Promise<void> {
		this.#db.queryEntries(
			"INSERT INTO hospitalizations (weight, entry_date, discharge_date, complaints, diagnostics, status, hospitalization_id, system_id)  VALUES (:weight, :entryDate, :dischargeDate, :complaints, :diagnostics, :status, :hospitalizationId, :systemId)",
			{
				weight: hospitalization.weight,
				entryDate: hospitalization.entryDate.toISOString(),
				dischargeDate: hospitalization.dischargeDate?.toISOString(),
				complaints: JSON.stringify(hospitalization.complaints.join(",")),
				diagnostics: JSON.stringify(hospitalization.diagnostics.join(",")),
				status: hospitalization.status,
				hospitalizationId: hospitalization.hospitalizationId.value,
				systemId: hospitalization.patientId.value,
			},
		);

		return Promise.resolve(undefined);
	}

	last(): Promise<Hospitalization> {
		const rows = this.#db.queryEntries("SELECT * FROM hospitalizations");

		const hospitalization = factory.createHospitalization(rows[rows.length - 1]);

		return Promise.resolve(hospitalization);
	}

	open(_patientId: ID): Promise<Hospitalization> {
		throw new Error("Method not implemented.");
	}
}
