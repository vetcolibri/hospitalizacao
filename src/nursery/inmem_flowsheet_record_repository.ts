import { IdValue } from "@shared/id_value.ts";
import { FlowSheetRecord } from "./flowsheet_record.ts";
import { FlowSheetRecordRepository } from "./flowsheet_record_repository.ts";
import { Either, left, right } from "@shared/either.ts";
import { FlowSheetRecordNotFoundError } from "./flowsheet_record_not_found_error.ts";

const FIND_BY_ID_CAUSE = "InmemFlowSheetRecordRepository:findById";
const FIND_BY_HOSPITALIZATION_ID_CAUSE = "InmemFlowSheetRecordRepository:findByHospitalizationId";
const REMOVE_CAUSE = "InmemFlowSheetRecordRepository:remove";

export class InmemFlowSheetRecordRepository implements FlowSheetRecordRepository {
	#flowSheetRecords: Map<string, FlowSheetRecord>;

	constructor() {
		this.#flowSheetRecords = new Map();
	}

	exists(id: IdValue): Promise<boolean> {
		return Promise.resolve(this.#flowSheetRecords.has(id.value));
	}

	findById(id: IdValue): Promise<Either<FlowSheetRecordNotFoundError, FlowSheetRecord>> {
		const flowSheetRecord = this.#flowSheetRecords.get(id.value);

		if (!flowSheetRecord) {
			return Promise.resolve(left(new FlowSheetRecordNotFoundError(FIND_BY_ID_CAUSE, id)));
		}

		return Promise.resolve(right(flowSheetRecord));
	}

	findByHospitalizationId(
		hospitalizationId: IdValue,
	): Promise<Either<FlowSheetRecordNotFoundError, FlowSheetRecord>> {
		const flowSheetRecord = Array.from(this.#flowSheetRecords.values())
			.find((fsr) => fsr.hospitalizationId.value === hospitalizationId.value);

		if (!flowSheetRecord) {
			return Promise.resolve(
				left(new FlowSheetRecordNotFoundError(FIND_BY_HOSPITALIZATION_ID_CAUSE, hospitalizationId)),
			);
		}

		return Promise.resolve(right(flowSheetRecord));
	}

	save(flowSheetRecord: FlowSheetRecord): Promise<void> {
		this.#flowSheetRecords.set(flowSheetRecord.id.value, flowSheetRecord);
		return Promise.resolve();
	}

	update(flowSheetRecord: FlowSheetRecord): Promise<void> {
		this.#flowSheetRecords.set(flowSheetRecord.id.value, flowSheetRecord);
		return Promise.resolve();
	}

	remove(flowSheetRecord: FlowSheetRecord): Promise<Either<FlowSheetRecordNotFoundError, void>> {
		if (!this.#flowSheetRecords.has(flowSheetRecord.id.value)) {
			return Promise.resolve(
				left(new FlowSheetRecordNotFoundError(REMOVE_CAUSE, flowSheetRecord.id)),
			);
		}

		this.#flowSheetRecords.delete(flowSheetRecord.id.value);
		return Promise.resolve(right(undefined));
	}
}
