import { Budget } from "domain/budget/budget.ts";
import { BudgetRepository } from "domain/budget/budget_repository.ts";
import { Owner } from "domain/crm/owner/owner.ts";
import { OwnerNotFound } from "domain/crm/owner/owner_not_found_error.ts";
import { OwnerRepository } from "domain/crm/owner/owner_repository.ts";
import { Discharge } from "domain/crm/report/discharge.ts";
import { Food } from "domain/crm/report/food.ts";
import { Report } from "domain/crm/report/report.ts";
import { ReportBuilder } from "domain/crm/report/report_builder.ts";
import { ReportRepository } from "domain/crm/report/report_repository.ts";
import { Patient } from "domain/patient/patient.ts";
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

	constructor(
		ownerRepository: OwnerRepository,
		patientRepository: PatientRepository,
		reportRepository: ReportRepository,
		budgetRepository: BudgetRepository,
	) {
		this.#ownerRepository = ownerRepository;
		this.#patientRepository = patientRepository;
		this.#reportRepository = reportRepository;
		this.#budgetRepository = budgetRepository;
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

	async lastReport(
		patientId: string,
		ownerId: string,
		hospitalizationId: string,
	): Promise<Either<ReportError, LastReportData>> {
		const ownerOrErr = await this.#ownerRepository.getById(ID.fromString(ownerId));
		if (ownerOrErr.isLeft()) return left(ownerOrErr.value);

		const patientOrErr = await this.#patientRepository.getById(ID.fromString(patientId));
		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		if (!patientOrErr.value.isHospitalized()) return left(new PatientNotHospitalized());

		if (!patientOrErr.value.ownerId.equals(ownerOrErr.value.ownerId)) {
			return left(new PatientNotFound());
		}

		const reportOrErr = await this.#reportRepository.last(patientOrErr.value.systemId);
		if (reportOrErr.isLeft()) return left(reportOrErr.value);

		const budgetOrErr = await this.#budgetRepository.get(
			ID.fromString(hospitalizationId),
		);
		if (budgetOrErr.isLeft()) return left(budgetOrErr.value);

		return right(
			this.#generateReportOutput(
				ownerOrErr.value,
				patientOrErr.value,
				reportOrErr.value,
				budgetOrErr.value,
			),
		);
	}

	#buildFood(data: RegisterReportData) {
		return new Food(data.food.types, data.food.level, data.food.datetime);
	}

	#buildDischarge(data: RegisterReportData) {
		return new Discharge(data.discharge.type, data.discharge.aspect);
	}

	#generateReportOutput(owner: Owner, patient: Patient, report: Report, budget: Budget) {
		return {
			ownerName: owner.name,
			patientName: patient.name,
			stateOfConsciousness: report.stateOfConsciousness,
			food: {
				types: report.food.types,
				level: report.food.level,
				datetime: report.food.datetime.toISOString(),
			},
			discharge: {
				type: report.discharge.type,
				aspect: report.discharge.aspect,
			},
			budgetStatus: budget.status,
			comments: report.comments,
		};
	}
}

interface ReportData {
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

export interface LastReportData extends ReportData {
	ownerName: string;
	patientName: string;
	budgetStatus: string;
}
