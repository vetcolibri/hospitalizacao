import { Client } from "deps";
import { Hospitalization, HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { HospitalizationRepository } from "domain/hospitalization/hospitalization_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

export class PostgresHospitalizationRepository implements HospitalizationRepository {
	constructor(private client: Client) {}

	async getAll(): Promise<Hospitalization[]> {
		const result = await this.client.queryObject<HospModel>("SELECT * FROM hospitalizations");
		return result.rows.map(hospFactory);
	}

	async save(hospitalization: Hospitalization): Promise<void> {
		await this.client.queryObject(
			"INSERT INTO hospitalizations (weight, entry_date, discharge_date, complaints, diagnostics, status, hospitalization_id, system_id)  VALUES ($WEIGHT, $ENTRY_DATE, $DISCHARGE_DATE, $COMPLAINTS, $DIAGNISTICS, $STATUS, $HOSPITALIZATION_ID, $SYSTEM_ID)",
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
	}

	async last(): Promise<Hospitalization> {
		const result = await this.client.queryObject<HospModel>("SELECT * FROM hospitalizations");
		return hospFactory(result.rows[result.rows.length - 1]);
	}

	async getByPatientId(patientId: ID): Promise<Either<HospitalizationNotFound, Hospitalization>> {
		const result = await this.client.queryObject<HospModel>(
			"SELECT * FROM hospitalizations WHERE system_id = $SYSTEM_ID  AND status = $STATUS LIMIT 1",
			{ systemId: patientId.value, status: HospitalizationStatus.Open },
		);

		if (result.rows.length === 0) return left(new HospitalizationNotFound());

		return right(hospFactory(result.rows[0]));
	}

	async update(hospitalization: Hospitalization): Promise<void> {
		await this.client.queryObject(
			"UPDATE hospitalizations SET status = $STATUS WHERE hospitalization_id = $HOSPITALIZATION_ID",
			{
				status: HospitalizationStatus.Close,
				hospitalizationId: hospitalization.hospitalizationId.value,
			},
		);
	}
}

interface HospModel {
	hospitalization_id: string;
	patient_id: string;
	weight: number;
	complaints: string[];
	diagnostics: string[];
	entry_date: string;
	status: string;
	discharge_date?: string;
}

function hospFactory(model: HospModel): Hospitalization {
	return Hospitalization.restore({
		patientId: model.patient_id,
		hospitalizationId: model.hospitalization_id,
		entryDate: model.entry_date,
		dischargeDate: model.discharge_date,
		weight: model.weight,
		complaints: model.complaints,
		diagnostics: model.diagnostics,
		status: model.status,
	});
}
