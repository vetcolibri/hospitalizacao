import { MeasurementService } from "domain/hospitalization/parameters/measurement_service.ts";
import { Parameter, ParameterName } from "domain/hospitalization/parameters/parameter.ts";
import { HeartRate } from "domain/hospitalization/parameters/heart_rate.ts";
import { Trc } from "domain/hospitalization/parameters/trc.ts";

export class MeasurementServiceStub implements MeasurementService {
    readonly #parameters: Record<string, Parameter[]> = {};

    constructor() {
        this.#parameters = {
            "1918BA": [
                new HeartRate(78),
                new HeartRate(98),
                new Trc("Maior que 2'"),
            ],
        };
    }

    findAll(patientId: string): Promise<Parameter[]> {
        return Promise.resolve(this.#parameters[patientId]);
    }

    latest(patientId: string): Promise<Parameter[]> {
        const parameters = this.#parameters[patientId];

        if (!parameters) return Promise.resolve([]);

        const result = [];

        for (const name of Object.values(ParameterName)) {
            const lastMeasurement = parameters.findLast(
                (parameter) => parameter.name === name,
            );
            if (lastMeasurement) {
                result.push(lastMeasurement);
            }
        }

        return Promise.resolve(result);
    }
}
