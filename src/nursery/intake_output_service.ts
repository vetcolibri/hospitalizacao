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

import { IntakeOutput } from "./intake_output.ts";
import { Feeding } from "./feeding.ts";
import { Elimination } from "./elimination.ts";
import { FeedingTypeEnum } from "./feeding_type_enum.ts";
import { FeedingCategoryEnum } from "./feeding_category_enum.ts";
import { EliminationTypeEnum } from "./elimination_type_enum.ts";
import { UserRoleEnum } from "@shared/user_role_enum.ts";
import { PatientIntakeRecordedPayload } from "./patient_intake_recorded_event.ts";
import { PatientOutputRecordedPayload } from "./patient_output_recorded_event.ts";

import { IntakeOutputRepository } from "./intake_output_repository.ts";

const RECORD_INTAKE_CAUSE = "Nursery.IntakeOutputService:recordIntake";
const RECORD_OUTPUT_CAUSE = "Nursery.IntakeOutputService:recordOutput";

export class IntakeOutputService {
	#intakeOutputRepository: IntakeOutputRepository;
	#eventBus: EventBus;

	constructor(
		eventBus: EventBus,
		intakeOutputRepository: IntakeOutputRepository,
	) {
		this.#intakeOutputRepository = intakeOutputRepository;
		this.#eventBus = eventBus;
	}

	async recordIntake(
		ctx: Context,
		request: RecordIntakeRequest,
	): Promise<Either<ValidationError[] | ForbiddenError | IOError | NotFoundError, void>> {
		if (
			!ctx.roles.includes(UserRoleEnum.MED_VET as string) &&
			!ctx.roles.includes(UserRoleEnum.VET_ASSISTANT as string)
		) {
			return left(new ForbiddenError(RECORD_INTAKE_CAUSE));
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

		// Create feeding value object
		const feedingOrErr = Feeding.create(
			dateTimeOrErr.right,
			request.type,
			request.notes,
			request.feedingCategory,
			request.appetiteScore,
		);

		if (feedingOrErr.isLeft()) {
			return left([feedingOrErr.value]);
		}

		// Find or create intake output for this hospitalization
		let intakeOutput: IntakeOutput;
		const existingIntakeOutputOrErr = await this.#intakeOutputRepository.findByHospitalizationId(
			hospitalizationIdOrErr.right,
		);

		if (existingIntakeOutputOrErr.isLeft()) {
			// Create new intake output
			const newIntakeOutputOrErr = new IntakeOutput.Builder()
				.withId(IdValue.random())
				.withHospitalizationId(hospitalizationIdOrErr.right)
				.build();

			if (newIntakeOutputOrErr.isLeft()) {
				return left([newIntakeOutputOrErr.value]);
			}

			intakeOutput = newIntakeOutputOrErr.right;
		} else {
			intakeOutput = existingIntakeOutputOrErr.right;
		}

		// Add feeding to intake output
		const addResult = intakeOutput.addFeeding(feedingOrErr.right);
		if (addResult.isLeft()) {
			return left([addResult.value]);
		}

		// Save intake output
		const saveOrErr = await this.#tryIO(
			() => {
				if (existingIntakeOutputOrErr.isLeft()) {
					return this.#intakeOutputRepository.save(intakeOutput);
				} else {
					return this.#intakeOutputRepository.update(intakeOutput);
				}
			},
			RECORD_INTAKE_CAUSE,
			"Erro ao gravar o registro de entrada no repositório",
		);

		if (saveOrErr.isLeft()) {
			return left(saveOrErr.value);
		}

		const events = intakeOutput.clearUncommitedEvents()
			.map((
				evt: Event<
					| PatientIntakeRecordedPayload
					| PatientOutputRecordedPayload
				>,
			) => decorate(evt, withHeader("Principal", ctx.principal)));
		await this.#eventBus.publishAll(...events);

		return right(undefined);
	}

	async recordOutput(
		ctx: Context,
		request: RecordOutputRequest,
	): Promise<Either<ValidationError[] | ForbiddenError | IOError | NotFoundError, void>> {
		if (
			!ctx.roles.includes(UserRoleEnum.MED_VET as string) &&
			!ctx.roles.includes(UserRoleEnum.VET_ASSISTANT as string)
		) {
			return left(new ForbiddenError(RECORD_OUTPUT_CAUSE));
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

		// Create elimination value object
		const eliminationOrErr = Elimination.create(
			dateTimeOrErr.right,
			request.type,
			request.aspect,
		);

		if (eliminationOrErr.isLeft()) {
			return left([eliminationOrErr.value]);
		}

		// Find or create intake output for this hospitalization
		let intakeOutput: IntakeOutput;
		const existingIntakeOutputOrErr = await this.#intakeOutputRepository.findByHospitalizationId(
			hospitalizationIdOrErr.right,
		);

		if (existingIntakeOutputOrErr.isLeft()) {
			// Create new intake output
			const newIntakeOutputOrErr = new IntakeOutput.Builder()
				.withId(IdValue.random())
				.withHospitalizationId(hospitalizationIdOrErr.right)
				.build();

			if (newIntakeOutputOrErr.isLeft()) {
				return left([newIntakeOutputOrErr.value]);
			}

			intakeOutput = newIntakeOutputOrErr.right;
		} else {
			intakeOutput = existingIntakeOutputOrErr.right;
		}

		// Add elimination to intake output
		const addResult = intakeOutput.addElimination(eliminationOrErr.right);
		if (addResult.isLeft()) {
			return left([addResult.value]);
		}

		// Save intake output
		const saveOrErr = await this.#tryIO(
			() => {
				if (existingIntakeOutputOrErr.isLeft()) {
					return this.#intakeOutputRepository.save(intakeOutput);
				} else {
					return this.#intakeOutputRepository.update(intakeOutput);
				}
			},
			RECORD_OUTPUT_CAUSE,
			"Erro ao gravar o registro de saída no repositório",
		);

		if (saveOrErr.isLeft()) {
			return left(saveOrErr.value);
		}

		const events = intakeOutput.clearUncommitedEvents()
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

export interface RecordIntakeRequest {
	hospitalizationId: string;
	dateTime: string;
	type: FeedingTypeEnum;
	notes: string;
	feedingCategory?: FeedingCategoryEnum;
	appetiteScore?: number;
}

export interface RecordOutputRequest {
	hospitalizationId: string;
	dateTime: string;
	type: EliminationTypeEnum;
	aspect: string;
}
