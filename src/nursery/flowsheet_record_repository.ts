import { Either } from "@shared/either.ts";
import { IdValue } from "@shared/id_value.ts";
import { FlowSheetRecord } from "./flowsheet_record.ts";
import { FlowSheetRecordNotFoundError } from "./flowsheet_record_not_found_error.ts";

export interface FlowSheetRecordRepository {
	exists(id: IdValue): Promise<boolean>;
	findById(id: IdValue): Promise<Either<FlowSheetRecordNotFoundError, FlowSheetRecord>>;
	findByHospitalizationId(
		hospitalizationId: IdValue,
	): Promise<Either<FlowSheetRecordNotFoundError, FlowSheetRecord>>;
	save(flowSheetRecord: FlowSheetRecord): Promise<void>;
	update(flowSheetRecord: FlowSheetRecord): Promise<void>;
	remove(flowSheetRecord: FlowSheetRecord): Promise<Either<FlowSheetRecordNotFoundError, void>>;
}
