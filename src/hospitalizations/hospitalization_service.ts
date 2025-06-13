import { Either, left, right } from "@shared/either.ts";
import { IdValue } from "@shared/id_value.ts";
import { DateValue } from "@shared/date_value.ts";
import { Context } from "@shared/context.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { ForbiddenError } from "@shared/forbidden_error.ts";
import { IOError } from "@shared/io_error.ts";
import { NotFoundError } from "@shared/not_found_error.ts";
import { EventBus } from "@shared/event_bus.ts";
import { decorate, Event, withHeader } from "@shared/event.ts";
import { PhoneNumberValue } from "@shared/phone_number_value.ts";

import { Hospitalization } from "./hospitalization.ts";
import { ContactPersonValue } from "./contact_person_value.ts";
import { PeriodicReport } from "./periodic_report.ts";
import { ConsciousnessStateEnum } from "./consciousness_state_enum.ts";
import { ComplaintEnum } from "./complaint_enum.ts";
import { DiagnosisEnum } from "./diagnosis_enum.ts";
import { StateAtDischargeEnum } from "./state_at_discharge_enum.ts";
import { UserRoleEnum } from "../shared/user_role_enum.ts";
import { HospitalizationCreatedPayload } from "./hospitalization_created_event.ts";
import { HospitalizationUpdatedPayload } from "./hospitalization_updated_event.ts";
import { PatientDischargedPayload } from "./patient_discharged_event.ts";
import { PeriodicReportReleasedPayload } from "./periodic_report_released_event.ts";

import { HospitalizationRepository } from "./hospitalization_repository.ts";

const CREATE_HOSPITALIZATION_CAUSE =
	"Hospitalizations.HospitalizationsService:createHospitalization";
const UPDATE_CONTACT_PERSON_CAUSE = "Hospitalizations.HospitalizationsService:updateContactPerson";
const UPDATE_DIAGNOSIS_CAUSE = "Hospitalizations.HospitalizationsService:updateDiagnosis";
const DISCHARGE_HOSPITALIZATION_CAUSE =
	"Hospitalizations.HospitalizationsService:dischargeHospitalization";
const CREATE_REPORT_CAUSE = "Hospitalizations.HospitalizationsService:createPeriodicReport";

export class HospitalizationsService {
	#hospitalizationRepository: HospitalizationRepository;
	#eventBus: EventBus;

	constructor(
		eventBus: EventBus,
		hospitalizationRepository: HospitalizationRepository,
	) {
		this.#hospitalizationRepository = hospitalizationRepository;
		this.#eventBus = eventBus;
	}

	async createHospitalization(
		ctx: Context,
		request: CreateHospitalizationRequest,
	): Promise<Either<ValidationError[] | ForbiddenError | IOError, IdValue>> {
		if (
			!ctx.roles.includes(UserRoleEnum.MED_VET as string) &&
			!ctx.roles.includes(UserRoleEnum.VET_ASSISTANT as string)
		) {
			return left(new ForbiddenError(CREATE_HOSPITALIZATION_CAUSE));
		}

		const id = IdValue.random();
		const admissionDateOrErr = DateValue.fromString(request.admissionDate);
		const estimatedDischargeDateOrErr = DateValue.fromString(request.estimatedDischargeDate);
		const petIdOrErr = IdValue.fromString(request.petId);
		const ownerIdOrErr = IdValue.fromString(request.ownerId);
		const whatsAppNumberOrErr = PhoneNumberValue.create(
			request.contactPersonPhoneNumber,
			request.contactPersonHasWhatsApp,
			request.contactPersonCountryCode,
		);

		const errs = [];
		if (admissionDateOrErr.isLeft()) {
			errs.push(admissionDateOrErr.value);
		}

		if (estimatedDischargeDateOrErr.isLeft()) {
			errs.push(estimatedDischargeDateOrErr.value);
		}

		if (petIdOrErr.isLeft()) {
			errs.push(petIdOrErr.value);
		}

		if (ownerIdOrErr.isLeft()) {
			errs.push(ownerIdOrErr.value);
		}

		if (whatsAppNumberOrErr.isLeft()) {
			errs.push(whatsAppNumberOrErr.value);
		}

		if (errs.length > 0) {
			return left(errs);
		}

		// Create contact person
		const contactPersonOrErr = ContactPersonValue.create(
			request.contactPersonName,
			whatsAppNumberOrErr.right,
			request.contactPersonEmail,
		);
		if (contactPersonOrErr.isLeft()) {
			return left([contactPersonOrErr.value]);
		}

		// Check if pet already has an active hospitalization
		const activeHospitalizationOrErr = await this.#hospitalizationRepository.findActiveByPetId(
			petIdOrErr.right,
		);
		if (activeHospitalizationOrErr.isRight()) {
			return left([
				new ValidationError(CREATE_HOSPITALIZATION_CAUSE, [
					"O pet já tem uma hospitalização ativa",
				]),
			]);
		}

