import type { Measurement } from '../models/measurement'
import type { HttpClient } from '../http_client'

export interface MeasurementService {
    newMeasurements(patientId: string, measurements: Measurement[]): Promise<void>
    latestMeasurements(patientId: string): Promise<Measurement[]>
}

export class HttpMeasurementService implements MeasurementService {
    readonly httpClient: HttpClient
    readonly baseUrl: string
    readonly resource: string

    constructor(httpClient: HttpClient, baseUrl: string) {
        this.httpClient = httpClient
        this.baseUrl = baseUrl
        this.resource = 'measurements'
    }

    newMeasurements(patientId: string, measurements: Measurement[]) {
        const date = new Date()
        const requestBody = {
            patientId,
            userId: 'some-user-id',
            date: date.toISOString(),
            measurements
        }
        this.httpClient.post(`${this.baseUrl}/${this.resource}`, requestBody)
        return Promise.resolve(undefined)
    }

    async latestMeasurements(patientId: string) {
        const { data } = await this.httpClient.post(`${this.baseUrl}/${this.resource}/latest`, {
            patientId
        })
        return data
    }
}
