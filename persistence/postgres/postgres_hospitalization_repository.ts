import { Client } from "deps";
import { Hospitalization, HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { HospitalizationRepository } from "domain/hospitalization/hospitalization_repository.ts";
import {
	RecentHospitalization,
	RecentHospitalizationsFilter,
} from "domain/hospitalization/recent_hospitalization.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

export class PostgresHospitalizationRepository implements HospitalizationRepository {
	constructor(private client: Client) {}

	/**
	 * Últimos internamentos numa única leitura (join paciente+tutor, sem N+1).
	 *
	 * - termo literal e case-insensitive: `lower(...)` + `strpos` (sem LIKE, por
	 *   isso `%` e `_` são caracteres normais);
	 * - datas inclusivas e index-friendly: `entry_date >= from` e
	 *   `entry_date < to + 1 dia` (timestamp sem timezone);
	 * - ordenação estável por entrada descendente e desempate por id descendente;
	 * - `LIMIT` evita carregar a tabela toda.
	 */
	async findRecent(
		filter: RecentHospitalizationsFilter,
		limit: number,
	): Promise<RecentHospitalization[]> {
		const term = filter.term?.trim().toLowerCase() || null;

		const result = await this.client.queryObject<RecentModel>(
			`SELECT
				h.hospitalization_id, h.entry_date, h.discharge_date, h.status, h.system_id,
				p.patient_id, p.name AS patient_name, p.owner_id, o.name AS owner_name
			FROM hospitalizations h
			INNER JOIN patients p ON p.system_id = h.system_id
			INNER JOIN owners o ON o.owner_id = p.owner_id
			WHERE (
					$1::text IS NULL
					OR strpos(lower(p.patient_id), $1) > 0
					OR strpos(lower(p.owner_id), $1) > 0
					OR strpos(lower(p.name), $1) > 0
					OR strpos(lower(o.name), $1) > 0
				)
				AND ($2::date IS NULL OR h.entry_date >= $2::date)
				AND ($3::date IS NULL OR h.entry_date < ($3::date + INTERVAL '1 day'))
			ORDER BY h.entry_date DESC, h.hospitalization_id DESC
			LIMIT $4::int`,
			[term, filter.from ?? null, filter.to ?? null, limit],
		);

		return result.rows.map(recentFactory);
	}

	async findAllByPatientId(patientId: ID): Promise<Hospitalization[]> {
		const result = await this.client.queryObject<HospModel>(
			"SELECT * FROM hospitalizations WHERE system_id = $SYSTEM_ID ORDER BY entry_date DESC, hospitalization_id DESC",
			{ system_id: patientId.value },
		);

		return result.rows.map(hospFactory);
	}

	async findByHospitalizationId(
		id: ID,
	): Promise<Either<HospitalizationNotFound, Hospitalization>> {
		const result = await this.client.queryObject<HospModel>(
			"SELECT * FROM hospitalizations WHERE hospitalization_id = $HOSPITALIZATION_ID LIMIT 1",
			{ hospitalization_id: id.value },
		);

		if (result.rows.length === 0) return left(new HospitalizationNotFound());

		return right(hospFactory(result.rows[0]));
	}

	async findByStatus(status: HospitalizationStatus): Promise<Hospitalization[]> {
		const result = await this.client.queryObject<HospModel>(
			"SELECT * FROM hospitalizations WHERE status = $STATUS",
			{
				status: status,
			},
		);
		return result.rows.map(hospFactory);
	}

	async findOpenByPatientId(patientId: ID): Promise<Hospitalization[]> {
		const result = await this.client.queryObject<HospModel>(
			"SELECT * FROM hospitalizations WHERE system_id = $SYSTEM_ID AND status = $STATUS ORDER BY entry_date, hospitalization_id",
			{ system_id: patientId.value, status: HospitalizationStatus.Open },
		);
		return result.rows.map(hospFactory);
	}

	async save(hospitalization: Hospitalization): Promise<void> {
		await this.client.queryObject(
			"INSERT INTO hospitalizations (weight, entry_date, discharge_date, complaints, diagnostics, status, hospitalization_id, system_id, contact_name, contact_phone_number, contact_whatsapp)  VALUES ($WEIGHT, $ENTRY_DATE, $DISCHARGE_DATE, $COMPLAINTS, $DIAGNOSTICS, $STATUS, $HOSPITALIZATION_ID, $SYSTEM_ID, $CONTACT_NAME, $CONTACT_PHONE_NUMBER, $CONTACT_WHATSAPP)",
			{
				weight: hospitalization.weight,
				entry_date: hospitalization.entryDate.toISOString(),
				discharge_date: hospitalization.dischargeDate?.toISOString(),
				complaints: JSON.stringify(hospitalization.complaints.join(",")),
				diagnostics: JSON.stringify(hospitalization.diagnostics.join(",")),
				status: hospitalization.status,
				hospitalization_id: hospitalization.hospitalizationId.value,
				system_id: hospitalization.patientId.value,
				contact_name: hospitalization.contact?.name ?? null,
				contact_phone_number: hospitalization.contact?.phoneNumber ?? null,
				contact_whatsapp: hospitalization.contact?.whatsapp ?? null,
			},
		);
	}

	async last(): Promise<Hospitalization> {
		const result = await this.client.queryObject<HospModel>("SELECT * FROM hospitalizations");
		return hospFactory(result.rows[result.rows.length - 1]);
	}

	async findByPatientId(
		patientId: ID,
	): Promise<Either<HospitalizationNotFound, Hospitalization>> {
		const result = await this.client.queryObject<HospModel>(
			"SELECT * FROM hospitalizations WHERE system_id = $SYSTEM_ID  AND status = $STATUS LIMIT 1",
			{ system_id: patientId.value, status: HospitalizationStatus.Open },
		);

		if (result.rows.length === 0) return left(new HospitalizationNotFound());

		return right(hospFactory(result.rows[0]));
	}

	async update(hospitalization: Hospitalization): Promise<void> {
		await this.client.queryObject(
			"UPDATE hospitalizations SET status = $STATUS, discharge_date = $DISCHARGE_DATE WHERE hospitalization_id = $HOSPITALIZATION_ID",
			{
				status: hospitalization.status,
				discharge_date: hospitalization.dischargeDate?.toISOString() ?? null,
				hospitalization_id: hospitalization.hospitalizationId.value,
			},
		);
	}
}

interface HospModel {
	hospitalization_id: string;
	system_id: string;
	weight: number;
	complaints: string;
	diagnostics: string;
	entry_date: string;
	status: string;
	discharge_date?: string;
	contact_name?: string | null;
	contact_phone_number?: string | null;
	contact_whatsapp?: boolean | null;
}

function hospFactory(model: HospModel): Hospitalization {
	const hasContact = model.contact_name != null &&
		model.contact_phone_number != null &&
		model.contact_whatsapp != null;

	return Hospitalization.restore({
		patientId: model.system_id,
		hospitalizationId: model.hospitalization_id,
		entryDate: model.entry_date,
		dischargeDate: model.discharge_date,
		weight: Number(model.weight),
		complaints: model.complaints.split(","),
		diagnostics: model.diagnostics.split(","),
		status: model.status,
		contact: hasContact
			? {
				name: model.contact_name as string,
				phoneNumber: model.contact_phone_number as string,
				whatsapp: model.contact_whatsapp as boolean,
			}
			: undefined,
	});
}

interface RecentModel {
	hospitalization_id: string;
	entry_date: string;
	discharge_date: string | null;
	status: string;
	system_id: string;
	patient_id: string;
	patient_name: string;
	owner_id: string;
	owner_name: string;
}

function recentFactory(model: RecentModel): RecentHospitalization {
	return {
		hospitalizationId: model.hospitalization_id,
		systemId: model.system_id,
		entryDate: new Date(model.entry_date),
		dischargeDate: model.discharge_date ? new Date(model.discharge_date) : undefined,
		status: model.status as HospitalizationStatus,
		patientId: model.patient_id,
		patientName: model.patient_name,
		ownerId: model.owner_id,
		ownerName: model.owner_name,
	};
}
