import { Parameter } from "domain/hospitalization/parameters/parameter.ts";

export interface MeasurementService {
    findAll(patientId: string): Promise<Parameter[]>;
    latest(patientId: string): Promise<Parameter[]>;
}
