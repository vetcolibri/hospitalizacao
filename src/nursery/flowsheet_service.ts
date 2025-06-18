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

import { FlowSheetRecord } from "./flowsheet_record.ts";
import { MeasurementValue } from "./measurement_value.ts";
import { RoundPlan } from "./round_plan.ts";
import { UserRoleEnum } from "@shared/user_role_enum.ts";
import { PatientMeasurementsRecordedPayload } from "./patient_measurements_recorded_event.ts";

import { FlowSheetRecordRepository } from "./flowsheet_record_repository.ts";

const RECORD_MEDICAL_ROUND_CAUSE = "Nursery.FlowSheetService:recordMedicalRound";
const RECORD_CONTINUOUS_MEASUREMENTS_CAUSE =
	"Nursery.FlowSheetService:recordContinuousMeasurements";

export class FlowSheetService {
	#flowSheetRecordRepository: FlowSheetRecordRepository;
	#eventBus: EventBus;

	constructor(
		eventBus: EventBus,
		flowSheetRecordRepository: FlowSheetRecordRepository,
	) {
		this.#flowSheetRecordRepository = flowSheetRecordRepository;
		this.#eventBus = eventBus;
	}

	async recordMedicalRound(
		ctx: Context,
		request: RecordMedicalRoundRequest,
	): Promise<Either<ValidationError[] | ForbiddenError | IOError | NotFoundError, void>> {
		if (
			!ctx.roles.includes(UserRoleEnum.MED_VET as string) &&
			!ctx.roles.includes(UserRoleEnum.VET_ASSISTANT as string)
		) {
			return left(new ForbiddenError(RECORD_MEDICAL_ROUND_CAUSE));
		}

		const hospitalizationIdOrErr = IdValue.fromString(request.hospitalizationId);
		const dateTimeOrErr = DateValue.fromString(request.dateTime);

		const errs = [];
		if (hospitalizationIdOrErr.isLeft()) {
			errs.push(hospitalizationIdOrErr.value);
		}

		if (dateTimeOrErr.isLeft()) {
			errs.push(dateTimeOrErr.value);
		}

		if (errs.length > 0) {
			return left(errs);
		}

		// Get measurements for the specified round type
		const roundMeasurementTypes = RoundPlan.getMeasurementsForRound(request.roundType);

		// Validate that measurements match the round plan
		const providedMeasurementTypeIds = request.measurements.map((m) => m.measurementTypeId);
		const expectedMeasurementTypeIds = Array.from(roundMeasurementTypes);

		const missingMeasurements = expectedMeasurementTypeIds.filter(
			(id) => !providedMeasurementTypeIds.includes(id),
		);

		if (missingMeasurements.length > 0) {
			return left([
				new ValidationError(RECORD_MEDICAL_ROUND_CAUSE, [
					`Medições obrigatórias em falta para a ronda ${request.roundType}: ${
						missingMeasurements.join(", ")
					}`,
				]),
			]);
		}

		// Create measurement value objects
		const measurements: MeasurementValue[] = [];
		for (const measurementData of request.measurements) {
			const measurementOrErr = MeasurementValue.create(
				dateTimeOrErr.right,
				measurementData.measurementTypeId,
				measurementData.value,
				measurementData.notes,
			);

			if (measurementOrErr.isLeft()) {
				errs.push(measurementOrErr.value);
			} else {
				measurements.push(measurementOrErr.right);
			}
		}

		if (errs.length > 0) {
			return left(errs);
		}

		// Find or create flow sheet record for this hospitalization
		let flowSheetRecord: FlowSheetRecord;
		const existingRecordOrErr = await this.#flowSheetRecordRepository.findByHospitalizationId(
			hospitalizationIdOrErr.right,
		);

		if (existingRecordOrErr.isLeft()) {
			// Create new flow sheet record
			const newRecordOrErr = new FlowSheetRecord.Builder()
				.withId(IdValue.random())
				.withHospitalizationId(hospitalizationIdOrErr.right)
				.build();

			if (newRecordOrErr.isLeft()) {
				return left([newRecordOrErr.value]);
			}

			flowSheetRecord = newRecordOrErr.right;
		} else {
			flowSheetRecord = existingRecordOrErr.right;
		}

		// Add measurements to flow sheet record
		const addResult = flowSheetRecord.addMeasurements(
			measurements,
			"MEDICAL_ROUND",
			request.roundType,
		);
		if (addResult.isLeft()) {
			return left([addResult.value]);
		}

