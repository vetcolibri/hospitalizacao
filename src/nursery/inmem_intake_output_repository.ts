import { IdValue } from "@shared/id_value.ts";
import { IntakeOutput } from "./intake_output.ts";
import { IntakeOutputRepository } from "./intake_output_repository.ts";
import { Either, left, right } from "@shared/either.ts";
import { IntakeOutputNotFoundError } from "./intake_output_not_found_error.ts";

const FIND_BY_ID_CAUSE = "InmemIntakeOutputRepository:findById";
const FIND_BY_HOSPITALIZATION_ID_CAUSE = "InmemIntakeOutputRepository:findByHospitalizationId";
const REMOVE_CAUSE = "InmemIntakeOutputRepository:remove";

export class InmemIntakeOutputRepository implements IntakeOutputRepository {
	#intakeOutputs: Map<string, IntakeOutput>;

	constructor() {
		this.#intakeOutputs = new Map();
	}

	exists(id: IdValue): Promise<boolean> {
		return Promise.resolve(this.#intakeOutputs.has(id.value));
	}

	findById(id: IdValue): Promise<Either<IntakeOutputNotFoundError, IntakeOutput>> {
		const intakeOutput = this.#intakeOutputs.get(id.value);

		if (!intakeOutput) {
			return Promise.resolve(left(new IntakeOutputNotFoundError(FIND_BY_ID_CAUSE, id)));
		}

		return Promise.resolve(right(intakeOutput));
	}

	findByHospitalizationId(
		hospitalizationId: IdValue,
	): Promise<Either<IntakeOutputNotFoundError, IntakeOutput>> {
		const intakeOutput = Array.from(this.#intakeOutputs.values())
			.find((io) => io.hospitalizationId.value === hospitalizationId.value);

		if (!intakeOutput) {
			return Promise.resolve(
				left(new IntakeOutputNotFoundError(FIND_BY_HOSPITALIZATION_ID_CAUSE, hospitalizationId)),
			);
		}

		return Promise.resolve(right(intakeOutput));
	}

	save(intakeOutput: IntakeOutput): Promise<void> {
		this.#intakeOutputs.set(intakeOutput.id.value, intakeOutput);
		return Promise.resolve();
	}

	update(intakeOutput: IntakeOutput): Promise<void> {
		this.#intakeOutputs.set(intakeOutput.id.value, intakeOutput);
		return Promise.resolve();
	}

	remove(intakeOutput: IntakeOutput): Promise<Either<IntakeOutputNotFoundError, void>> {
		if (!this.#intakeOutputs.has(intakeOutput.id.value)) {
			return Promise.resolve(
				left(new IntakeOutputNotFoundError(REMOVE_CAUSE, intakeOutput.id)),
			);
		}

		this.#intakeOutputs.delete(intakeOutput.id.value);
		return Promise.resolve(right(undefined));
	}
}