		let hospitalization: Hospitalization;
		try {
			hospitalization = new Hospitalization.Builder()
				.withId(id)
				.withAdmissionDate(admissionDateOrErr.right!)
				.withEstimatedDischargeDate(estimatedDischargeDateOrErr.right!)
				.withInitialDiagnosis(request.initialDiagnosis)
				.withComplaints(request.complaints)
				.withPetId(petIdOrErr.right!)
				.withPetName(request.petName)
				.withPetAge(request.petAge)
				.withPetWeight(request.petWeight)
				.withOwnerId(ownerIdOrErr.right!)
				.withOwnerName(request.ownerName)
				.withContactPerson(contactPersonOrErr.right!)
				.build();
		} catch (error) {
			return left([error as ValidationError]);
		}

		const voidOrErr = await this.#tryIO(
			() => this.#hospitalizationRepository.save(hospitalization),
			CREATE_HOSPITALIZATION_CAUSE,
			"Erro ao gravar a hospitalização no repositório",
		);

		if (voidOrErr.isLeft()) {
			return left(voidOrErr.value);
		}

		const events = hospitalization.clearUncommitedEvents()
			.map((
				evt: Event<
					| HospitalizationCreatedPayload
					| HospitalizationUpdatedPayload
					| PatientDischargedPayload
					| PeriodicReportReleasedPayload
				>,
			) => decorate(evt, withHeader("Principal", ctx.principal)));
		await this.#eventBus.publishAll(...events);

		return right(hospitalization.id);
	}

	async updateContactPerson(
		ctx: Context,
		request: UpdateContactPersonRequest,
	): Promise<Either<ValidationError[] | ForbiddenError | IOError, void>> {
		if (
			!ctx.roles.includes(UserRoleEnum.MED_VET as string) &&
			!ctx.roles.includes(UserRoleEnum.VET_ASSISTANT as string)
		) {
			return left(new ForbiddenError(UPDATE_CONTACT_PERSON_CAUSE));
		}

		const idOrErr = IdValue.fromString(request.id);
		if (idOrErr.isLeft()) {
			return left([idOrErr.value]);
		}

		const hospitalizationOrErr = await this.#hospitalizationRepository.findById(idOrErr.right);
		if (hospitalizationOrErr.isLeft()) {
			// Specific error for not found could be better, but ValidationEror array is current pattern
			return left([
				new ValidationError(UPDATE_CONTACT_PERSON_CAUSE, [
					`Hospitalization with id ${request.id} not found.`,
				]),
			]);
		}

		const hospitalization = hospitalizationOrErr.right;
		const errs: ValidationError[] = [];

		const phoneNumberOrErr = PhoneNumberValue.create(
			request.phoneNumber,
			request.whatsapp,
		);

		if (phoneNumberOrErr.isLeft()) {
			errs.push(phoneNumberOrErr.value);
		} else {
			const contactPersonOrErr = ContactPersonValue.create(
				request.name,
				phoneNumberOrErr.right,
				request.contactPersonEmail,
			);
			if (contactPersonOrErr.isLeft()) {
				errs.push(contactPersonOrErr.value);
			} else {
				const updateResult = hospitalization.changeContactPerson(contactPersonOrErr.right);
				if (updateResult.isLeft()) {
					errs.push(updateResult.value);
				}
			}
		}

		if (errs.length > 0) {
			return left(errs);
		}

		const saveOrErr = await this.#tryIO(
			() => this.#hospitalizationRepository.update(hospitalization),
			UPDATE_CONTACT_PERSON_CAUSE,
			"Erro ao gravar as alterações da pessoa de contacto no repositório",
		);

		if (saveOrErr.isLeft()) {
			return left(saveOrErr.value);
		}

		const events = hospitalization.clearUncommitedEvents()
			.map((evt) => decorate(evt, withHeader("Principal", ctx.principal)));

		this.#eventBus.publishAll(...events);

		return right(undefined);
	}

	async updateDiagnosis(
		ctx: Context,
		request: UpdateDiagnosisRequest,
	): Promise<Either<ValidationError[] | ForbiddenError | IOError, void>> {
		if (
			!ctx.roles.includes(UserRoleEnum.MED_VET as string) &&
			!ctx.roles.includes(UserRoleEnum.VET_ASSISTANT as string)
		) {
			return left(new ForbiddenError(UPDATE_DIAGNOSIS_CAUSE));
		}

		const idOrErr = IdValue.fromString(request.id);
		if (idOrErr.isLeft()) {
			return left([idOrErr.value]);
		}

		const hospitalizationOrErr = await this.#hospitalizationRepository.findById(idOrErr.right);
		if (hospitalizationOrErr.isLeft()) {
			return left([
				new ValidationError(UPDATE_DIAGNOSIS_CAUSE, [
					`Hospitalization with id ${request.id} not found.`,
				]),
			]);
		}

		const hospitalization = hospitalizationOrErr.right;
		const errs: ValidationError[] = [];

		const updateResult = hospitalization.updateActualDiagnosis(request.actualDiagnosis);
		if (updateResult.isLeft()) {
			errs.push(updateResult.value);
		}

		if (errs.length > 0) {
			return left(errs);
		}

		const saveOrErr = await this.#tryIO(
			() => this.#hospitalizationRepository.update(hospitalization),
			UPDATE_DIAGNOSIS_CAUSE,
			"Erro ao gravar as alterações do diagnóstico no repositório",
		);

		if (saveOrErr.isLeft()) {
			return left(saveOrErr.value);
		}

		const events = hospitalization.clearUncommitedEvents()
			.map((evt) => decorate(evt, withHeader("Principal", ctx.principal)));

		this.#eventBus.publishAll(...events);

		return right(undefined);
	}

	async dischargeHospitalization(
		ctx: Context,
		request: DischargeHospitalizationRequest,
	): Promise<Either<ValidationError[] | ForbiddenError | IOError | NotFoundError, void>> {
		if (!ctx.roles.includes(UserRoleEnum.MED_VET as string)) {
			return left(new ForbiddenError(DISCHARGE_HOSPITALIZATION_CAUSE));
		}

		const idOrErr = IdValue.fromString(request.id);
		const dischargeDateOrErr = DateValue.fromString(request.dischargeDate);

		const errs = [];
		if (idOrErr.isLeft()) {
			errs.push(idOrErr.value);
		}

		if (dischargeDateOrErr.isLeft()) {
			errs.push(dischargeDateOrErr.value);
		}

		if (errs.length > 0) {
			return left(errs);
		}

		const hospitalizationOrErr = await this.#hospitalizationRepository.findById(idOrErr.right);
		if (hospitalizationOrErr.isLeft()) {
			return left(hospitalizationOrErr.value);
		}

		const hospitalization = hospitalizationOrErr.right;
		const dischargeResult = hospitalization.dischargePatient(
			dischargeDateOrErr.right,
			request.stateAtDischarge,
		);

		if (dischargeResult.isLeft()) {
			return left(dischargeResult.value);
		}

		const saveOrErr = await this.#tryIO(
			() => this.#hospitalizationRepository.update(hospitalization),
			DISCHARGE_HOSPITALIZATION_CAUSE,
			"Erro ao gravar a alta da hospitalização no repositório",
		);

		if (saveOrErr.isLeft()) {
			return left(saveOrErr.value);
		}

		const events = hospitalization.clearUncommitedEvents()
			.map((evt) => decorate(evt, withHeader("Principal", ctx.principal)));

		this.#eventBus.publishAll(...events);

		return right(undefined);
	}

	async createPeriodicReport(
		ctx: Context,
		request: CreatePeriodicReportRequest,
	): Promise<Either<ValidationError[] | ForbiddenError | IOError | NotFoundError, void>> {
		if (
			!ctx.roles.includes(UserRoleEnum.MED_VET as string) &&
			!ctx.roles.includes(UserRoleEnum.VET_ASSISTANT as string)
		) {
			return left(new ForbiddenError(CREATE_REPORT_CAUSE));
		}

		const hospitalizationIdOrErr = IdValue.fromString(request.hospitalizationId);
		const timestampOrErr = DateValue.fromString(request.timestamp);

		const errs = [];
		if (hospitalizationIdOrErr.isLeft()) {
			errs.push(hospitalizationIdOrErr.value);
		}

		if (timestampOrErr.isLeft()) {
			errs.push(timestampOrErr.value);
		}

		if (errs.length > 0) {
			return left(errs);
		}

		const hospitalizationOrErr = await this.#hospitalizationRepository.findById(
			hospitalizationIdOrErr.right,
		);
		if (hospitalizationOrErr.isLeft()) {
			return left(hospitalizationOrErr.value);
		}

		const hospitalization = hospitalizationOrErr.right;

		// Check if hospitalization is active
		if (!hospitalization.isActive) {
			return left([
				new ValidationError(CREATE_REPORT_CAUSE, [
					"Não é possível adicionar relatórios a uma hospitalização já finalizada",
				]),
			]);
		}

		if (errs.length > 0) {
			return left(errs);
		}

		const reportOrErr = PeriodicReport.create(
			IdValue.random(), // Add ID for the new entity
			timestampOrErr.right,
			request.consciousnessStates as ConsciousnessStateEnum,
			request.annotations,
		);

		if (reportOrErr.isLeft()) {
			return left([reportOrErr.value]);
		}

		const addReportResult = hospitalization.addPeriodicReport(reportOrErr.right);
		if (addReportResult.isLeft()) {
			return left([addReportResult.value]);
		}

		const saveOrErr = await this.#tryIO(
			() => this.#hospitalizationRepository.update(hospitalization),
			CREATE_REPORT_CAUSE,
			"Erro ao gravar o relatório no repositório",
		);

		if (saveOrErr.isLeft()) {
			return left(saveOrErr.value);
		}

		const events = hospitalization.clearUncommitedEvents()
			.map((evt) => decorate(evt, withHeader("Principal", ctx.principal)));

		this.#eventBus.publishAll(...events);

		return right(undefined);
	}

	async #tryIO(
		task: () => Promise<void>,
		cause: string,
		msg: string,
	): Promise<Either<IOError, void>> {
		try {
			await task();
			return right(undefined);
		} catch (error) {
			return left(new IOError(cause, msg, error as Error));
		}
	}
}

