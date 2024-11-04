import { MeasurementService } from "domain/hospitalization/parameters/measurement_service.ts";
import { Parameter } from "domain/hospitalization/parameters/parameter.ts";

export class InmemMeasurementService implements MeasurementService {
    findAll(_patientId: string): Promise<Parameter[]> {
        return Promise.resolve([]);
    }

    latest(_patientId: string): Promise<Parameter[]> {
        return Promise.resolve([]);
    }
}
