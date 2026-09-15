import { BudgetRepository } from "domain/budget/budget_repository.ts";
import { OwnerRepository } from "domain/crm/owner/owner_repository.ts";
import { ReportRepository } from "domain/crm/report/report_repository.ts";
import { ContactData } from "domain/hospitalization/contact.ts";
import { Hospitalization, HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import {
	HospitalizationLinkDiagnostic,
	HospitalizationLinkStatus,
} from "domain/hospitalization/hospitalization_link_diagnostic.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { HospitalizationRepository } from "domain/hospitalization/hospitalization_repository.ts";
import { Round } from "domain/hospitalization/rounds/round.ts";
import { RoundRepository } from "domain/hospitalization/rounds/round_repository.ts";
import { PatientRepository } from "domain/patient/patient_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";
import { Budget } from "domain/budget/budget.ts";
import { Report } from "domain/crm/report/report.ts";

/**
 * RF-15 — consulta do histórico de hospitalizações de um paciente.
 *
 * Todas as leituras clínicas filtram directamente por `hospitalization_id`:
 * nunca se busca pelo paciente para depois misturar episódios. O histórico não
 * depende do estado actual do paciente e inclui episódios encerrados.
 */
export interface HospitalizationHistorySummary {
	hospitalizationId: string;
	entryDate: Date;
	dischargeDate?: Date;
	status: HospitalizationStatus;
}

export interface HospitalizationHistoryDetail {
	hospitalization: Hospitalization;
	budget?: Budget;
	rounds: Round[];
	reports: Report[];
	/** Contacto efectivamente usado no episódio (excepção ou tutor principal). */
	contact?: ContactData;
	contactIsSpecific: boolean;
}

export class HospitalizationHistoryService {
	#hospitalizationRepository: HospitalizationRepository;
	#budgetRepository: BudgetRepository;
	#roundRepository: RoundRepository;
	#reportRepository: ReportRepository;
	#patientRepository: PatientRepository;
	#ownerRepository: OwnerRepository;
	#linkDiagnostic: HospitalizationLinkDiagnostic;

	constructor(
		hospitalizationRepository: HospitalizationRepository,
		budgetRepository: BudgetRepository,
		roundRepository: RoundRepository,
		reportRepository: ReportRepository,
		patientRepository: PatientRepository,
		ownerRepository: OwnerRepository,
		linkDiagnostic: HospitalizationLinkDiagnostic,
	) {
		this.#hospitalizationRepository = hospitalizationRepository;
		this.#budgetRepository = budgetRepository;
		this.#roundRepository = roundRepository;
		this.#reportRepository = reportRepository;
		this.#patientRepository = patientRepository;
		this.#ownerRepository = ownerRepository;
		this.#linkDiagnostic = linkDiagnostic;
	}

	/**
	 * Resumo das hospitalizações do paciente, da mais recente para a mais
	 * antiga (desempate pelo identificador descendente). Um paciente sem
	 * histórico devolve lista vazia, tal como um paciente inexistente: não se
	 * revela a existência de fichas.
	 */
	async listByPatient(patientId: string): Promise<HospitalizationHistorySummary[]> {
		const hospitalizations = await this.#hospitalizationRepository.findAllByPatientId(
			ID.fromString(patientId),
		);

		return hospitalizations.map((hospitalization) => ({
			hospitalizationId: hospitalization.hospitalizationId.value,
			entryDate: hospitalization.entryDate,
			dischargeDate: hospitalization.dischargeDate,
			status: hospitalization.status,
		}));
	}

	/**
	 * Detalhe de UM episódio. Um episódio de outro paciente é indistinguível de
	 * um episódio inexistente: ambas as situações devolvem
	 * @HospitalizationNotFound (404), sem revelar a existência entre pacientes.
	 */
	async detail(
		patientId: string,
		hospitalizationId: string,
	): Promise<Either<HospitalizationNotFound, HospitalizationHistoryDetail>> {
		const hospitalizationOrErr = await this.#hospitalizationRepository
			.findByHospitalizationId(ID.fromString(hospitalizationId));

		if (hospitalizationOrErr.isLeft()) return left(hospitalizationOrErr.value);

		const hospitalization = hospitalizationOrErr.value;

		if (!hospitalization.patientId.equals(ID.fromString(patientId))) {
			return left(new HospitalizationNotFound());
		}

		// Leituras por episódio, em paralelo e com um número fixo de queries
		// (nenhuma delas cresce com o volume de dados do episódio).
		const [budgetOrErr, rounds, reports, contact] = await Promise.all([
			this.#budgetRepository.findByHospitalizationId(hospitalization.hospitalizationId),
			this.#roundRepository.findAllByHospitalizationId(hospitalization.hospitalizationId),
			this.#reportRepository.findAllByHospitalizationId(hospitalization.hospitalizationId),
			this.#resolveEffectiveContact(hospitalization),
		]);

		return right({
			hospitalization,
			budget: budgetOrErr.isRight() ? budgetOrErr.value : undefined,
			rounds,
			reports,
			contact: contact.contact,
			contactIsSpecific: contact.isSpecific,
		});
	}

	/**
	 * Diagnóstico do legado do paciente: conta (sem atribuir) os registos por
	 * classificar. Fica ligado ao `system_id` do path.
	 */
	async linkStatus(patientId: string): Promise<HospitalizationLinkStatus> {
		return await this.#linkDiagnostic.statusForPatient(ID.fromString(patientId));
	}

	async #resolveEffectiveContact(
		hospitalization: Hospitalization,
	): Promise<{ contact?: ContactData; isSpecific: boolean }> {
		if (hospitalization.contact) {
			return {
				contact: {
					name: hospitalization.contact.name,
					phoneNumber: hospitalization.contact.phoneNumber,
					whatsapp: hospitalization.contact.whatsapp,
				},
				isSpecific: true,
			};
		}

		const patientOrErr = await this.#patientRepository.findBySystemId(
			hospitalization.patientId,
		);
		if (patientOrErr.isLeft()) return { isSpecific: false };

		const ownerOrErr = await this.#ownerRepository.getById(patientOrErr.value.ownerId);
		if (ownerOrErr.isLeft()) return { isSpecific: false };

		const owner = ownerOrErr.value;

		return {
			contact: {
				name: owner.name,
				phoneNumber: owner.phoneNumber,
				whatsapp: owner.whatsapp,
			},
			isSpecific: false,
		};
	}
}