export interface CreateHospitalizationRequest {
	admissionDate: string;
	estimatedDischargeDate: string;
	initialDiagnosis: DiagnosisEnum[];
	complaints: ComplaintEnum[];
	petId: string;
	petName: string;
	petAge: string;
	petWeight: number;
	ownerId: string;
	ownerName: string;
	contactPersonName: string;
	contactPersonPhoneNumber: string;
	contactPersonHasWhatsApp: boolean;
	contactPersonCountryCode?: string;
	contactPersonEmail?: string;
}

export interface UpdateContactPersonRequest {
	id: string;
	name: string;
	phoneNumber: string;
	whatsapp: boolean;
	contactPersonEmail?: string;
}

export interface UpdateDiagnosisRequest {
	id: string;
	actualDiagnosis: DiagnosisEnum[];
}

export interface DischargeHospitalizationRequest {
	id: string;
	dischargeDate: string;
	stateAtDischarge: StateAtDischargeEnum;
}

export interface CreatePeriodicReportRequest {
	hospitalizationId: string;
	timestamp: string;
	consciousnessStates: ConsciousnessStateEnum;
	annotations: string;
	feedingRecord?: {
		timeOfFeeding: string;
		foodType: string;
		appetite: string;
	};
	physicalDischarges?: {
		dischargeType: string;
		aspect: string;
	}[];
}
