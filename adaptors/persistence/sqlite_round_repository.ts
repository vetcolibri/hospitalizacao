import { RoundRepository } from "../../domain/rounds/round_repository.ts";
import { PARAMETER_NAMES, Parameter } from "../../domain/parameters/parameter.ts";
import { Round } from "../../domain/rounds/round.ts";
import { ID } from "../../domain/id.ts";
import { DB, RowObject } from "../../deps.ts";
import { HeartRate } from "../../domain/parameters/heart_rate.ts";
import { RespiratoryRate } from "../../domain/parameters/respiratore_rate.ts";
import { Trc } from "../../domain/parameters/trc.ts";
import { Mucosas } from "../../domain/parameters/mucosas.ts";
import { Avdn } from "../../domain/parameters/avdn.ts";
import { Temperature } from "../../domain/parameters/temperature.ts";
import { BloodGlucose } from "../../domain/parameters/blood_glucose.ts";
import { Hct } from "../../domain/parameters/hct.ts";
import { BloodPressure } from "../../domain/parameters/blood_pressure.ts";

export class SQLiteRoundRepository implements RoundRepository {
    readonly #db: DB;

    constructor(db: DB) {
        this.#db = db;
    }

	save(round: Round): Promise<void> {        
        const sql = `INSERT INTO rounds (
            patient_id,
            round_id
        ) VALUES (
            '${round.patient.patientId.getValue()}',
            '${round.roundId.getValue()}'
        )`;

        this.#db.query(sql);

        round.parameters.forEach((parameter: Parameter) => {
            const sql = `INSERT INTO measurements (
                round_id,
                name,
                value,
                issued_at
            ) VALUES (
                '${round.roundId.getValue()}',
                '${parameter.name}',
                '${parameter.measurement.value}',
                '${parameter.issuedAt.toISOString()}'
            )`;

            this.#db.query(sql);
        });

        return Promise.resolve(undefined)
	}
	
    last(): Promise<Round> {
		throw new Error("Method not implemented.");
	}

	latestMeasurements(patientId: ID): Promise<Parameter[]> {
        
        const sql = `
            SELECT measurements.name as name, value, issued_at FROM measurements
            JOIN rounds ON rounds.round_id = measurements.round_id
            JOIN patients ON patients.patient_id = rounds.patient_id 
            WHERE patients.patient_id = '${patientId.getValue()}'
        `
        const rows = this.#db.queryEntries(sql);

        const paramters: Parameter[] = [];

        for (const name of Object.values(PARAMETER_NAMES)) {
            const row = rows.findLast((row) => row.name === name);
            const parameter = composeParameter(row ?? {})
            if (parameter) {
                paramters.push(parameter)
            }
        }

        
        return Promise.resolve(paramters)
	}


	measurements(patientId: ID): Promise<Parameter[]> {
        const sql = `
            SELECT measurements.name as name, value, issued_at FROM measurements
            JOIN rounds ON rounds.round_id = measurements.round_id
            JOIN patients ON patients.patient_id = rounds.patient_id 
            WHERE patients.patient_id = '${patientId.getValue()}'
        `;

        const rows = this.#db.queryEntries(sql);
    
        const paramters: Parameter[] = [];

        rows.forEach((row) => {
            const parameter = composeParameter(row)
            paramters.push(parameter!)
        })

        return Promise.resolve(paramters)
	}
}

function composeParameter(row: RowObject) {
    const measurementData = {
        name: String(row.name),
        value: row.value,
        issuedAt: String(row.issued_at)
    }
    
    if (measurementData.name === PARAMETER_NAMES.HEART_RATE) {
        const heartRate = HeartRate.compose(Number(measurementData.value), measurementData.issuedAt)
        return heartRate
    }

    if (measurementData.name === PARAMETER_NAMES.RESPIRATORY_RATE) {
        const respiratoryRate = RespiratoryRate.compose(Number(measurementData.value), measurementData.issuedAt)
        return respiratoryRate
    }

    if (measurementData.name === PARAMETER_NAMES.TRC) {
        const trc = Trc.compose(Number(measurementData.value), measurementData.issuedAt)
        return trc
    }

    if (measurementData.name === PARAMETER_NAMES.AVDN) {
        const avdn = Avdn.compose(String(measurementData.value), measurementData.issuedAt)
        return avdn
    }

    if (measurementData.name === PARAMETER_NAMES.MUCOSAS) {
        const mucosas = Mucosas.compose(String(measurementData.value), measurementData.issuedAt)
        return mucosas
    }

    if (measurementData.name === PARAMETER_NAMES.TEMPERATURE) {
        const temperature = Temperature.compose(Number(measurementData.value), measurementData.issuedAt)
        return temperature
    }

    if (measurementData.name === PARAMETER_NAMES.BLOOD_GLUCOSE) {
        const bloodGlucose = BloodGlucose.compose(Number(measurementData.value), measurementData.issuedAt)
        return bloodGlucose
    }

    if (measurementData.name === PARAMETER_NAMES.HCT) {
        const hct = Hct.compose(Number(measurementData.value), measurementData.issuedAt)
        return hct
    }

    if (measurementData.name === PARAMETER_NAMES.BLOOD_PRESSURE) {
        const bloodPressure = BloodPressure.compose(String(measurementData.value), measurementData.issuedAt)
        return bloodPressure
    }

}