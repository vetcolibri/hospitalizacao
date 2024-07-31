import { BudgetRepository } from "domain/budget/budget_repository.ts";
import { Owner } from "domain/crm/owner/owner.ts";
import { OwnerNotFound } from "domain/crm/owner/owner_not_found_error.ts";
import { OwnerRepository } from "domain/crm/owner/owner_repository.ts";
import { Discharge } from "domain/crm/report/discharge.ts";
import { Food } from "domain/crm/report/food.ts";
import { ReportBuilder } from "domain/crm/report/report_builder.ts";
import { ReportRepository } from "domain/crm/report/report_repository.ts";
import { ReportDTO, ReportService } from "domain/crm/report/report_service.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { PatientNotHospitalized } from "domain/patient/patient_not_hospitalized_error.ts";
import { PatientRepository } from "domain/patient/patient_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { ReportError } from "shared/errors.ts";
import { ID } from "shared/id.ts";

export class CrmService {
	#ownerRepository: OwnerRepository;
	#patientRepository: PatientRepository;
	#reportRepository: ReportRepository;
	#budgetRepository: BudgetRepository;
	#reportService: ReportService;

	constructor(
		ownerRepository: OwnerRepository,
		patientRepository: PatientRepository,
		reportRepository: ReportRepository,
		budgetRepository: BudgetRepository,
		reportService: ReportService,
	) {
		this.#ownerRepository = ownerRepository;
		this.#patientRepository = patientRepository;
		this.#reportRepository = reportRepository;
		this.#budgetRepository = budgetRepository;
		this.#reportService = reportService;
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

	async registerReport(data: RegisterReportData): Promise<Either<ReportError, void>> {
		const patientOrErr = await this.#patientRepository.getById(
			ID.fromString(data.patientId),
		);

		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		const patient = patientOrErr.value;

		if (!patient.isHospitalized()) return left(new PatientNotHospitalized());

		const reportOrErr = new ReportBuilder()
			.withPatientId(patient.systemId)
			.withStateOfConsciousness(data.stateOfConsciousness)
			.withFood(this.#buildFood(data))
			.withDischarge(this.#buildDischarge(data))
			.withComments(data.comments)
			.build();

		if (reportOrErr.isLeft()) return left(reportOrErr.value);

		const report = reportOrErr.value;

		await this.#reportRepository.save(report);

		return right(undefined);
	}

	async findReports(
		patientId: string,
		ownerId: string,
		hospitalizationId: string,
	): Promise<Either<ReportError, ReportDTO[]>> {
		const ownerOrErr = await this.#ownerRepository.getById(ID.fromString(ownerId));
		if (ownerOrErr.isLeft()) return left(ownerOrErr.value);

		const patientOrErr = await this.#patientRepository.getById(ID.fromString(patientId));
		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		if (!patientOrErr.value.isHospitalized()) return left(new PatientNotHospitalized());

		if (!patientOrErr.value.ownerId.equals(ownerOrErr.value.ownerId)) {
			return left(new PatientNotFound());
		}

		const budgetOrErr = await this.#budgetRepository.get(
			ID.fromString(hospitalizationId),
		);
		if (budgetOrErr.isLeft()) return left(budgetOrErr.value);

		const reports = await this.#reportService.getAll(patientId, hospitalizationId);

		return right(reports);
	}

	#buildFood(data: RegisterReportData) {
		return new Food(data.food.types, data.food.level, data.food.datetime);
	}

	#buildDischarge(data: RegisterReportData) {
		return new Discharge(data.discharge.type, data.discharge.aspect);
	}
}

export interface ReportData {
	stateOfConsciousness: string[];
	food: {
		types: string[];
		level: string;
		datetime: string;
	};
	discharge: {
		type: string;
		aspect: string;
	};
	comments: string;
}

interface RegisterReportData extends ReportData {
	patientId: string;
}