		// Save flow sheet record
		const saveOrErr = await this.#tryIO(
			() => {
				if (existingRecordOrErr.isLeft()) {
					return this.#flowSheetRecordRepository.save(flowSheetRecord);
				} else {
					return this.#flowSheetRecordRepository.update(flowSheetRecord);
				}
			},
			RECORD_MEDICAL_ROUND_CAUSE,
			"Erro ao gravar o registro de ronda médica no repositório",
		);

		if (saveOrErr.isLeft()) {
			return left(saveOrErr.value);
		}

		const events = flowSheetRecord.clearUncommitedEvents()
			.map((evt: Event<PatientMeasurementsRecordedPayload>) =>
				decorate(evt, withHeader("Principal", ctx.principal))
			);
		await this.#eventBus.publishAll(...events);

		return right(undefined);
	}

	async recordContinuousMeasurements(
		ctx: Context,
		request: RecordContinuousMeasurementsRequest,
	): Promise<Either<ValidationError[] | ForbiddenError | IOError | NotFoundError, void>> {
		if (
			!ctx.roles.includes(UserRoleEnum.MED_VET as string) &&
			!ctx.roles.includes(UserRoleEnum.VET_ASSISTANT as string)
		) {
			return left(new ForbiddenError(RECORD_CONTINUOUS_MEASUREMENTS_CAUSE));
		}

		const hospitalizationIdOrErr = IdValue.fromString(request.hospitalizationId);
		const dateTimeOrErr = DateValue.fromString(request.dateTime);

		const errs = [];
		if (hospitalizationIdOrErr.isLeft()) {
			errs.push(hospitalizationIdOrErr.value);
		}

		if (dateTimeOrErr.isLeft()) {
			errs.push(dateTimeOrErr.value);
		}

		if (errs.length > 0) {
			return left(errs);
		}

		// Create measurement value objects
		const measurements: MeasurementValue[] = [];
		for (const measurementData of request.measurements) {
			const measurementOrErr = MeasurementValue.create(
				dateTimeOrErr.right,
				measurementData.measurementTypeId,
				measurementData.value,
				measurementData.notes,
			);

			if (measurementOrErr.isLeft()) {
				errs.push(measurementOrErr.value);
			} else {
				measurements.push(measurementOrErr.right);
			}
		}

		if (errs.length > 0) {
			return left(errs);
		}

		// Find or create flow sheet record for this hospitalization
		let flowSheetRecord: FlowSheetRecord;
		const existingRecordOrErr = await this.#flowSheetRecordRepository.findByHospitalizationId(
			hospitalizationIdOrErr.right,
		);

		if (existingRecordOrErr.isLeft()) {
			// Create new flow sheet record
			const newRecordOrErr = new FlowSheetRecord.Builder()
				.withId(IdValue.random())
				.withHospitalizationId(hospitalizationIdOrErr.right)
				.build();

			if (newRecordOrErr.isLeft()) {
				return left([newRecordOrErr.value]);
			}

			flowSheetRecord = newRecordOrErr.right;
		} else {
			flowSheetRecord = existingRecordOrErr.right;
		}

		// Add measurements to flow sheet record
		const addResult = flowSheetRecord.addMeasurements(measurements, "CONTINUOUS_MEASUREMENT");
		if (addResult.isLeft()) {
			return left([addResult.value]);
		}

		// Save flow sheet record
		const saveOrErr = await this.#tryIO(
			() => {
				if (existingRecordOrErr.isLeft()) {
					return this.#flowSheetRecordRepository.save(flowSheetRecord);
				} else {
					return this.#flowSheetRecordRepository.update(flowSheetRecord);
				}
			},
			RECORD_CONTINUOUS_MEASUREMENTS_CAUSE,
			"Erro ao gravar as medições contínuas no repositório",
		);

		if (saveOrErr.isLeft()) {
			return left(saveOrErr.value);
		}

		const events = flowSheetRecord.clearUncommitedEvents()
			.map((evt: Event<PatientMeasurementsRecordedPayload>) =>
				decorate(evt, withHeader("Principal", ctx.principal))
			);
		await this.#eventBus.publishAll(...events);

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

export interface RecordMedicalRoundRequest {
	hospitalizationId: string;
	dateTime: string;
	roundType: string;
	measurements: {
		measurementTypeId: string;
		value: string;
		notes?: string;
	}[];
}

export interface RecordContinuousMeasurementsRequest {
	hospitalizationId: string;
	dateTime: string;
	measurements: {
		measurementTypeId: string;
		value: string;
		notes?: string;
	}[];
}
