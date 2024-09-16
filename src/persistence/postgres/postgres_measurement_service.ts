import { Client } from "deps";
import { MeasurementService } from "domain/hospitalization/parameters/measurement_service.ts";
import { Parameter, ParameterName } from "domain/hospitalization/parameters/parameter.ts";
import { ParameterBuilder, ParameterModel } from "./parameters_builder.ts";

export class PostgresMeasurementService implements MeasurementService {
    constructor(private client: Client) {}

    async findAll(patientId: string): Promise<Parameter[]> {
        const query = `
                SELECT measurements.name as name, value, issued_at FROM measurements
                JOIN rounds ON rounds.round_id = measurements.round_id
                JOIN patients ON patients.system_id = rounds.system_id
                WHERE patients.system_id = $patientId
        `;

        const result = await this.client.queryObject<ParameterModel>(query, {
            patientId: patientId,
        });

        let parameters: Parameter[] = [];

        const builder = new ParameterBuilder();

        result.rows.forEach((row) => {
            const parametersBuilder = builder
                .withHeartRate(row)
                .withRespiratoryRate(row)
                .withTrc(row)
                .withMucosas(row)
                .withAvdn(row)
                .withTemperature(row)
                .withBloodGlucose(row)
                .withHct(row)
                .withBloodPressure(row)
                .build();

            parameters = parametersBuilder;
        });

        return parameters.reverse();
    }

    async latest(patientId: string): Promise<Parameter[]> {
        const sql = `
                SELECT measurements.name as name, value, issued_at FROM measurements
                JOIN rounds ON rounds.round_id = measurements.round_id
                JOIN patients ON patients.system_id = rounds.system_id
                WHERE patients.system_id = $patientId
            `;
        const result = await this.client.queryObject<ParameterModel>(sql, {
            patientId: patientId,
        });

        let parameters: Parameter[] = [];
        const builder = new ParameterBuilder();
        for (const name of Object.values(ParameterName)) {
            const row = result.rows.findLast((row) => row.name === name);
            const parametersBuilder = builder
                .withHeartRate(row)
                .withRespiratoryRate(row)
                .withTrc(row)
                .withMucosas(row)
                .withAvdn(row)
                .withTemperature(row)
                .withBloodGlucose(row)
                .withHct(row)
                .withBloodPressure(row)
                .build();
            parameters = parametersBuilder;
        }
        return Promise.resolve(parameters);
    }
}
