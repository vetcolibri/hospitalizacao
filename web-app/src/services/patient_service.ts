import type { HttpClient } from '@/lib/http_client'
import type { Patient } from '@/lib/models/patient'

export interface PatientService {
    getAllHospitalized(): Promise<Patient[]>
}

export class HttpPatientService implements PatientService {
    readonly HttpClient: HttpClient
    readonly baseUrl: string
    readonly resource: string

    constructor(httpClient: HttpClient, baseUrl: string) {
        this.HttpClient = httpClient
        this.baseUrl = baseUrl
        this.resource = 'patients'
    }

    async getAllHospitalized(): Promise<Patient[]> {
        const patients = await this.HttpClient.get(`${this.baseUrl}/${this.resource}/hospitalized`)
        return patients
    }
}
