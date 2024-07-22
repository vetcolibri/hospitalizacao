import { Owner } from "domain/crm/owner/owner.ts";
import { OwnerNotFound } from "domain/crm/owner/owner_not_found_error.ts";
import { OwnerRepository } from "domain/crm/owner/owner_repository.ts";
import { Food } from "domain/crm/report/food.ts";
import { Report } from "domain/crm/report/report.ts";
import { ReportRepository } from "domain/crm/report/report_repository.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { PatientNotHospitalized } from "domain/patient/patient_not_hospitalized_error.ts";
import { PatientRepository } from "domain/patient/patient_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

export type ReportError = PatientNotHospitalized | PatientNotFound;

export class CrmService {
	#ownerRepository: OwnerRepository;
	#patientRepository: PatientRepository;
	#reportRepository: ReportRepository;

	constructor(
		ownerRepository: OwnerRepository,
		patientRepository: PatientRepository,
		reportRepository: ReportRepository,
	) {
		this.#ownerRepository = ownerRepository;
		this.#patientRepository = patientRepository;
		this.#reportRepository = reportRepository;
	}

	async getAll(): Promise<Owner[]> {
		return await this.#ownerRepository.getAll();
	}

	async findOwner(ownerId: string): Promise<Either<OwnerNotFound, Owner>> {
		const ownerOrErr = await this.#ownerRepository.getById(
			ID.fromString(ownerId),
		);
		if (ownerOrErr.isLeft()) return left(ownerOrErr.value);

		return right(ownerOrErr.value);
	}

	async registerReport(data: RegisterReportDTO): Promise<Either<ReportError, void>> {
		const patientOrErr = await this.#patientRepository.getById(
			ID.fromString(data.patientId),
		);

		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		const patient = patientOrErr.value;

		if (!patient.isHospitalized()) return left(new PatientNotHospitalized());

		const food = this.#buildFood(data);
		const report = new Report(patient.systemId, data.stateOfConsciousness, food);

		await this.#reportRepository.save(report);

		return right(undefined);
	}

	#buildFood(data: RegisterReportDTO) {
		return new Food(data.food.type, data.food.level, data.food.date);
	}
}

type RegisterReportDTO = {
	patientId: string;
	stateOfConsciousness: string[];
	food: {
		type: string[];
		level: string;
		date: string;
	};
};
