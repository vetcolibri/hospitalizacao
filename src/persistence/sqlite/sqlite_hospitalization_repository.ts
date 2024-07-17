import { DB } from "deps";
import { Hospitalization, HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationAlreadyClosed } from "domain/hospitalization/hospitalization_already_closed_error.ts";
import { HospitalizationRepository } from "domain/hospitalization/hospitalization_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { EntityFactory } from "shared/factory.ts";
import { ID } from "shared/id.ts";

const factory = new EntityFactory();

export class SQLiteHospitalizationRepository implements HospitalizationRepository {
	#db: DB;

	constructor(db: DB) {
		this.#db = db;
	}

	getAll(): Promise<Hospitalization[]> {
		const rows = this.#db.queryEntries("SELECT * FROM hospitalizations");

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

	open(patientId: ID): Promise<Either<HospitalizationAlreadyClosed, Hospitalization>> {
		const rows = this.#db.queryEntries(
			"SELECT * FROM hospitalizations WHERE system_id = :systemId AND status = :status",
			{ systemId: patientId.value, status: HospitalizationStatus.Open },
		);

		if (rows.length === 0) {
			return Promise.resolve(left(new HospitalizationAlreadyClosed()));
		}

		const hospitalization = factory.createHospitalization(rows[0]);

		return Promise.resolve(right(hospitalization));
	}

	update(hospitalization: Hospitalization): Promise<void> {
		this.#db.queryEntries(
			"UPDATE hospitalizations SET status = :status WHERE hospitalization_id = :hospitalizationId",
			{
				status: HospitalizationStatus.Close,
				hospitalizationId: hospitalization.hospitalizationId.value,
			},
		);

		return Promise.resolve(undefined);
	}
}
