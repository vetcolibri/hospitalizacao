import { Either } from "@shared/either.ts";
import { IdValue } from "@shared/id_value.ts";
import { IntakeOutput } from "./intake_output.ts";
import { IntakeOutputNotFoundError } from "./intake_output_not_found_error.ts";

export interface IntakeOutputRepository {
	exists(id: IdValue): Promise<boolean>;
	findById(id: IdValue): Promise<Either<IntakeOutputNotFoundError, IntakeOutput>>;
	findByHospitalizationId(
		hospitalizationId: IdValue,
	): Promise<Either<IntakeOutputNotFoundError, IntakeOutput>>;
	save(intakeOutput: IntakeOutput): Promise<void>;
	update(intakeOutput: IntakeOutput): Promise<void>;
	remove(intakeOutput: IntakeOutput): Promise<Either<IntakeOutputNotFoundError, void>>;
}
