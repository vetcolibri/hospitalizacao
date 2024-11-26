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
import { UserRepository } from "domain/auth/user_repository.ts";
import { Username } from "domain/auth/username.ts";
import { User } from "domain/auth/user.ts";
import { PermissionDenied } from "domain/auth/permission_denied_error.ts";

export class CrmService {
	#ownerRepository: OwnerRepository;
	#patientRepository: PatientRepository;
	#reportRepository: ReportRepository;
	#budgetRepository: BudgetRepository;
	#userRepository: UserRepository;
	#reportService: ReportService;

	constructor(
		ownerRepository: OwnerRepository,
		patientRepository: PatientRepository,
		reportRepository: ReportRepository,
		budgetRepository: BudgetRepository,
		userRepository: UserRepository,
		reportService: ReportService,
	) {
		this.#ownerRepository = ownerRepository;
		this.#patientRepository = patientRepository;
		this.#reportRepository = reportRepository;
		this.#budgetRepository = budgetRepository;
		this.#userRepository = userRepository;
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

	async registerReport(
		data: RegisterReportData,
		username: string,
	): Promise<Either<ReportError, void>> {
		const userOrErr = await this.#userRepository.getByUsername(Username.fromString(username));
		const user = <User> userOrErr.value;
		if (!user.hasReportWritePermission()) {
			return left(
				new PermissionDenied(
					"O nível de Utilizador não lhe permite salvar Reports.",
				),
			);
		}

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

		const budgetOrErr = await this.#budgetRepository.findById(
			ID.fromString(hospitalizationId),
		);
		if (budgetOrErr.isLeft()) return left(budgetOrErr.value);

		const reports = await this.#reportService.findAll(patientId, hospitalizationId);

		return right(reports);
	}

	#buildFood(data: RegisterReportData) {
		return new Food(data.food.types, data.food.level, data.food.datetime);
	}

	#buildDischarge(data: RegisterReportData) {
		return data.discharges.map((discharge) => {
			return new Discharge(discharge.type, discharge.aspects);
		});
	}
}

interface DischargeData {
	type: string;
	aspects: string[];
}

export interface ReportData {
	stateOfConsciousness: string[];
	food: {
		types: string[];
		level: string;
		datetime: string;
	};
	discharges: DischargeData[];
	comments: string;
}

interface RegisterReportData extends ReportData {
	patientId: string;
}
