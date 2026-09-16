import { Either, left, right } from "shared/either.ts";
import { Hospitalization, HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { HospitalizationRepository } from "domain/hospitalization/hospitalization_repository.ts";
import {
	RecentHospitalization,
	RecentHospitalizationsFilter,
} from "domain/hospitalization/recent_hospitalization.ts";
import { Patient } from "domain/patient/patient.ts";
import { matchScore } from "domain/patient/patient_search.ts";
import { ID } from "shared/id.ts";

export class InmemHospitalizationRepository implements HospitalizationRepository {
	#data: Record<string, Hospitalization> = {};
	readonly #patients: Record<string, Patient> = {};
	readonly #ownerNames: Record<string, string>;

	constructor(
		hospitalizations?: Hospitalization[],
		patients?: Patient[],
		ownerNames: Record<string, string> = {},
	) {
		this.#ownerNames = ownerNames;

		if (patients) patients.forEach((p) => (this.#patients[p.systemId.value] = p));

		if (!hospitalizations) return;

		hospitalizations.forEach((h) => (this.#data[h.hospitalizationId.value] = h));
	}

	findRecent(
		filter: RecentHospitalizationsFilter,
		limit: number,
	): Promise<RecentHospitalization[]> {
		const term = filter.term?.trim().toLowerCase() ?? "";
		const from = filter.from ? new Date(`${filter.from}T00:00:00`).getTime() : undefined;
		const toExclusive = filter.to
			? new Date(`${filter.to}T00:00:00`).getTime() + 24 * 60 * 60 * 1000
			: undefined;

		const recent = this.records
			.map((hospitalization) => ({
				hospitalization,
				patient: this.#patients[hospitalization.patientId.value],
			}))
			.filter(({ hospitalization, patient }) => {
				if (!patient) return false;

				const ownerName = this.#ownerNames[patient.ownerId.value] ?? "";
				const matchesTerm = term.length === 0 ||
					matchScore(patient.patientId.value, term) > 0 ||
					matchScore(patient.ownerId.value, term) > 0 ||
					matchScore(patient.name, term) > 0 ||
					matchScore(ownerName, term) > 0;
				if (!matchesTerm) return false;

				const entry = hospitalization.entryDate.getTime();
				if (from !== undefined && entry < from) return false;
				if (toExclusive !== undefined && entry >= toExclusive) return false;

				return true;
			})
			.sort((a, b) => {
				const byEntry = b.hospitalization.entryDate.getTime() -
					a.hospitalization.entryDate.getTime();
				if (byEntry !== 0) return byEntry;

				const leftId = a.hospitalization.hospitalizationId.value;
				const rightId = b.hospitalization.hospitalizationId.value;
				if (leftId === rightId) return 0;
				return leftId < rightId ? 1 : -1;
			})
			.slice(0, limit)
			.map(({ hospitalization, patient }) => ({
				hospitalizationId: hospitalization.hospitalizationId.value,
				systemId: hospitalization.patientId.value,
				entryDate: hospitalization.entryDate,
				dischargeDate: hospitalization.dischargeDate,
				status: hospitalization.status,
				patientId: patient.patientId.value,
				patientName: patient.name,
				ownerId: patient.ownerId.value,
				ownerName: this.#ownerNames[patient.ownerId.value] ?? "",
			}));

		return Promise.resolve(recent);
	}

	findAllByPatientId(patientId: ID): Promise<Hospitalization[]> {
		const hospitalizations = this.records
			.filter((h) => h.patientId.equals(patientId))
			.sort((a, b) => {
				const byEntryDate = b.entryDate.getTime() - a.entryDate.getTime();
				if (byEntryDate !== 0) return byEntryDate;

				if (a.hospitalizationId.value === b.hospitalizationId.value) return 0;
				return a.hospitalizationId.value < b.hospitalizationId.value ? 1 : -1;
			});

		return Promise.resolve(hospitalizations);
	}

	findByHospitalizationId(
		id: ID,
	): Promise<Either<HospitalizationNotFound, Hospitalization>> {
		const hospitalization = this.records.find((h) => h.hospitalizationId.equals(id));

		if (!hospitalization) return Promise.resolve(left(new HospitalizationNotFound()));

		return Promise.resolve(right(hospitalization));
	}

	findByStatus(status: HospitalizationStatus): Promise<Hospitalization[]> {
		return Promise.resolve(this.records.filter((h) => h.status = status));
	}

	findOpenByPatientId(patientId: ID): Promise<Hospitalization[]> {
		return Promise.resolve(
			this.records.filter((h) => h.patientId.equals(patientId) && h.isOpen()),
		);
	}

	findByPatientId(patientId: ID): Promise<Either<HospitalizationNotFound, Hospitalization>> {
		const hospitalization = this.records.find((h) =>
			h.patientId.equals(patientId) && h.isOpen()
		);

		if (!hospitalization) return Promise.resolve(left(new HospitalizationNotFound()));

		return Promise.resolve(right(hospitalization));
	}

	save(hospitalization: Hospitalization): Promise<void> {
		this.#data[hospitalization.hospitalizationId.value] = hospitalization;
		return Promise.resolve(undefined);
	}

	update(hospitalization: Hospitalization): Promise<void> {
		this.#data[hospitalization.hospitalizationId.value] = hospitalization;
		return Promise.resolve(undefined);
	}

	last(): Promise<Hospitalization> {
		const hospitalization = this.records[this.records.length - 1];
		return Promise.resolve(hospitalization);
	}

	get records(): Hospitalization[] {
		return Object.values(this.#data);
	}
}
